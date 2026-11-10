import { fakerEN_GB as faker } from '@faker-js/faker'
import {
  differenceInCalendarDays,
  endOfDay,
  isAfter,
  isBefore,
  startOfDay,
  subMonths
} from 'date-fns'

import {
  ClinicAppointmentStatus,
  ClinicType,
  ReplyDecision,
  ScreenStatus,
  SessionConsentContacts,
  SessionPresetName,
  SessionPresets,
  TeamDefaults
} from '../../../app/enums.js'
import { generateConsent } from '../../../app/generators/consent.js'
import { generateSession } from '../../../app/generators/session.js'
import { Consent, PatientSession, Session } from '../../../app/models.js'
import {
  addDays,
  getAcademicYear,
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
  createSchoolSession,
  pickSessionDate
} from '../helpers.js'

// Consent given for routine programmes expires this many months after it was submitted
const givenConsentExpiryMonths = 15

// Groups of children on the scenarios page, by what each child shows
const LinkGroup = {
  Sessions: 'Sessions',
  ConsentExpiry: 'Consent expiry',
  ConsentInvalidation: 'Consent invalidation',
  HealthAnswerExpiry: 'Health answer expiry',
  TriageExpiry: 'Triage expiry',
  SupersededResponses: 'Superseded responses',
  TriageInvalidation: 'Triage invalidation',
  ClinicBookings: 'Consent given in clinic bookings'
}

/**
 * Create an HPV session at the school last year, with consent opening the
 * team’s usual number of weeks before it. The children in this scenario were
 * in it, and their parents responded to its consent requests, but they
 * weren’t vaccinated
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {School} options.school - School
 * @param {User} options.nurse - Nurse who set the session up
 * @param {Date} options.date - Session date
 * @returns {Session} Session
 */
function createLastYearsSchoolSession(context, { school, nurse, date }) {
  const preset = SessionPresets.find(
    ({ name }) => name === SessionPresetName.HPV
  )

  const session = generateSession(preset, nurse, { school_id: school.id })
  session.date = setMidday(date)
  session.academicYear = getAcademicYear(session.date)
  session.consentOpenAt = removeDays(
    session.date,
    TeamDefaults.SessionOpenWeeks * 7
  )
  session.consentContacts = SessionConsentContacts.NonRefusers

  // Session IDs are random, so make sure not to replace an existing session
  while (Session.findOne(session.id, context)) {
    session.id = faker.helpers.replaceSymbols('###')
  }

  return Session.create(session, context)
}

/**
 * Create as few HPV sessions at the school last year as it takes for every
 * backdated response to fall in one of their consent windows. The responses
 * are spread over a few months, so they can expire on the dates each child
 * needs, which is too long for a single consent window
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {School} options.school - School
 * @param {User} options.nurse - Nurse who set the sessions up
 * @param {Array<Date>} options.responseDates - When parents responded
 * @returns {Array<Session>} Sessions, oldest first
 */
function createLastYearsSchoolSessions(
  context,
  { school, nurse, responseDates }
) {
  const sessions = []
  const datesOldestFirst = [...responseDates].sort((a, b) => a - b)

  for (const responseDate of datesOldestFirst) {
    if (findSessionWithConsentOpenOn(sessions, responseDate)) {
      continue
    }

    // Open consent the day before this response, so the request was sent
    // first, and hold the session as late as that allows, so its consent
    // window covers as many later responses as possible
    let date = addDays(responseDate, TeamDefaults.SessionOpenWeeks * 7 - 1)
    while ([0, 6].includes(date.getDay())) {
      date = removeDays(date, 1)
    }

    sessions.push(
      createLastYearsSchoolSession(context, { school, nurse, date })
    )
  }

  return sessions
}

/**
 * Find the session whose consent window was open on a given date
 *
 * @param {Array<Session>} sessions - Sessions
 * @param {Date} date - Date
 * @returns {Session|undefined} Session
 */
function findSessionWithConsentOpenOn(sessions, date) {
  return sessions.find(
    (session) =>
      !isBefore(date, startOfDay(session.consentOpenAt)) &&
      !isAfter(date, endOfDay(session.consentCloseAt))
  )
}

/**
 * Create last academic year’s HPV clinic session, which parents booked their
 * children into. It’s after every booking this scenario backdates
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {User} options.nurse - Nurse who set the session up
 * @returns {Session} Session
 */
