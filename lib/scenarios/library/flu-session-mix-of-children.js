import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  PatientStatus,
  RegistrationStatus,
  ReplyDecision,
  ScreenStatus,
  SessionPresetName,
  VaccinationMethod,
  VaccinationOutcome,
  VaccinationSite,
  VaccinationSource
} from '../../../app/enums.js'
import { Programme, Vaccination } from '../../../app/models.js'
import {
  getCurrentAcademicYear,
  removeDays,
  setMidday,
  today
} from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'
import {
  createConsentReply,
  createPatientInSession,
  createSchoolSession,
  spreadByShare
} from '../helpers.js'

// How many children are in the session
const childCount = 300

// Share (%) of children with each flu programme status
const statusShares = [
  { status: PatientStatus.Due, share: 70 },
  { status: PatientStatus.Triage, share: 6 },
  { status: PatientStatus.Vaccinated, share: 4 },
  { status: PatientStatus.Consent, share: 12 },
  { status: PatientStatus.Refused, share: 5 },
  { status: PatientStatus.Deferred, share: 3 }
]

// Share (%) of children whose parent gave consent making each choice of vaccine
const vaccineChoiceShares = [
  {
    name: 'Nasal preferred',
    share: 70,
    overrides: {
      decision: ReplyDecision.Given,
      hasConsentForAlternativeVaccine: true
    }
  },
  {
    name: 'Nasal only',
    share: 20,
    overrides: {
      decision: ReplyDecision.Given,
      hasConsentForAlternativeVaccine: false
    }
  },
  {
    name: 'Injection only',
    share: 10,
    overrides: { decision: ReplyDecision.OnlyAlternativeInjection }
  }
]

// Share (%) of children whose parent refused with each kind of refusal
const refusalShares = [
  { decision: ReplyDecision.Refused, share: 60 },
  { decision: ReplyDecision.Declined, share: 40 }
]

// Share (%) of children who can’t be vaccinated for each reason. The first
// three were decided by a nurse when triaging answers to health questions. The
// others happened in the session today, once the child had been registered
const deferralShares = [
  {
    share: 25,
    triage: {
      status: ScreenStatus.DelayVaccination,
      note: 'Spoke to parent. Child is recovering from an illness, so delay vaccination until a later session.'
    }
  },
  {
    share: 15,
    triage: {
      status: ScreenStatus.DoNotVaccinate,
      note: 'Spoke to parent and checked with child’s GP. It is not safe to vaccinate this child.'
    }
  },
  {
    share: 10,
    triage: {
      status: ScreenStatus.InvitedToClinic,
      note: 'Spoke to parent. They would prefer to bring their child to a clinic instead.'
    }
  },
  { share: 25, outcome: VaccinationOutcome.Absent },
  { share: 15, outcome: VaccinationOutcome.Unwell },
  { share: 10, outcome: VaccinationOutcome.Refused }
]

/**
 * Plan each child: their status, year group and (where needed) the response
 * from their parent. Statuses are shuffled, and year groups are dealt out in
 * turn, so every year group has the same number of children
 *
 * @param {Array<number>} yearGroups - Year groups in the session
 * @returns {Array<object>} Plan for each child
 */
function planChildren(yearGroups) {
  const plans = spreadByShare(statusShares, childCount).map(
    ({ status }, index) => ({
      status,
      yearGroup: yearGroups[index % yearGroups.length]
    })
  )

  const deferred = plans.filter(
    ({ status }) => status === PatientStatus.Deferred
  )
  spreadByShare(deferralShares, deferred.length).forEach((deferral, index) => {
    deferred[index].deferral = deferral
  })

  // Children who can’t be vaccinated still gave consent, and need triage if a
  // nurse made the decision after looking at their answers to health questions
  const consentGiven = plans.filter(({ status }) =>
    [PatientStatus.Due, PatientStatus.Triage, PatientStatus.Deferred].includes(
      status
    )
  )
  spreadByShare(vaccineChoiceShares, consentGiven.length).forEach(
    ({ overrides }, index) => {
      const { status, deferral } = consentGiven[index]

      consentGiven[index].overrides = {
        ...overrides,
        needsTriage:
          status === PatientStatus.Triage || Boolean(deferral?.triage)
      }
    }
  )

  const refused = plans.filter(({ status }) => status === PatientStatus.Refused)
  spreadByShare(refusalShares, refused.length).forEach(
    ({ decision }, index) => {
      refused[index].overrides = { decision }
    }
  )

  return plans
}

/**
 * Record that a child had their flu vaccination earlier this season somewhere
 * else, such as at their GP surgery
 *
 * @param {object} context - Context
 * @param {Patient} patient - Child
 * @param {Programme} programme - Flu programme
 */
