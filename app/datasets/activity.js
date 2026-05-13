import { InstructionOutcome, PatientStatus, ScreenOutcome } from '../enums.js'
import { lowerCaseFirst } from '../utils/string.js'

export default {
  attendance: {
    present: (session) => `Attended session at ${session.location.name}`,
    absent: (session) => `Absent from session at ${session.location.name}`
  },
  consent: {
    created: ({ child, decision, contact, selfConsent }) =>
      selfConsent
        ? `${decision} by ${child?.fullName} (child)`
        : `${decision} by ${contact?.fullNameAndRelationship}`,
    updated: ({ decision, contact }) =>
      `${decision} in updated response from ${contact.fullNameAndRelationship}`,
    followedUp: ({ confirmed, decision, contact }) =>
      `${confirmed ? 'Refusal confirmed' : decision} in followed-up response from ${contact.fullNameAndRelationship}`,
    matched: ({ contact }) =>
      `Consent response from ${contact.fullNameAndRelationship} manually matched with child record`,
    invalid: ({ contact }) =>
      `Consent response from ${contact.fullNameAndRelationship} marked as invalid`,
    withdrawn: ({ contact }) =>
      `Consent response from ${contact.fullNameAndRelationship} withdrawn`
  },
  gillick: {
    created: (gillick) => gillick.competent,
    updated: (gillick) => gillick.competent?.replace('assessed', 'reassessed')
  },
  note: {
    created: (type) => `${type} added`
  },
  notify: {
    invite: (contact) =>
      `Consent request sent to ${contact.fullNameAndRelationship}`,
    'invite-reminder': (contact) =>
      `Consent reminder sent to ${contact.fullNameAndRelationship}`,
    'invite-clinic': (contact) =>
      `Clinic invitation sent to ${contact.fullNameAndRelationship}`,
    'invite-clinic-reminder': (contact) =>
      `Clinic invitation reminder sent to ${contact.fullNameAndRelationship}`,
    'consent-given': (contact) =>
      `Confirmation of consent given sent to ${contact.fullNameAndRelationship}`,
    'consent-given-changed-school': (contact) =>
      `Confirmation of consent given (clinic booking needed) sent to ${contact.fullNameAndRelationship}`,
    'consent-needs-triage': (contact) =>
      `Confirmation of consent given (triage needed) sent to ${contact.fullNameAndRelationship}`,
    'consent-refused': (contact) =>
      `Confirmation of consent refused sent to ${contact.fullNameAndRelationship}`,
    'consent-followed-up': (contact) =>
      `Confirmation of follow-up decision to confirm refusal sent to ${contact.fullNameAndRelationship}`,
    'consent-unknown-contact': (contact) =>
      `Unknown parent contact details warning sent to ${contact.fullNameAndRelationship}`,
    'triage-delay-vaccination': (contact) =>
      `Confirmation of triage decision (delay vaccination) sent to ${contact.fullNameAndRelationship}`,
    'triage-do-not-vaccinate': (contact) =>
      `Confirmation of triage decision (unable to vaccinate) sent to ${contact.fullNameAndRelationship}`,
    'triage-invite-to-clinic': (contact) =>
      `Confirmation of triage decision (invite to clinic) sent to ${contact.fullNameAndRelationship}`,
    'triage-vaccinate': (contact) =>
      `Confirmation of triage decision (safe to vaccinate) sent to ${contact.fullNameAndRelationship}`,
    'triage-vaccinate-second-dose': (contact) =>
      `Confirmation of triage decision (2nd dose will be given in school) sent to ${contact.fullNameAndRelationship}`,
    'vaccination-reminder': (contact) =>
      `Session reminder sent to ${contact.fullNameAndRelationship}`,
    'vaccination-given': (contact) =>
      `Confirmation the vaccination was given sent to ${contact.fullNameAndRelationship}`,
    'vaccination-not-administered': (contact) =>
      `Confirmation the vaccination was not given sent to ${contact.fullNameAndRelationship}`,
    'vaccination-already-had': (contact) =>
      `Confirmation previous vaccination discovered since consent sent to ${contact.fullNameAndRelationship}`,
    'vaccination-deleted': (contact) =>
      `Apology for incorrect message sent to ${contact.fullNameAndRelationship}`
  },
  patient: {
    archived: (archive) =>
      `Record archived: ${lowerCaseFirst(archive.archiveReason)}`,
    expired:
      'Consent, health information, triage outcome and PSD status expired',
    merged: (mergedPatient, patient) =>
      `The record for ${mergedPatient.fullName} (date of birth ${mergedPatient.formatted.dob}) was merged with the record for ${patient.fullName} (date of birth ${patient.formatted.dob}) because they have the same NHS number (${mergedPatient.formatted.nhsn}).`,
    contact: (contact) => `${contact.fullName} added to record`,
    updated: (source) =>
      source
        ? `Record updated automatically after new details were imported in a ${source} upload`
        : 'Record updated manually'
  },
  preScreen: {
    created: 'Completed pre-screening checks'
  },
  psd: {
    added: InstructionOutcome.Given,
    invalidated: 'PSD invalidated'
  },
  session: {
    added: (session) => `Added to the session at ${session?.location.name}`,
    removed: (session) =>
      `Removed from the session at ${session?.location.name}`
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
        ? `Vaccinated with ${vaccination.vaccine?.brand}`
        : `${PatientStatus.Deferred}: ${lowerCaseFirst(vaccination.outcome)}`,
    uploaded: 'Vaccination record uploaded'
  }
}
