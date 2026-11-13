import { differenceInCalendarDays, subMonths } from 'date-fns'

import {
  ClinicAppointmentStatus,
  ClinicType,
  ReplyDecision,
  ScreenStatus,
  SessionConsentContacts,
  SessionPresetName
} from '../../../app/enums.js'
import {
  addDays,
  removeDays,
  setMidday,
  today
} from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'
import {
  addToLastYearsSession,
  createClinicBooking,
  createClinicSession,
  createConsentReply,
  createLastYearsSchoolSessions,
  createPastReply,
  createPatientInSession,
  createSchoolSession,
  findSessionWithConsentOpenOn,
  givenConsentExpiringIn,
  givenConsentExpiryMonths,
  pickSessionDate
} from '../helpers.js'

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
        researchTags: [{ tag: 'consent-expiry' }],
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
        researchTags: [{ tag: 'consent-expiry', label: 'Example 2' }],
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
      presetName: SessionPresetName.HPV,
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
      researchTags,
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

      links.push({ group, label, researchTags, href: patientSession.uri })
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
 * @import { Contact, Patient, School, Session, User } from '../../../app/models.js'
 */