function createLastYearsClinicSession(context, { nurse }) {
  let date = subMonths(today(), 14)
  while ([0, 6].includes(date.getDay())) {
    date = removeDays(date, 1)
  }

  return createClinicSession(context, {
    clinic_id: 'M86014', // The Forum Health Centre
    nurse,
    presetName: SessionPresetName.HPV,
    clinicType: ClinicType.Open,
    date: setMidday(date)
  })
}

/**
 * Create this academic year’s HPV clinic session, which parents can book their
 * children into. It’s after every booking this scenario makes this year
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {User} options.nurse - Nurse who set the session up
 * @returns {Session} Session
 */
function createThisYearsClinicSession(context, { nurse }) {
  let date = addDays(today(), 21)
  while ([0, 6].includes(date.getDay())) {
    date = addDays(date, 1)
  }

  return createClinicSession(context, {
    clinic_id: 'M86014', // The Forum Health Centre
    nurse,
    presetName: SessionPresetName.HPV,
    clinicType: ClinicType.Open,
    date: setMidday(date)
  })
}

/**
 * Add a child to one of last year’s sessions, and ask their parents for
 * consent, before they responded
 *
 * @param {object} context - Context
 * @param {Patient} patient - Child
 * @param {Session} session - One of last year’s sessions
 * @returns {PatientSession} Patient session
 */
