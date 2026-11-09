import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  ClinicType,
  ReplyDecision,
  ScreenStatus,
  SessionPresetName,
  SessionPresets
} from '../../../app/enums.js'
import { generateSession } from '../../../app/generators/session.js'
import { PatientSession, Session } from '../../../app/models.js'
import {
  addDays,
  getAllAcademicYears,
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

// How many flu seasons back this scenario goes, before this season
const earlierSeasonCount = 2

/**
 * Move a date back to the Friday before, if it’s at a weekend
 *
 * @param {Date} date - Date
 * @returns {Date} Weekday
 */
function moveToWeekday(date) {
  while ([0, 6].includes(date.getDay())) {
    date = removeDays(date, 1)
  }

  return date
}

/**
 * Get a date in an earlier flu season
 *
 * @param {number} academicYear - Academic year the season starts in
 * @param {string} monthAndDay - Month and day, such as '09-20'
 * @returns {Date} Date
 */
function getDateInSeason(academicYear, monthAndDay) {
  return setMidday(new Date(`${academicYear}-${monthAndDay}T00:00:00`))
}

/**
 * Pick a date for a session in this flu season, which ends on 31 March. Aim
 * for some days from today, so it’s still to come
 *
 * @param {number} daysAhead - How many days from today to aim for
 * @returns {Date} Session date
 */
function pickSessionDateInThisSeason(daysAhead) {
  const seasonEndsAt = setMidday(
    new Date(`${getCurrentAcademicYear() + 1}-03-31T00:00:00`)
  )

  let date = setMidday(addDays(today(), daysAhead))
  if (date > seasonEndsAt) {
    date = seasonEndsAt
  }

  return moveToWeekday(date)
}

/**
 * Create a school flu session in an earlier season. The children in this
 * scenario were in it, and their parents may have responded to it, but they
 * weren’t vaccinated
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {School} options.school - School
 * @param {User} options.nurse - Nurse who set the session up
 * @param {number} options.academicYear - Academic year of the season
 * @returns {Session} Session
 */
function createEarlierSchoolSession(context, { school, nurse, academicYear }) {
  const preset = SessionPresets.find(
    ({ name }) => name === SessionPresetName.Flu
  )

  const session = generateSession(preset, nurse, { school_id: school.id })
  session.date = moveToWeekday(getDateInSeason(academicYear, '10-15'))
  session.academicYear = academicYear
  session.consentOpenAt = getDateInSeason(academicYear, '09-01')

  // Session IDs are random, so make sure not to replace an existing session
  while (Session.findOne(session.id, context)) {
    session.id = faker.helpers.replaceSymbols('###')
  }

  return Session.create(session, context)
}

/**
 * Add a child to an earlier season’s school session, and ask their parents
 * for consent
 *
 * @param {object} context - Context
 * @param {Patient} patient - Child
 * @param {Session} session - Earlier season’s session
 * @returns {PatientSession} Patient session
 */
function addToEarlierSession(context, patient, session) {
  const patientSession = new PatientSession(
    {
      createdAt: session.consentOpenAt,
      patient_uuid: patient.uuid,
      programme_id: session.programme_ids[0],
      session_id: session.id
    },
    context
  )
  PatientSession.create(patientSession, context)
  patient.addToSession(patientSession)
  patient.requestConsent(patientSession)

  return patientSession
}

// Vaccine choices a parent can make online or when booking a flu appointment
const nasalSprayOnly = {
  decision: ReplyDecision.Given,
  hasConsentForAlternativeVaccine: false,
  summary: 'consent given, nasal spray only'
}
const nasalSprayPreferred = {
  decision: ReplyDecision.Given,
  hasConsentForAlternativeVaccine: true,
  summary: 'consent given, nasal spray preferred'
}
const injectionOnly = {
  decision: ReplyDecision.OnlyAlternativeInjection,
  summary: 'consent given, injection only'
}
const refused = { decision: ReplyDecision.Refused, summary: 'consent refused' }

/**
 * Get a short name for a flu season, such as ‘2024–25’
 *
 * @param {number} academicYear - Academic year the season starts in
 * @returns {string} Season name
 */
function getSeasonName(academicYear) {
  return `${academicYear}–${String(academicYear + 1).slice(-2)}`
}

/**
 * Turn a vaccine choice into the choices made when booking an appointment
 *
 * @param {object} choice - Vaccine choice
 * @param {ReplyDecision} choice.decision - Decision
 * @param {boolean} [choice.hasConsentForAlternativeVaccine] - Also accepts the injection
 * @returns {ClinicVaccinationChoices} Vaccination choices for the appointment
 */
function getBookingChoices({ decision, hasConsentForAlternativeVaccine }) {
  return {
    selected_programme_ids: ['flu'],
    fluDecision: decision,
    fluAlternative:
      decision === ReplyDecision.Given ? hasConsentForAlternativeVaccine : false
  }
}

export default defineScenario({
  name: 'Flu consent over several seasons',
  description:
    'Each child shows a different history of consent responses and clinic bookings ' +
    `across the last ${earlierSeasonCount} seasons, to see how responses from ` +
    'earlier seasons appear now that they’ve expired.',
  run(context, shared) {
    const { fluPrimarySchool: school, nurse } = shared

    // Only go back as far as the academic years the prototype knows about
    const thisSeason = getCurrentAcademicYear()
    const seasons = getAllAcademicYears().filter(
      (academicYear) =>
        academicYear >= thisSeason - earlierSeasonCount &&
        academicYear <= thisSeason
    )
    const earliestSeason = seasons[0]

    const session = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.Flu,
      date: pickSessionDateInThisSeason(10)
    })
    const clinicSession = createClinicSession(context, {
      clinic_id: 'M86045', // Paradise Medical Centre
      nurse,
      presetName: SessionPresetName.Flu,
      clinicType: ClinicType.Open,
      date: pickSessionDateInThisSeason(14)
    })

    // A school session and a clinic in each earlier season
    const earlierSessions = {}
    for (const academicYear of seasons.filter((year) => year < thisSeason)) {
      earlierSessions[academicYear] = {
        schoolSession: createEarlierSchoolSession(context, {
          school,
          nurse,
          academicYear
        }),
        clinicSession: createClinicSession(context, {
          clinic_id: 'M86045', // Paradise Medical Centre
          nurse,
          presetName: SessionPresetName.Flu,
          clinicType: ClinicType.Open,
          date: moveToWeekday(getDateInSeason(academicYear, '11-20'))
        })
      }
    }

    /**
     * Get the date of a response or triage. In earlier seasons, it’s on a
     * given day. This season, it’s a few days after consent opened for the
     * school session, so it’s after the consent request
     *
     * @param {number} seasonsAgo - 0 for this season, 1 for last season, and so on
     * @param {string} monthAndDay - Month and day in earlier seasons, such as '09-20'
     * @param {number} daysAfterConsentOpens - Days after consent opened this season
     * @returns {Date} Date
     */
    const getResponseDate = (seasonsAgo, monthAndDay, daysAfterConsentOpens) =>
      seasonsAgo === 0
        ? addDays(session.consentOpenAt, daysAfterConsentOpens)
        : getDateInSeason(thisSeason - seasonsAgo, monthAndDay)

    // `seasonsAgo` is 0 for this season, 1 for last season, and so on
    const children = [
      // Consent given online every season, triaged last season
      {
        responses: [
          { seasonsAgo: 2, ...nasalSprayOnly },
          { seasonsAgo: 1, ...nasalSprayPreferred, needsTriage: true },
          { seasonsAgo: 0, ...nasalSprayPreferred }
        ],
        triages: [
          {
            seasonsAgo: 1,
            status: ScreenStatus.DoNotVaccinate,
            note: 'Spoke to GP, do not vaccinate this season.'
          }
        ]
      },
      // Consent refused online 2 seasons ago, clinic booked since
      {
        responses: [
          { seasonsAgo: 2, ...refused },
          { seasonsAgo: 1, ...nasalSprayPreferred, isBooking: true },
          { seasonsAgo: 0, ...injectionOnly, isBooking: true }
        ]
      }
    ]

    const links = []
    for (const { responses, triages = [] } of children) {
      // Skip anything from a season the prototype doesn’t know about
      const responsesInKnownSeasons = responses.filter(
        ({ seasonsAgo }) => thisSeason - seasonsAgo >= earliestSeason
      )
      const triagesInKnownSeasons = triages.filter(
        ({ seasonsAgo }) => thisSeason - seasonsAgo >= earliestSeason
      )

      const { patient, patientSessions, parent, otherParent } =
        createPatientInSession(context, {
          school,
          session,
          programme_ids: session.programme_ids,
          yearGroup: 4,
          isImmunocompromised: false,
          hasOtherParent: responsesInKnownSeasons.some(
            ({ isFromOtherParent }) => isFromOtherParent
          )
        })
      const [patientSession] = patientSessions

      // What happened in each session, keyed by session ID, to describe the
      // links to the child in each one
      const summariesBySession = {}
      const addSummary = (sessionForSummary, summary) => {
        summariesBySession[sessionForSummary.id] ??= []
        summariesBySession[sessionForSummary.id].push(summary)
      }

      // The child was in each earlier season’s school session
      const earlierPatientSessions = {}
      for (const [academicYear, { schoolSession }] of Object.entries(
        earlierSessions
      )) {
        earlierPatientSessions[academicYear] = addToEarlierSession(
          context,
          patient,
          schoolSession
        )
      }

      for (const {
        seasonsAgo,
        decision,
        hasConsentForAlternativeVaccine,
        isFromOtherParent,
        isBooking,
        needsTriage = false,
        summary
      } of responsesInKnownSeasons) {
        const academicYear = thisSeason - seasonsAgo
        const respondent = isFromOtherParent ? otherParent : parent

        if (isBooking) {
          const bookedSession =
            seasonsAgo === 0
              ? clinicSession
              : earlierSessions[academicYear].clinicSession
          addSummary(bookedSession, summary)

          createClinicBooking(context, {
            patient,
            session: bookedSession,
            parent: respondent,
            createdAt: getResponseDate(seasonsAgo, '11-01', 5),
            vaccinationChoices: getBookingChoices({
              decision,
              hasConsentForAlternativeVaccine
            }),
            needsTriage
          })
        } else {
          const respondedToPatientSession =
            seasonsAgo === 0
              ? patientSession
              : earlierPatientSessions[academicYear]
          addSummary(respondedToPatientSession.session, summary)

          createConsentReply(context, {
            patient,
            patientSession: respondedToPatientSession,
            parent: respondent,
            overrides: {
              decision,
              hasConsentForAlternativeVaccine,
              needsTriage
            },
            createdAt: getResponseDate(seasonsAgo, '09-20', 2)
          })
        }
      }

      for (const { seasonsAgo, status, note } of triagesInKnownSeasons) {
        const academicYear = thisSeason - seasonsAgo
        const triagedPatientSession =
          seasonsAgo === 0
            ? patientSession
            : earlierPatientSessions[academicYear]
        addSummary(
          triagedPatientSession.session,
          `triaged as ${status.toLowerCase()}`
        )

        triagedPatientSession.patientProgramme.recordTriage({
          status,
          note,
          createdAt: getResponseDate(seasonsAgo, '10-01', 3),
          createdBy_uid: nurse.uid
        })
      }

      // Link to the child in every flu session they were in, oldest first
      const fluPatientSessions = patient.patientSessions
        .filter(({ programme_id }) => programme_id === 'flu')
        .sort((a, b) => a.session.date - b.session.date)
      for (const { session: linkedSession, uri } of fluPatientSessions) {
        const seasonName = getSeasonName(linkedSession.academicYear)
        const sessionType = linkedSession.clinic_id ? 'clinic' : 'school'
        const summaries = summariesBySession[linkedSession.id] ?? [
          'no response'
        ]

        links.push({
          label: `${patient.fullName}: ${seasonName} ${sessionType} session (${summaries.join('; ')})`,
          href: uri
        })
      }
    }

    return {
      startUrl: `${session.uri}/patients`,
      links
    }
  }
})

/**
 * @import { ClinicVaccinationChoices, Patient, School, User } from '../../../app/models.js'
 */
