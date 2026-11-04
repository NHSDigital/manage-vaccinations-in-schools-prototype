import {
  ClinicAppointmentStatus,
  ClinicType,
  ReplyDecision,
  ScreenStatus,
  SessionPresetName
} from '../../../app/enums.js'
import {
  addDays,
  getCurrentAcademicYear,
  removeDays,
  setMidday,
  today
} from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'
import {
  createClinicBooking,
  createClinicSession,
  createConsentReply,
  createPatientInSession,
  createSchoolSession
} from '../helpers.js'

/**
 * Pick a date for the clinic in this academic year’s flu season, which ends
 * on 31 March (matching `PatientProgramme.eligibilityEndAt`). Aim for a
 * week and a half from today, so it’s still to come
 *
 * @returns {Date} Session date
 */
function pickClinicDateInFluSeason() {
  const seasonEndsAt = setMidday(
    new Date(`${getCurrentAcademicYear() + 1}-03-31T00:00:00`)
  )

  let date = setMidday(addDays(today(), 10))
  if (date > seasonEndsAt) {
    date = seasonEndsAt
  }

  // Not at weekends
  while ([0, 6].includes(date.getDay())) {
    date = removeDays(date, 1)
  }

  return date
}

// Vaccine choices a parent can make when booking a flu appointment
const nasalSprayPreferred = {
  selected_programme_ids: ['flu'],
  fluDecision: ReplyDecision.Given,
  fluAlternative: true
}
const injectionOnly = {
  selected_programme_ids: ['flu'],
  fluDecision: ReplyDecision.OnlyAlternativeInjection
}

export default defineScenario({
  name: 'Flu clinic bookings',
  description:
    'An appointment-based flu clinic for a handful of Year 9 children who weren’t vaccinated in ' +
    'their school’s flu session, which has already happened. Each child shows a ' +
    'different case of a parent’s clinic booking counting as a consent response, including ' +
    'bookings with and without health answers, cancelled and abandoned bookings, and bookings ' +
    'that conflict with, or invalidate, other consent responses and triage outcomes.',
  run(context, shared) {
    const { consentExpirySecondarySchool: school, nurse } = shared

    // The school session has already happened, and the clinic is still to come
    let schoolSessionDate = setMidday(removeDays(today(), 30))
    while ([0, 6].includes(schoolSessionDate.getDay())) {
      schoolSessionDate = removeDays(schoolSessionDate, 1)
    }
    const schoolSession = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.Flu,
      date: schoolSessionDate
    })

    const session = createClinicSession(context, {
      clinic_id: 'M86045', // Paradise Medical Centre
      nurse,
      presetName: SessionPresetName.Flu,
      clinicType: ClinicType.Open,
      date: pickClinicDateInFluSeason()
    })

    // Responses to the school session’s consent requests, then triage, then
    // bookings into the clinic
    const respondedAt = removeDays(schoolSessionDate, 7)
    const triagedAt = removeDays(schoolSessionDate, 3)
    const bookedAt = removeDays(today(), 5)

    const children = [
      {
        label:
          'Booking for the injection only, the other parent gave consent online for the nasal spray only',
        bookings: [{ vaccinationChoices: injectionOnly }],
        replies: [
          {
            decision: ReplyDecision.Given,
            hasConsentForAlternativeVaccine: false,
            isFromOtherParent: true
          }
        ]
      },
      {
        label: 'Booking with health answers needing triage',
        bookings: [
          { vaccinationChoices: nasalSprayPreferred, needsTriage: true }
        ]
      },
      {
        label:
          'Booking without health answers (transferred from another system)',
        bookings: [
          { vaccinationChoices: nasalSprayPreferred, hasHealthAnswers: false }
        ]
      },
      {
        label: 'Booking cancelled',
        bookings: [
          {
            vaccinationChoices: nasalSprayPreferred,
            status: ClinicAppointmentStatus.Cancelled
          }
        ]
      },
      {
        label: 'Booking abandoned before it was made',
        bookings: [
          {
            vaccinationChoices: nasalSprayPreferred,
            status: ClinicAppointmentStatus.Abandoned
          }
        ]
      },
      {
        label:
          'Triage invalidated: nasal spray triaged as safe to vaccinate, then the other parent booked for the injection only',
        replies: [
          {
            decision: ReplyDecision.Given,
            hasConsentForAlternativeVaccine: true,
            needsTriage: true
          }
        ],
        triages: [
          {
            status: ScreenStatus.VaccinateIntranasalOnly,
            note: 'Spoke to parent, safe to vaccinate with nasal spray.'
          }
        ],
        bookings: [
          { vaccinationChoices: injectionOnly, isFromOtherParent: true }
        ]
      }
    ]

    const links = []
    for (const {
      label,
      replies = [],
      triages = [],
      bookings = []
    } of children) {
      const { patient, patientSessions, parent, otherParent } =
        createPatientInSession(context, {
          school,
          session: schoolSession,
          programme_ids: schoolSession.programme_ids,
          yearGroup: 9,
          isImmunocompromised: false,
          isUnder16: true,
          hasOtherParent: [...replies, ...bookings].some(
            ({ isFromOtherParent }) => isFromOtherParent
          )
        })
      const [patientSession] = patientSessions

      for (const {
        decision,
        hasConsentForAlternativeVaccine,
        isFromOtherParent,
        needsTriage = false
      } of replies) {
        createConsentReply(context, {
          patient,
          patientSession,
          parent: isFromOtherParent ? otherParent : parent,
          overrides: { decision, hasConsentForAlternativeVaccine, needsTriage },
          createdAt: respondedAt
        })
      }

      for (const { status, note } of triages) {
        patientSession.patientProgramme.recordTriage({
          status,
          note,
          createdAt: triagedAt,
          createdBy_uid: nurse.uid
        })
      }

      for (const {
        vaccinationChoices,
        isFromOtherParent,
        hasHealthAnswers,
        needsTriage,
        status
      } of bookings) {
        createClinicBooking(context, {
          patient,
          session,
          parent: isFromOtherParent ? otherParent : parent,
          createdAt: bookedAt,
          vaccinationChoices,
          hasHealthAnswers,
          needsTriage,
          status
        })
      }

      // Link to the child in the clinic, unless they were never booked into it
      const clinicPatientSession = patient.patientSessions.find(
        ({ session_id }) => session_id === session.id
      )
      links.push({
        label,
        href: (clinicPatientSession ?? patientSession).uri
      })
    }

    return {
      startUrl: `${session.uri}/patients`,
      links
    }
  }
})