function recordVaccinationElsewhere(context, patient, programme) {
  const vaccine = programme.standardVaccine
  const seasonStartsAt = new Date(getCurrentAcademicYear(), 8, 1)
  const yesterday = removeDays(today(), 1)

  Vaccination.create(
    {
      administeredAt: faker.date.between({
        from: seasonStartsAt < yesterday ? seasonStartsAt : yesterday,
        to: yesterday
      }),
      patient_uuid: patient.uuid,
      programme_id: programme.id,
      outcome: VaccinationOutcome.Vaccinated,
      source: VaccinationSource.NhsImmunisationsApi,
      vaccine_snomed: vaccine.snomed,
      dose: vaccine.dose,
      sequence: programme.sequenceDefault,
      injectionMethod: VaccinationMethod.Intranasal,
      injectionSite: VaccinationSite.Nose
    },
    context
  )
}

/**
 * Record a nurse’s triage decision, made after the parent responded
 *
 * @param {PatientSession} patientSession - Patient session
 * @param {User} nurse - Nurse who triaged
 * @param {Consent} reply - Parent’s consent response
 * @param {object} decision - Triage decision
 * @param {ScreenStatus} decision.status - Outcome of triage
 * @param {string} decision.note - Triage note
 */
function recordTriageDecision(patientSession, nurse, reply, { status, note }) {
  patientSession.patientProgramme.recordTriage({
    status,
    note,
    createdAt: faker.date.between({ from: reply.createdAt, to: today() }),
    createdBy_uid: nurse.uid
  })
}

/**
 * Record that a child couldn’t be vaccinated in the session today, as the app
 * does: the child is registered (as absent, or as attending), then the outcome
 * is recorded. The app only shows these children as unable to be vaccinated on
 * the day this happens
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {Patient} options.patient - Child
 * @param {PatientSession} options.patientSession - Patient session
 * @param {User} options.nurse - Nurse running the session
 * @param {VaccinationOutcome} options.outcome - Why child couldn’t be vaccinated
 */
function recordOutcomeInSession(
  context,
  { patient, patientSession, nurse, outcome }
) {
  const { session } = patientSession

  patientSession.registerAttendance(
    { createdBy_uid: nurse.uid },
    outcome === VaccinationOutcome.Absent
      ? RegistrationStatus.Absent
      : RegistrationStatus.Present
  )

  const vaccination = Vaccination.create(
    {
      outcome,
      patient_uuid: patient.uuid,
      programme_id: patientSession.programme_id,
      session_id: session.id,
      school_id: session.school_id,
      locationType: session.locationType,
      locationName: session.location.name,
      vaccine_snomed: patientSession.patientProgramme.vaccine.snomed,
      createdAt: today(),
      createdBy_uid: nurse.uid,
      administeredAt: today(),
      administeredBy_uid: nurse.uid
    },
    context
  )
  patient.recordVaccination(Vaccination.findOne(vaccination.uuid, context))
}

export default defineScenario({
  name: 'Flu session today with a mix of children',
  description:
    `A flu session happening today, with ${childCount} children spread evenly across the ` +
    'year groups. Most are due vaccination. The rest need consent, need triage, have a ' +
    'refusal, can’t be vaccinated (for example they were absent today, or a nurse decided to ' +
    'delay) or were vaccinated elsewhere. Parents who gave consent mostly chose the nasal ' +
    'spray, but some chose nasal spray only, or the injection only.',
  run(context, shared) {
    const { fluPrimarySchool: school, nurse } = shared

    const session = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.Flu,
      date: setMidday(today())
    })
    const programme_id = session.programme_ids[0]
    const programme = Programme.findOne(programme_id, context)

    for (const { status, yearGroup, overrides, deferral } of planChildren(
      session.yearGroups
    )) {
      // Children who are immunocompromised need two flu doses, so one dose
      // would not make them fully vaccinated
      const { patient, patientSession, parent } = createPatientInSession(
        context,
        {
          school,
          session,
          programme_id,
          yearGroup,
          isImmunocompromised:
            status === PatientStatus.Vaccinated ? false : undefined
        }
      )

      switch (status) {
        case PatientStatus.Due:
        case PatientStatus.Triage:
        case PatientStatus.Refused:
          createConsentReply(context, {
            patient,
            patientSession,
            parent,
            overrides
          })
          break
        case PatientStatus.Deferred: {
          const reply = createConsentReply(context, {
            patient,
            patientSession,
            parent,
            overrides
          })

          if (deferral.triage) {
            recordTriageDecision(patientSession, nurse, reply, deferral.triage)
          } else {
            recordOutcomeInSession(context, {
              patient,
              patientSession,
              nurse,
              outcome: deferral.outcome
            })
          }
          break
        }
        case PatientStatus.Vaccinated:
          recordVaccinationElsewhere(context, patient, programme)
          break
        // Children who need consent have been asked, but haven’t responded
      }
    }

    return {
      startUrl: session.uri,
      links: [{ label: 'Children in session', href: `${session.uri}/patients` }]
    }
  }
})

/**
 * @import { Consent, Patient, PatientSession, User } from '../../../app/models.js'
 */
