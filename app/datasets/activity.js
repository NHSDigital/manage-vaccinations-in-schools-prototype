import { ScreenOutcome } from '../enums.js'
import { lowerCaseFirst } from '../utils/string.js'

export default {
  attendance: {
    present: (session) => `Attended session at ${session.location.name}`,
    absent: (session) => `Absent from session at ${session.location.name}`
  },
  consent: {
    created: ({ decision, parent }) =>
      `${decision} by ${parent.fullNameAndRelationship}`,
    updated: ({ decision, parent }) =>
      `${decision} in updated response from ${parent.fullNameAndRelationship}`,
    matched: ({ parent }) =>
      `Consent response from ${parent.fullNameAndRelationship} manually matched with child record`,
    invalid: ({ parent }) =>
      `Consent response from ${parent.fullNameAndRelationship} marked as invalid`,
    withdrawn: ({ parent }) =>
      `Consent response from ${parent.fullNameAndRelationship} withdrawn`
  },
  gillick: {
    created: (gillick) => gillick.competent,
    updated: (gillick) => gillick.competent.replace('assessed', 'reassessed')
  },
  note: {
    created: (type) => `${type} added`
  },
  notify: {
    invite: (parent) =>
      `Consent request sent to ${parent.fullNameAndRelationship}`,
    'invite-reminder': (parent) =>
      `Reminder to give or refuse consent sent to ${parent.fullNameAndRelationship}`,
    'invite-clinic': (parent) =>
      `Invitation to book a clinic appointment sent to ${parent.fullNameAndRelationship}`,
    'invite-clinic-reminder': (parent) =>
      `Reminder to book a clinic appointment sent to ${parent.fullNameAndRelationship}`,
    'consent-given': (parent) =>
      `Confirmation of consent given sent to ${parent.fullNameAndRelationship}`,
    'consent-given-changed-school': (parent) =>
      `Confirmation of consent given (clinic booking needed) sent to ${parent.fullNameAndRelationship}`,
    'consent-needs-triage': (parent) =>
      `Confirmation of consent given (triage needed) sent to ${parent.fullNameAndRelationship}`,
    'consent-refused': (parent) =>
      `Confirmation of consent refused sent to ${parent.fullNameAndRelationship}`,
    'consent-unknown-contact': (parent) =>
      `Unknown parent contact details warning sent to ${parent.fullNameAndRelationship}`,
    'triage-delay-vaccination': (parent) =>
      `Confirmation of triage decision (delay vaccination) sent to ${parent.fullNameAndRelationship}`,
    'triage-do-not-vaccinate': (parent) =>
      `Confirmation of triage decision (unable to vaccinate) sent to ${parent.fullNameAndRelationship}`,
    'triage-invite-to-clinic': (parent) =>
      `Confirmation of triage decision (invite to clinic) sent to ${parent.fullNameAndRelationship}`,
    'triage-vaccinate': (parent) =>
      `Confirmation of triage decision (safe to vaccinate) sent to ${parent.fullNameAndRelationship}`,
    'triage-vaccinate-second-dose': (parent) =>
      `Confirmation of triage decision (2nd dose will be given in school) sent to ${parent.fullNameAndRelationship}`,
    'vaccination-reminder': (parent) =>
      `Session reminder sent to ${parent.fullNameAndRelationship}`,
    'vaccination-given': (parent) =>
      `Confirmation of vaccination sent to ${parent.fullNameAndRelationship}`,
    'vaccination-not-administered': (parent) =>
      `Confirmation of vaccination not given sent to ${parent.fullNameAndRelationship}`,
    'vaccination-already-had': (parent) =>
      `Confirmation of vaccination discovered since consent sent to ${parent.fullNameAndRelationship}`,
    'vaccination-deleted': (parent) =>
      `Apology for sending an incorrect message sent to ${parent.fullNameAndRelationship}`
  },
  patient: {
    archived: (archive) => `Record archived: ${archive.archiveReason}`,
    expired:
      'Consent, health information, triage outcome and PSD status expired',
    merged: (mergedPatient, patient) =>
      `The record for ${mergedPatient.fullName} (date of birth ${mergedPatient.formatted.dob}) was merged with the record for ${patient.fullName} (date of birth ${patient.formatted.dob}) because they have the same NHS number (${mergedPatient.formatted.nhsn}).`,
    updated: (key, value) => `Updated \`${key}\` to **${value}**`
  },
  preScreen: {
    created: 'Completed pre-screening checks'
  },
  psd: {
    added: 'PSD added',
    invalidated: 'PSD invalidated'
  },
  session: {
    added: (session) => `Added to the session at ${session.location.name}`,
    removed: (session) => `Removed from the session at ${session.location.name}`
  },
  triage: {
    decision: (triage) =>
      triage.outcome === ScreenOutcome.NeedsTriage
        ? 'Triage decision: keep in triage'
        : `Triage decision: ${lowerCaseFirst(triage.outcome)}`
  },
  vaccination: {
    added: 'Vaccination record added manually',
    recorded: (vaccination) =>
      vaccination.given
        ? `Vaccinated with ${vaccination.vaccine.brand}`
        : `Could not vaccinate: ${lowerCaseFirst(vaccination.outcome)}`,
    uploaded: 'Vaccination record uploaded'
  }
}