function addToLastYearsSession(context, patient, session) {
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

/**
 * Create a consent response from a parent, submitted on a given date in last
 * academic year’s session
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {Patient} options.patient - Child
 * @param {PatientSession} options.patientSession - Child in one of last year’s sessions
 * @param {Contact} options.parent - Parent giving the response
 * @param {ReplyDecision} options.decision - Parent’s decision
 * @param {Date} options.createdAt - When the parent responded
 * @param {boolean} [options.isInvalidated] - Whether a nurse marked the response as invalid
 * @param {Date} [options.invalidatedAt] - When a nurse marked the response as invalid, if known
 * @param {boolean} [options.needsTriage] - Whether any health answers need triage
 * @returns {Consent} Consent response
 */
function createPastReply(
  context,
  {
    patient,
    patientSession,
    parent,
    decision,
    createdAt,
    isInvalidated,
    invalidatedAt,
    needsTriage = false
  }
) {
  const generatedConsent = generateConsent(patientSession, parent, createdAt, {
    decision,
    needsTriage
  })
  if (!generatedConsent) {
    throw new Error('Could not generate a consent response')
  }

  const consent = new Consent(
    { ...generatedConsent, isInvalidated, invalidatedAt },
    context
  )
  consent.linkToPatient(patient)

  return Consent.create(consent, context)
}

/**
 * Get the date a parent must have given consent, for it to expire a given
 * number of days from today (or have expired that many days ago, if negative)
 *
 * @param {number} days - Days from today until consent expires
 * @returns {Date} Date consent was given
 */
function givenConsentExpiringIn(days) {
  return subMonths(addDays(today(), days), givenConsentExpiryMonths)
}

export default defineScenario({
  name: 'Expiry of consent, health answers and triage',
  description:
    'An HPV session with a handful of Year 9 children who weren’t vaccinated in last year’s ' +
    'sessions, and whose parents responded to them. Each child shows a different case of consent ' +
    'expiry, including expiring health answers and triage outcomes, and consent given in clinic bookings.',
  run(context, shared) {
    const { consentExpirySecondarySchool: school, nurse } = shared

    const lastYearsClinicSession = createLastYearsClinicSession(context, {
      nurse
    })
    const thisYearsClinicSession = createThisYearsClinicSession(context, {
      nurse
    })
    const session = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.HPV,
      date: pickSessionDate(),
      consentContacts: SessionConsentContacts.NonRefusers
    })
    const daysUntilSession = differenceInCalendarDays(session.date, today())

    const children = [
      {
        group: LinkGroup.ConsentExpiry,
        label: 'Consent given last year, still valid for 2 months',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60)
          }
        ]
      },
      {
        group: LinkGroup.ConsentExpiry,
        label: 'Consent given last year, expires within a month',
        replies: [
          {
            decision: ReplyDecision.Given,
            // After the session if possible, but always within a month
            createdAt: givenConsentExpiringIn(
              Math.min(Math.max(daysUntilSession + 5, 20), 30)
            )
          }
        ]
      },
      // Only possible if the session is at least a couple of days away
      daysUntilSession >= 2 && {
        group: LinkGroup.ConsentExpiry,
        label: 'Consent given last year, expires before the session',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(Math.floor(daysUntilSession / 2))
          }
        ]
      },
      {
        group: LinkGroup.ConsentExpiry,
        label: 'Consent given last year, expired 2 weeks ago',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14)
          }
        ]
      },
      {
        group: LinkGroup.ConsentExpiry,
        label:
          'Consent given last year and expired, then given again this year',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14)
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ]
      },
      {
        group: LinkGroup.ConsentExpiry,
        label:
          'Consent given last year by both parents, expired on the same day',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14)
          },
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14),
            isFromOtherParent: true
          }
        ]
      },
      {
        group: LinkGroup.ConsentExpiry,
        label:
          'Consent given last year by both parents, expired on different days',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-40)
          },
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14),
            isFromOtherParent: true
          }
        ]
      },
      {
        group: LinkGroup.ClinicBookings,
        label: 'Consent given for clinic last year (but DNA’d), still valid',
        bookings: [{ createdAt: givenConsentExpiringIn(daysUntilSession + 30) }]
      },
      {
        group: LinkGroup.ClinicBookings,
        label:
          'Consent given for clinic last year (but DNA’d), expired 2 weeks ago',
        bookings: [{ createdAt: givenConsentExpiringIn(-14) }]
      },
      // Only possible if the session is at least a couple of days away
      daysUntilSession >= 2 && {
        group: LinkGroup.ClinicBookings,
        label:
          'Consent given for clinic last year (but DNA’d), expires before the session',
        bookings: [
          {
            createdAt: givenConsentExpiringIn(Math.floor(daysUntilSession / 2))
          }
        ]
      },
      {
        group: LinkGroup.ClinicBookings,
        label:
          'Consent given for clinic last year and expired, answers triaged as safe to vaccinate',
        bookings: [
          { createdAt: givenConsentExpiringIn(-14), needsTriage: true }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(-14), 7)
          }
        ]
      },
      {
        group: LinkGroup.ConsentInvalidation,
        label:
          'Consent given last year by one parent and expired, the other parent’s response invalid',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14)
          },
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-30),
            isFromOtherParent: true,
            isInvalidated: true
          }
        ]
      },
      {
        group: LinkGroup.ConsentExpiry,
        label: `Consent refused over ${givenConsentExpiryMonths} months ago`,
        replies: [
          {
            decision: ReplyDecision.Refused,
            createdAt: subMonths(today(), givenConsentExpiryMonths + 1)
          }
        ]
      },
      {
        group: LinkGroup.ConsentExpiry,
        label: `Follow-up requested over ${givenConsentExpiryMonths} months ago`,
        replies: [
          {
            decision: ReplyDecision.Declined,
            createdAt: subMonths(today(), givenConsentExpiryMonths + 1)
          }
        ]
      },
      {
        group: LinkGroup.ConsentInvalidation,
        label:
          'Consent given this year by one parent, the other parent’s refusal from last year invalid',
        replies: [
          {
            decision: ReplyDecision.Refused,
            createdAt: subMonths(today(), 13),
            isFromOtherParent: true,
            isInvalidated: true
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ]
      },
      {
        group: LinkGroup.ConsentInvalidation,
        label: 'Only response is a refusal from last year, marked as invalid',
        replies: [
          {
            decision: ReplyDecision.Refused,
            createdAt: subMonths(today(), 13),
            isInvalidated: true
          }
        ]
      },
      {
        group: LinkGroup.SupersededResponses,
        label:
          'Consent given last year and still valid, then refused this year by the same parent',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60)
          },
          { decision: ReplyDecision.Refused, isThisYear: true }
        ]
      },
      {
        group: LinkGroup.SupersededResponses,
        label: `Consent refused over ${givenConsentExpiryMonths} months ago, then given this year by the same parent`,
        replies: [
          {
            decision: ReplyDecision.Refused,
            createdAt: subMonths(today(), givenConsentExpiryMonths + 1)
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ]
      },
      {
        group: LinkGroup.SupersededResponses,
        label:
          'Consent given last year and still valid (answers need triage), then given again this year by the same parent',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ]
      },
      {
        group: LinkGroup.HealthAnswerExpiry,
        label: 'Consent given this year, answers need triage',
        replies: [
          { decision: ReplyDecision.Given, isThisYear: true, needsTriage: true }
        ]
      },
      {
        group: LinkGroup.HealthAnswerExpiry,
        label:
          'Consent given this year by both parents, only one parent’s answers need triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            isThisYear: true,
            needsTriage: true
          },
          {
            decision: ReplyDecision.Given,
            isThisYear: true,
            isFromOtherParent: true
          }
        ]
      },
      {
        group: LinkGroup.HealthAnswerExpiry,
        label: 'Consent given last year and still valid, answers need triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          }
        ]
      },
      {
        group: LinkGroup.HealthAnswerExpiry,
        label:
          'Consent given last year by one parent (answers need triage), and this year by the other',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          {
            decision: ReplyDecision.Given,
            isThisYear: true,
            isFromOtherParent: true
          }
        ]
      },
      {
        group: LinkGroup.HealthAnswerExpiry,
        label:
          'Consent given last year and expired (answers needed triage), then given again this year',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14),
            needsTriage: true
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ]
      },
      {
        group: LinkGroup.HealthAnswerExpiry,
        label: 'Consent given last year and expired, answers needed triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14),
            needsTriage: true
          }
        ]
      },
      {
        group: LinkGroup.ConsentInvalidation,
        label:
          'Consent given this year, the other parent’s invalid response had answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            isFromOtherParent: true,
            isInvalidated: true,
            needsTriage: true
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ]
      },
      {
        group: LinkGroup.TriageExpiry,
        label:
          'Consent given last year and still valid, answers triaged as safe to vaccinate',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageExpiry,
        label:
          'Consent given last year and expired, answers triaged as do not vaccinate',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14),
            needsTriage: true
          }
        ],
        triages: [
          {
            status: ScreenStatus.DoNotVaccinate,
            note: 'Spoke to GP, do not vaccinate at this time.',
            createdAt: addDays(givenConsentExpiringIn(-14), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageExpiry,
        label:
          'Consent given last year and expired (answers triaged), then given again this year with answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14),
            needsTriage: true
          },
          { decision: ReplyDecision.Given, isThisYear: true, needsTriage: true }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(-14), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageExpiry,
        label:
          'Consent given last year and expired (answers triaged), then given again this year with no answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14),
            needsTriage: true
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ],
        triages: [
          {
            status: ScreenStatus.DelayVaccination,
            note: 'Delay vaccination until later session.',
            createdAt: addDays(givenConsentExpiringIn(-14), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageExpiry,
        label:
          'Consent given last year by both parents, triaged after both responded, one parent’s response expired',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14),
            needsTriage: true
          },
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            isFromOtherParent: true
          }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage invalidated: triaged as safe to vaccinate, then the same parent gave consent again with answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          { decision: ReplyDecision.Given, isThisYear: true, needsTriage: true }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage invalidated: triaged as safe to vaccinate, then the other parent gave consent with answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          {
            decision: ReplyDecision.Given,
            isThisYear: true,
            isFromOtherParent: true,
            needsTriage: true
          }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage still valid: triaged as safe to vaccinate, then the other parent gave consent with no answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          {
            decision: ReplyDecision.Given,
            isThisYear: true,
            isFromOtherParent: true
          }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage invalidated: triaged as safe to vaccinate, then the same parent gave consent again with no answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage invalidated: triaged as safe to vaccinate, then refused by the same parent',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          { decision: ReplyDecision.Refused, isThisYear: true }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage invalidated: triaged as do not vaccinate, then the same parent gave consent again with no answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          { decision: ReplyDecision.Given, isThisYear: true }
        ],
        triages: [
          {
            status: ScreenStatus.DoNotVaccinate,
            note: 'Spoke to GP, do not vaccinate at this time.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage still valid: triaged as do not vaccinate, then the other parent gave consent with answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          },
          {
            decision: ReplyDecision.Given,
            isThisYear: true,
            isFromOtherParent: true,
            needsTriage: true
          }
        ],
        triages: [
          {
            status: ScreenStatus.DoNotVaccinate,
            note: 'Spoke to GP, do not vaccinate at this time.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage invalidated: triaged as safe to vaccinate, then the response it was based on was marked as invalid',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            isInvalidated: true,
            invalidatedAt: addDays(givenConsentExpiringIn(60), 30),
            needsTriage: true
          },
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            isFromOtherParent: true
          }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage invalidated: triaged as safe to vaccinate, then the clinic booking it was based on was cancelled',
        bookings: [
          {
            createdAt: removeDays(today(), 14),
            isThisYear: true,
            needsTriage: true,
            status: ClinicAppointmentStatus.Cancelled,
            cancelledAt: removeDays(today(), 2)
          }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: removeDays(today(), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage still valid: triaged as safe to vaccinate, then the team booked the same parent’s child into a clinic, without asking questions again',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          }
        ],
        bookings: [
          {
            createdAt: removeDays(today(), 7),
            isThisYear: true,
            hasHealthAnswers: false
          }
        ],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      },
      {
        group: LinkGroup.TriageInvalidation,
        label:
          'Triage invalidated: triaged as safe to vaccinate, then the same parent booked a clinic online with no answers needing triage',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60),
            needsTriage: true
          }
        ],
        bookings: [{ createdAt: removeDays(today(), 7), isThisYear: true }],
        triages: [
          {
            status: ScreenStatus.Vaccinate,
            note: 'Spoke to parent, safe to vaccinate.',
            createdAt: addDays(givenConsentExpiringIn(60), 7)
          }
        ]
      }
    ].filter(Boolean)

    const lastYearsSchoolSessions = createLastYearsSchoolSessions(context, {
      school,
      nurse,
      responseDates: children.flatMap(({ replies = [] }) =>
        replies
          .filter(({ isThisYear }) => !isThisYear)
          .map(({ createdAt }) => createdAt)
      )
    })

    const links = []
    for (const {
      group,
      label,
      replies = [],
      bookings = [],
      triages = []
    } of children) {
      const { patient, patientSessions, parent, otherParent } =
        createPatientInSession(context, {
          school,
          session,
          programme_ids: session.programme_ids,
          yearGroup: 9,
          isImmunocompromised: false,
          isUnder16: true,
          hasOtherParent: replies.some(
            ({ isFromOtherParent }) => isFromOtherParent
          )
        })
      const [patientSession] = patientSessions

      // The child was in each of last year’s sessions their parents responded
      // to, keyed by session ID
      const lastYearsPatientSessions = {}
      const getLastYearsPatientSession = (respondedAt) => {
        const lastYearsSession = findSessionWithConsentOpenOn(
          lastYearsSchoolSessions,
          respondedAt
        )
        lastYearsPatientSessions[lastYearsSession.id] ??= addToLastYearsSession(
          context,
          patient,
          lastYearsSession
        )

        return lastYearsPatientSessions[lastYearsSession.id]
      }

      for (const {
        decision,
        createdAt,
        isThisYear,
        isFromOtherParent,
        isInvalidated,
        invalidatedAt,
        needsTriage = false
      } of replies) {
        const respondent = isFromOtherParent ? otherParent : parent

        if (isThisYear) {
          createConsentReply(context, {
            patient,
            patientSession,
            parent: respondent,
            overrides: { decision, needsTriage }
          })
        } else {
          createPastReply(context, {
            patient,
            patientSession: getLastYearsPatientSession(createdAt),
            parent: respondent,
            decision,
            createdAt,
            isInvalidated,
            invalidatedAt,
            needsTriage
          })
        }
      }

      for (const {
        createdAt,
        isThisYear,
        hasHealthAnswers,
        needsTriage,
        status,
        cancelledAt
      } of bookings) {
        const clinicSession = isThisYear
          ? thisYearsClinicSession
          : lastYearsClinicSession

        createClinicBooking(context, {
          patient,
          session: clinicSession,
          parent,
          createdAt,
          vaccinationChoices: {
            selected_programme_ids: clinicSession.programme_ids
          },
          hasHealthAnswers,
          needsTriage,
          status,
          cancelledAt
        })
      }

      for (const { status, note, createdAt } of triages) {
        patientSession.patientProgramme.recordTriage({
          status,
          note,
          createdAt,
          createdBy_uid: nurse.uid
        })
      }

      links.push({ group, label, href: patientSession.uri })
    }

    return {
      startUrl: `${session.uri}/patients`,
      links: [
        ...lastYearsSchoolSessions.map((lastYearsSchoolSession) => ({
          group: LinkGroup.Sessions,
          label: `Session: ${lastYearsSchoolSession.name}`,
          href: `${lastYearsSchoolSession.uri}/patients`
        })),
        {
          group: LinkGroup.Sessions,
          label: `Session: ${lastYearsClinicSession.name}`,
          href: `${lastYearsClinicSession.uri}/patients`
        },
        {
          group: LinkGroup.Sessions,
          label: `Session: ${thisYearsClinicSession.name}`,
          href: `${thisYearsClinicSession.uri}/patients`
        },
        ...links
      ]
    }
  }
})

/**
 * @import { Contact, Patient, School, User } from '../../../app/models.js'
 */
