import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  PatientStatus,
  RegistrationStatus,
  ScreenStatus,
  SessionStatus,
  VaccinationMethod,
  VaccinationOutcome,
  VaccinationSite,
  VaccinationSource,
  VaccineMethod
} from '../../app/enums.js'
import { Programme, Vaccination } from '../../app/models.js'
import {
  getCurrentAcademicYear,
  removeDays,
  today
} from '../../app/utils/date.js'

import {
  createConsentReply,
  createPatientInSession,
  spreadByShare
} from './helpers.js'

/**
 * Decisions a nurse can make when triaging a child’s answers to health
 * questions, which mean the child can’t be vaccinated (yet). Scenarios share
 * these out between the children who can’t be vaccinated
 */
export const commonTriageDecisions = {
  delay: {
    status: ScreenStatus.DelayVaccination,
    note: 'Spoke to parent. Child is recovering from an illness, so delay vaccination until a later session.'
  },
  doNotVaccinate: {
    status: ScreenStatus.DoNotVaccinate,
    note: 'Spoke to parent and checked with child’s GP. It is not safe to vaccinate this child.'
  },
  invitedToClinic: {
    status: ScreenStatus.InvitedToClinic,
    note: 'Spoke to parent. They would prefer to bring their child to a clinic instead.'
  }
}

/**
 * Plan each child: their status, year group and (where needed) the response
 * from their parent. Statuses are shuffled, and year groups are dealt out in
 * turn, so every year group has the same number of children
 *
 * @param {object} options - Options (see `populateSession`)
 * @param {Array<number>} yearGroups - Year groups in the session
 * @returns {Array<object>} Plan for each child
 */
function planChildren(options, yearGroups) {
  const {
    childCount,
    statusShares,
    consentChoiceShares,
    refusalShares,
    deferralShares
  } = options

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
  spreadByShare(consentChoiceShares, consentGiven.length).forEach(
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
 * Record that a child had their vaccination earlier this academic year
 * somewhere else, such as at their GP surgery. This assumes the programme only
 * needs one dose
 *
 * @param {object} context - Context
 * @param {Patient} patient - Child
 * @param {Programme} programme - Programme
 */
function recordVaccinationElsewhere(context, patient, programme) {
  const vaccine = programme.standardVaccine
  const isNasalSpray = vaccine.method === VaccineMethod.Intranasal
  const academicYearStartsAt = new Date(getCurrentAcademicYear(), 8, 1)
  const yesterday = removeDays(today(), 1)

  Vaccination.create(
    {
      administeredAt: faker.date.between({
        from:
          academicYearStartsAt < yesterday ? academicYearStartsAt : yesterday,
        to: yesterday
      }),
      patient_uuid: patient.uuid,
      programme_id: programme.id,
      outcome: VaccinationOutcome.Vaccinated,
      source: VaccinationSource.NhsImmunisationsApi,
      vaccine_snomed: vaccine.snomed,
      dose: vaccine.dose,
      sequence: programme.sequenceDefault,
      injectionMethod: isNasalSpray
        ? VaccinationMethod.Intranasal
        : VaccinationMethod.Intramuscular,
      injectionSite: isNasalSpray
        ? VaccinationSite.Nose
        : VaccinationSite.ArmLeftUpper
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
 * @param {object} decision - Triage decision (see `commonTriageDecisions`)
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

/**
 * Fill a school session with new children, spread across programme statuses
 * and year groups, and create everything that backs up each status: consent
 * requests and responses, triage decisions and vaccination records
 *
 * Each `...Shares` option is a list of choices with a `share` (a percentage,
 * or any numbers in proportion). Choices are shared out between the children
 * as exactly as whole numbers allow
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {School} options.school - School the session is at
 * @param {Session} options.session - Session to add children to
 * @param {User} options.nurse - Nurse running the session
 * @param {number} options.childCount - Number of children to add
 * @param {Array<{status: PatientStatus, share: number}>} options.statusShares - Share of children with each programme status
 * @param {Array<{share: number, overrides: object}>} options.consentChoiceShares - Share of children with consent given (including those who can’t be vaccinated) making each choice, as `overrides` for `generateConsent`
 * @param {Array<{share: number, decision: ReplyDecision}>} options.refusalShares - Share of children whose parent refused with each kind of refusal
 * @param {Array<{share: number, triage?: object, outcome?: VaccinationOutcome}>} options.deferralShares - Share of children who can’t be vaccinated for each reason: either a nurse’s triage decision, or an outcome recorded in the session, which only works for a session happening today
 */
export function populateSession(context, options) {
  const { school, session, nurse, deferralShares } = options

  if (
    deferralShares.some(({ outcome }) => outcome) &&
    session.status !== SessionStatus.Active
  ) {
    throw new Error(
      'Outcomes recorded in a session only make children unable to be vaccinated on the day of the session, so use only triage decisions instead'
    )
  }

  const programme_id = session.programme_ids[0]
  const programme = Programme.findOne(programme_id, context)

  const childrenProperties = planChildren(options, session.yearGroups)
  for (const { status, yearGroup, overrides, deferral } of childrenProperties) {
    // Children who are immunocompromised may need more doses. The app would
    // still show a child with one dose as fully vaccinated, but alongside
    // “Due 2nd dose”, so avoid that contradiction for vaccinated children
    const { patient, patientSession, parent } = createPatientInSession(
      context,
      {
        school,
        session,
        programme_id,
        yearGroup,
        isImmunocompromised:
          status === PatientStatus.Vaccinated ? false : undefined,
        // Children aged 16 or over give consent themselves, so a parent can’t
        // be yet to respond, or have refused
        isUnder16: [PatientStatus.Consent, PatientStatus.Refused].includes(
          status
        )
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
}

/**
 * @import { ReplyDecision } from '../../app/enums.js'
 * @import { Consent, Patient, PatientSession, School, Session, User } from '../../app/models.js'
 */
