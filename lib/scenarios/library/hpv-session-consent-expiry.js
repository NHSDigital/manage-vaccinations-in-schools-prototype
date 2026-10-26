import { fakerEN_GB as faker } from '@faker-js/faker'
import { differenceInCalendarDays, subMonths } from 'date-fns'

import {
  ReplyDecision,
  SchoolTerm,
  SessionPresetName,
  SessionPresets
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
  createConsentReply,
  createPatientInSession,
  createSchoolSession,
  pickSessionDateInTerm
} from '../helpers.js'

// Consent given for routine programmes expires this many months after it was submitted
const givenConsentExpiryMonths = 15

/**
 * Create last academic year’s HPV session at the school. The children in this
 * scenario were in it, and their parents responded to its consent requests,
 * but they weren’t vaccinated. Its consent window is long enough to cover
 * every response this scenario backdates
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {School} options.school - School
 * @param {User} options.nurse - Nurse who set the session up
 * @returns {Session} Session
 */
function createLastYearsSession(context, { school, nurse }) {
  const preset = SessionPresets.find(
    ({ name }) => name === SessionPresetName.HPV
  )

  let date = subMonths(today(), 12)
  while ([0, 6].includes(date.getDay())) {
    date = removeDays(date, 1)
  }

  const session = generateSession(preset, nurse, { school_id: school.id })
  session.date = setMidday(date)
  session.academicYear = getAcademicYear(session.date)
  session.consentOpenAt = subMonths(today(), givenConsentExpiryMonths + 2)

  // Session IDs are random, so make sure not to replace an existing session
  while (Session.findOne(session.id, context)) {
    session.id = faker.helpers.replaceSymbols('###')
  }

  return Session.create(session, context)
}

/**
 * Add a child to last academic year’s session, as they would have been when
 * their parents responded to its consent requests
 *
 * @param {object} context - Context
 * @param {Patient} patient - Child
 * @param {Session} session - Last academic year’s session
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

  return patientSession
}

/**
 * Create a consent response from a parent, submitted on a given date in last
 * academic year’s session
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {Patient} options.patient - Child
 * @param {PatientSession} options.patientSession - Child in last academic year’s session
 * @param {Contact} options.parent - Parent giving the response
 * @param {ReplyDecision} options.decision - Parent’s decision
 * @param {Date} options.createdAt - When the parent responded
 * @param {boolean} [options.isInvalidated] - Whether a nurse marked the response as invalid
 * @returns {Consent} Consent response
 */
function createPastReply(
  context,
  { patient, patientSession, parent, decision, createdAt, isInvalidated }
) {
  const generatedConsent = generateConsent(patientSession, parent, createdAt, {
    decision,
    needsTriage: false
  })
  if (!generatedConsent) {
    throw new Error('Could not generate a consent response')
  }

  const consent = new Consent({ ...generatedConsent, isInvalidated }, context)
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
  name: 'HPV session with consent responses from last year',
  description:
    'An HPV session with a handful of Year 9 children who weren’t vaccinated in last year’s ' +
    'session, and whose parents responded to it. Each child shows a different case of consent ' +
    `expiry: consent given more than a year ago that’s still valid, about to expire (within a ` +
    'month, or before the session), already expired (from one parent, both parents, or one ' +
    'alongside an invalid response), or expired and given again this year, ' +
    `and refusals and follow-up requests from over ${givenConsentExpiryMonths} months ago ` +
    'that don’t expire.',
  run(context, shared) {
    const { consentExpirySecondarySchool: school, nurse } = shared

    const lastYearsSession = createLastYearsSession(context, { school, nurse })
    const session = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.HPV,
      date: pickSessionDateInTerm(SchoolTerm.Spring)
    })
    const daysUntilSession = differenceInCalendarDays(session.date, today())

    const children = [
      {
        label: 'Consent given last year, still valid for 2 months',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(60)
          }
        ]
      },
      {
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
        label: 'Consent given last year, expires before the session',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(Math.floor(daysUntilSession / 2))
          }
        ]
      },
      {
        label: 'Consent given last year, expired 2 weeks ago',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14)
          }
        ]
      },
      {
        label:
          'Consent given last year and expired, then given again this year',
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(-14)
          }
        ],
        isGivenAgainThisYear: true
      },
      {
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
        label: `Consent refused over ${givenConsentExpiryMonths} months ago`,
        replies: [
          {
            decision: ReplyDecision.Refused,
            createdAt: subMonths(today(), givenConsentExpiryMonths + 1)
          }
        ]
      },
      {
        label: `Follow-up requested over ${givenConsentExpiryMonths} months ago`,
        replies: [
          {
            decision: ReplyDecision.Declined,
            createdAt: subMonths(today(), givenConsentExpiryMonths + 1)
          }
        ]
      }
    ].filter(Boolean)

    const links = []
    for (const { label, replies, isGivenAgainThisYear } of children) {
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

      const lastYearsPatientSession = addToLastYearsSession(
        context,
        patient,
        lastYearsSession
      )
      for (const {
        decision,
        createdAt,
        isFromOtherParent,
        isInvalidated
      } of replies) {
        createPastReply(context, {
          patient,
          patientSession: lastYearsPatientSession,
          parent: isFromOtherParent ? otherParent : parent,
          decision,
          createdAt,
          isInvalidated
        })
      }

      if (isGivenAgainThisYear) {
        createConsentReply(context, {
          patient,
          patientSession,
          parent,
          overrides: { decision: ReplyDecision.Given, needsTriage: false }
        })
      }

      links.push({ label, href: patientSession.uri })
    }

    return {
      startUrl: `${session.uri}/patients`,
      links: [
        { label: 'Children in session', href: `${session.uri}/patients` },
        ...links
      ]
    }
  }
})

/**
 * @import { Contact, Patient, School, User } from '../../../app/models.js'
 */
