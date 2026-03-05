import activity from '../datasets/activity.js'
import { ArchiveRecordReason, AuditEventType, ScreenOutcome } from '../enums.js'
import { generateParent } from '../generators/parent.js'
import {
  AuditEvent,
  Gillick,
  Patient,
  Reply,
  Session,
  Vaccination
} from '../models.js'

export const activityController = {
  list(request, response) {
    const { data } = request.session

    const auditEvent = (event) => new AuditEvent(event, data)
    const createdBy_uid = Object.values(data.users)[0].uid
    const gillickCompetent = new Gillick({
      q1: true,
      q2: true,
      q3: true,
      q4: true,
      q5: true
    })
    const gillickNotCompetent = new Gillick({
      q1: true,
      q2: true,
      q3: true,
      q4: true,
      q5: false
    })
    const parent = generateParent('Jones')
    const patient = Patient.findAll(data).find(
      ({ hasMissingNhsNumber, invalid }) => !hasMissingNhsNumber && !invalid
    )
    const mergedPatient = Patient.findAll(data).find(
      ({ uuid, hasMissingNhsNumber, invalid }) =>
        uuid !== patient.uuid && !hasMissingNhsNumber && !invalid
    )
    const reply = Reply.findAll(data).find((reply) => !reply.selfConsent)
    const session = Session.findOne(Object.values(data.sessions)[0].id, data)
    const vaccinationGiven = Vaccination.findAll(data).find(
      (vaccination) => vaccination.given
    )
    const vaccinationNotGiven = Vaccination.findAll(data).find(
      (vaccination) => !vaccination.given
    )

    const activityLog = [
      {
        title: 'Attendance',
        items: [
          auditEvent({
            name: activity.attendance.present(session),
            createdBy_uid,
            programme_ids: ['menacwy', 'td-ipv']
          }),
          auditEvent({
            name: activity.attendance.absent(session),
            createdBy_uid,
            programme_ids: ['menacwy', 'td-ipv']
          })
        ]
      },
      {
        title: 'Consent',
        items: [
          auditEvent({
            name: activity.consent.created(reply),
            createdBy_uid,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.consent.updated(reply),
            createdBy_uid,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.consent.matched(reply),
            createdBy_uid,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.consent.invalid(reply),
            createdBy_uid,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.consent.withdrawn(reply),
            createdBy_uid,
            programme_ids: ['flu']
          })
        ]
      },
      {
        title: 'Gillick',
        items: [
          auditEvent({
            name: activity.gillick.created(gillickCompetent),
            note: 'Child happy to proceed',
            createdBy_uid,
            programme_ids: ['hpv']
          }),
          auditEvent({
            name: activity.gillick.created(gillickNotCompetent),
            note: 'Child did not understand the side effects',
            createdBy_uid,
            programme_ids: ['hpv']
          }),
          auditEvent({
            name: activity.gillick.updated(gillickCompetent),
            note: 'Child now happy to proceed',
            createdBy_uid,
            programme_ids: ['hpv']
          }),
          auditEvent({
            name: activity.gillick.updated(gillickNotCompetent),
            note: 'Child is no longer happy to proceed',
            createdBy_uid,
            programme_ids: ['hpv']
          })
        ]
      },
      {
        title: 'Notes',
        items: [
          auditEvent({
            name: activity.note.created(AuditEventType.SessionNote),
            note: 'Mum phoned to say child will be arriving at school at 11am',
            createdBy_uid,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.note.created(AuditEventType.RecordNote),
            note: 'Child gave consent for HPV and flu vaccinations under Gillick competence and does not want their parents to be notified.',
            createdBy_uid
          })
        ]
      },
      {
        title: 'Notify',
        items: [
          'invitedToClinic',
          'invitedToClinicReminder',
          'requestedConsent',
          'requestedConsentReminder',
          'consentGiven',
          'consentGivenClinic',
          'consentGivenTriage',
          'consentRefused',
          'consentUnknownContact',
          'sessionReminder',
          'triageDelayVaccination',
          'triageDoNotVaccinate',
          'triageInviteToClinic',
          'triageSafeToVaccinate',
          'triageSecondDose',
          'vaccinationGiven',
          'vaccinationAlreadyGiven',
          'vaccinationDeleted',
          'vaccinationNotGiven'
        ].map((name) =>
          auditEvent({
            name: activity.notify[name](parent),
            programme_ids: ['mmr']
          })
        )
      },
      {
        title: 'Patient',
        items: [
          auditEvent({
            name: activity.patient.archived({
              archiveReason: ArchiveRecordReason.Other
            }),
            note: 'A brief note about why child record was archived.',
            createdBy_uid
          }),
          auditEvent({
            name: activity.patient.expired,
            note: `${patient.fullName} was vaccinated`,
            createdBy_uid
          }),
          auditEvent({
            name: activity.patient.merged(mergedPatient, patient),
            createdBy_uid
          })
        ]
      },
      {
        title: 'Pre-screening',
        items: [
          auditEvent({
            name: activity.preScreen.created,
            note: 'A brief note about the pre-screening checks.',
            createdBy_uid,
            programme_ids: ['flu']
          })
        ]
      },
      {
        title: 'PSD',
        items: [
          auditEvent({
            name: activity.psd.added,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.psd.invalidated,
            createdBy_uid,
            programme_ids: ['flu']
          })
        ]
      },
      {
        title: 'Session',
        items: [
          auditEvent({
            name: activity.session.added(session),
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.session.removed(session),
            createdBy_uid,
            programme_ids: ['flu']
          })
        ]
      },
      {
        title: 'Triage',
        items: [
          auditEvent({
            name: activity.triage.decision({
              outcome: ScreenOutcome.DelayVaccination
            }),
            note: 'A brief note about the triage decision.',
            createdBy_uid,
            programme_ids: ['flu']
          })
        ]
      },
      {
        title: 'Vaccination',
        items: [
          auditEvent({
            name: activity.vaccination.added,
            createdBy_uid,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.vaccination.recorded(vaccinationGiven),
            note: 'A brief note about the vaccination session.',
            createdBy_uid,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.vaccination.recorded(vaccinationNotGiven),
            note: 'A brief note about the vaccination session.',
            createdBy_uid,
            programme_ids: ['flu']
          }),
          auditEvent({
            name: activity.vaccination.uploaded,
            createdBy_uid,
            programme_ids: ['flu']
          })
        ]
      }
    ]

    response.render('activity/list', { activityLog })
  }
}
