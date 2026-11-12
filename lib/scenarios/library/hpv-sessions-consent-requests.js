import { differenceInCalendarDays, subMonths } from 'date-fns'

import {
  ReplyDecision,
  SessionConsentContacts,
  SessionPresetName,
  VaccinationMethod,
  VaccinationOutcome,
  VaccinationSite,
  VaccinationSource
} from '../../../app/enums.js'
import { Vaccination } from '../../../app/models.js'
import { addDays, removeDays, today } from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'
import {
  addToLastYearsSession,
  createConsentReply,
  createLastYearsSchoolSessions,
  createPastReply,
  createPatientInSession,
  createSchoolSession,
  findSessionWithConsentOpenOn,
  givenConsentExpiringIn,
  pickSessionDate
} from '../helpers.js'

// Groups of children on the scenarios page, by what each child shows
const LinkGroup = {
  Sessions: 'Sessions',
  ConsentWindowNotOpen: 'Consent requests not sent yet',
  ConsentWindowOpen: 'Consent requested, reminder not sent yet',
  ReminderDatePassed: 'Consent requested, reminder sent',
  AllChildren:
    'Session requesting consent from ALL children, including those with a refusal',
  ConsentRequestNotNeeded: 'Consent not requested',
  SentByTeamMember: 'Consent requests and reminders sent by a team member'
}

/**
 * Record that a child was vaccinated somewhere else, such as at their GP
 * surgery, and that the record reached Mavis on the same day
 *
 * @param {object} context - Context
 * @param {Patient} patient - Child
 * @param {Programme} programme - Programme
 * @param {Date} administeredAt - When the child was vaccinated
 */
function recordVaccinationElsewhere(
  context,
  patient,
  programme,
  administeredAt
) {
  const vaccine = programme.standardVaccine

  Vaccination.create(
    {
      createdAt: administeredAt,
      administeredAt,
      patient_uuid: patient.uuid,
      programme_id: programme.id,
      outcome: VaccinationOutcome.Vaccinated,
      source: VaccinationSource.NhsImmunisationsApi,
      vaccine_snomed: vaccine.snomed,
      dose: vaccine.dose,
      sequence: programme.sequenceDefault,
      injectionMethod: VaccinationMethod.Intramuscular,
      injectionSite: VaccinationSite.ArmLeftUpper
    },
    context
  )
}

export default defineScenario({
  name: 'Consent requests and reminders',
  description:
    'A focus on patient-session pages showing whether consent requests and reminders are sent, and why. ' +
    'Includes a session that’s set up to send requests to everyone, including those with refusals.',
  run(context, shared) {
    const { consentRequestsSecondarySchool: school, nurse } = shared

    // Consent opened 3 weeks before, and the reminder went out a week before
    const reminderSentSession = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.HPV,
      date: pickSessionDate(3),
      consentContacts: SessionConsentContacts.NonRefusers
    })

    // Consent opened 3 weeks before, but the reminder hasn’t gone out yet
    const allChildrenSession = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.HPV,
      date: pickSessionDate(10),
      consentContacts: SessionConsentContacts.All
    })

    // Consent opens in a few weeks (and the session is after the Christmas holidays)
    const consentWindowNotOpenSession = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.HPV,
      date: pickSessionDate(42),
      consentContacts: SessionConsentContacts.NonRefusers
    })

    const daysUntilReminderSentSession = differenceInCalendarDays(
      reminderSentSession.date,
      today()
    )
    const refusedLastYearAt = subMonths(today(), 10)

    // Consent given last year that lasts beyond every session in this scenario
    const consentLastingBeyondSessionsGivenAt = givenConsentExpiringIn(
      differenceInCalendarDays(consentWindowNotOpenSession.date, today()) + 60
    )

    const children = [
      // Consent window not open yet
      {
        group: LinkGroup.ConsentWindowNotOpen,
        label: 'No consent, so consent will be requested',
        session: consentWindowNotOpenSession
      },
      {
        group: LinkGroup.ConsentWindowNotOpen,
        label:
          'Consent given last year, lasting beyond the session, so consent won’t be requested',
        session: consentWindowNotOpenSession,
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: consentLastingBeyondSessionsGivenAt
          }
        ]
      },
      {
        group: LinkGroup.ConsentWindowNotOpen,
        label: 'Refused last year, so consent won’t be requested',
        session: consentWindowNotOpenSession,
        replies: [
          { decision: ReplyDecision.Refused, createdAt: refusedLastYearAt }
        ]
      },

      // Consent window open, requests sent, but no reminders yet
      {
        group: LinkGroup.ConsentWindowOpen,
        label: 'No response, so a reminder is due',
        session: allChildrenSession
      },
      {
        group: LinkGroup.ConsentWindowOpen,
        label: 'Responded after the request, so no reminder is due',
        session: allChildrenSession,
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: addDays(allChildrenSession.consentOpenAt, 3),
            isThisYear: true
          }
        ]
      },

      // Consent requested, and the reminder has gone out
      {
        group: LinkGroup.ReminderDatePassed,
        label: 'No response, so reminded',
        session: reminderSentSession
      },
      {
        group: LinkGroup.ReminderDatePassed,
        label: 'Responded after the request, so not reminded',
        session: reminderSentSession,
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: addDays(reminderSentSession.consentOpenAt, 3),
            isThisYear: true
          }
        ]
      },
      {
        group: LinkGroup.ReminderDatePassed,
        label: 'Responded after the reminder',
        session: reminderSentSession,
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: addDays(reminderSentSession.nextReminderDate, 1),
            isThisYear: true
          }
        ]
      },
      {
        group: LinkGroup.ReminderDatePassed,
        label:
          'Consent given last year, expiring before the session, so asked again',
        session: reminderSentSession,
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: givenConsentExpiringIn(
              Math.floor(daysUntilReminderSentSession / 2)
            )
          }
        ]
      },
      {
        group: LinkGroup.ReminderDatePassed,
        label: 'No parents with contact details, so no request sent',
        session: reminderSentSession,
        hasContactDetails: false
      },

      // Session requesting consent from all children, before the reminder
      {
        group: LinkGroup.AllChildren,
        label: 'Refused last year, but asked again',
        session: allChildrenSession,
        replies: [
          { decision: ReplyDecision.Refused, createdAt: refusedLastYearAt }
        ]
      },

      // Consent not requested
      {
        group: LinkGroup.ConsentRequestNotNeeded,
        label: 'Consent given last year, lasting beyond the session',
        session: reminderSentSession,
        replies: [
          {
            decision: ReplyDecision.Given,
            createdAt: consentLastingBeyondSessionsGivenAt
          }
        ]
      },
      {
        group: LinkGroup.ConsentRequestNotNeeded,
        label: 'Refused last year',
        session: reminderSentSession,
        replies: [
          { decision: ReplyDecision.Refused, createdAt: refusedLastYearAt }
        ]
      },
      {
        group: LinkGroup.ConsentRequestNotNeeded,
        label: 'Vaccinated at their GP surgery before the request',
        session: reminderSentSession,
        vaccinatedElsewhereAt: removeDays(reminderSentSession.consentOpenAt, 14)
      },
      {
        group: LinkGroup.ConsentRequestNotNeeded,
        label: 'Aged 16 in Year 11, so can give consent themselves',
        session: reminderSentSession,
        yearGroup: 11,
        isPost16: true
      },

      // Consent requests and reminders sent by a team member
      {
        group: LinkGroup.SentByTeamMember,
        label:
          'Refused last year, but a nurse requested consent anyway, so no scheduled reminder',
        session: reminderSentSession,
        replies: [
          { decision: ReplyDecision.Refused, createdAt: refusedLastYearAt }
        ],
        isRequestedByNurse: true
      },
      {
        group: LinkGroup.SentByTeamMember,
        label: 'No response, so a nurse sent an extra reminder',
        session: reminderSentSession,
        remindedByNurseAt: removeDays(today(), 2)
      }
    ]

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
      session,
      replies = [],
      yearGroup = 9,
      isPost16 = false,
      hasContactDetails = true,
      vaccinatedElsewhereAt,
      isRequestedByNurse = false,
      remindedByNurseAt
    } of children) {
      const { patient, patientSessions, parent } = createPatientInSession(
        context,
        {
          school,
          session,
          programme_ids: session.programme_ids,
          yearGroup,
          isImmunocompromised: false,
          isUnder16: !isPost16,
          isPost16,
          hasContactDetails
        }
      )
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

      for (const { decision, createdAt, isThisYear } of replies) {
        if (isThisYear) {
          createConsentReply(context, {
            patient,
            patientSession,
            parent,
            overrides: { decision },
            createdAt
          })
        } else {
          createPastReply(context, {
            patient,
            patientSession: getLastYearsPatientSession(createdAt),
            parent,
            decision,
            createdAt
          })
        }
      }

      if (vaccinatedElsewhereAt) {
        recordVaccinationElsewhere(
          context,
          patient,
          patientSession.programme,
          vaccinatedElsewhereAt
        )
      }

      // Requests and reminders sent automatically go out once every scenario
      // has run, but those sent by a team member are part of this case
      if (isRequestedByNurse) {
        patient.requestConsent(patientSession, nurse.uid)
      }

      if (remindedByNurseAt) {
        patientSession.sendConsentReminder(
          { createdAt: remindedByNurseAt, createdBy_uid: nurse.uid },
          parent
        )
      }

      links.push({ group, label, href: patientSession.uri })
    }

    return {
      startUrl: `${reminderSentSession.uri}/patients`,
      links: [
        ...[
          reminderSentSession,
          allChildrenSession,
          consentWindowNotOpenSession,
          ...lastYearsSchoolSessions
        ].map((session) => ({
          group: LinkGroup.Sessions,
          label: `Session: ${session.name}`,
          href: `${session.uri}/patients`
        })),
        ...links
      ]
    }
  }
})

/**
 * @import { Patient, Programme } from '../../../app/models.js'
 */
