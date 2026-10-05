import { InstructionStatus, PatientStatus, ScreenStatus } from '../enums.js'
import { lowerCaseFirst } from '../utils/string.js'

export default {
  attendance: {
    present: (session) => `Attended session at ${session.location.name}`,
    absent: (session) => `Absent from session at ${session.location.name}`
  },
  consent: {
    created: ({ child, decision, hasSelfConsent, relationship }) =>
      hasSelfConsent
        ? `${decision} by ${child?.fullName} (child)`
        : `${decision} by ${relationship?.fullNameAndRelationship}`,
    updated: ({ decision, relationship }) =>
      `${decision} in updated response from ${relationship.fullNameAndRelationship}`,
    followedUp: ({ hasConfirmedRefusal, decision, relationship }) =>
      `${hasConfirmedRefusal ? 'Refusal confirmed' : decision} in followed-up response from ${relationship.fullNameAndRelationship}`,
    matched: ({ relationship }) =>
      `Consent response from ${relationship.fullNameAndRelationship} manually matched with child record`,
    invalid: ({ relationship }) =>
      `Consent response from ${relationship.fullNameAndRelationship} marked as invalid`,
    withdrawn: ({ relationship }) =>
      `Consent response from ${relationship.fullNameAndRelationship} withdrawn`
  },
  gillick: {
    created: (gillick) => gillick.competent,
    updated: (gillick) => gillick.competent?.replace('assessed', 'reassessed')
  },
  note: {
    created: (type) => `${type} added`
  },
  notify: {
    invite: (relationship) =>
      `Consent request sent to ${relationship.fullNameAndRelationship}`,
    'invite-reminder': (relationship) =>
      `Consent reminder sent to ${relationship.fullNameAndRelationship}`,
    'invite-clinic': (relationship) =>
      `Clinic invitation sent to ${relationship.fullNameAndRelationship}`,
    'invite-clinic-reminder': (relationship) =>
      `Clinic invitation reminder sent to ${relationship.fullNameAndRelationship}`,
    'consent-given': (relationship) =>
      `Confirmation of consent given sent to ${relationship.fullNameAndRelationship}`,
    'consent-given-changed-school': (relationship) =>
      `Confirmation of consent given (clinic booking needed) sent to ${relationship.fullNameAndRelationship}`,
    'consent-needs-triage': (relationship) =>
      `Confirmation of consent given (triage needed) sent to ${relationship.fullNameAndRelationship}`,
    'consent-refused': (relationship) =>
      `Confirmation of consent refused sent to ${relationship.fullNameAndRelationship}`,
    'consent-followed-up': (relationship) =>
      `Confirmation of follow-up decision to confirm refusal sent to ${relationship.fullNameAndRelationship}`,
    'consent-unknown-contact': (relationship) =>
      `Unknown parent contact details warning sent to ${relationship.fullNameAndRelationship}`,
    'triage-delay-vaccination': (relationship) =>
      `Confirmation of triage decision (delay vaccination) sent to ${relationship.fullNameAndRelationship}`,
    'triage-do-not-vaccinate': (relationship) =>
      `Confirmation of triage decision (unable to vaccinate) sent to ${relationship.fullNameAndRelationship}`,
    'triage-invite-to-clinic': (relationship) =>
      `Confirmation of triage decision (invite to clinic) sent to ${relationship.fullNameAndRelationship}`,
    'triage-vaccinate': (relationship) =>
      `Confirmation of triage decision (safe to vaccinate) sent to ${relationship.fullNameAndRelationship}`,
    'triage-vaccinate-second-dose': (relationship) =>
      `Confirmation of triage decision (2nd dose will be given in school) sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-reminder': (relationship) =>
      `Session reminder sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-given': (relationship) =>
      `Confirmation the vaccination was given sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-not-given-absent': (relationship) =>
      `Confirmation the vaccination was not given sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-not-given-refused': (relationship) =>
      `Confirmation the vaccination was not given sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-not-given-unwell': (relationship) =>
      `Confirmation the vaccination was not given sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-not-given-contraindicated-delay-vaccination': (relationship) =>
      `Confirmation the vaccination was not given sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-not-given-contraindicated-invite-to-clinic': (relationship) =>
      `Confirmation the vaccination was not given sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-not-given-contraindicated-do-not-vaccinate': (relationship) =>
      `Confirmation the vaccination was not given sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-already-had': (relationship) =>
      `Confirmation previous vaccination discovered since consent sent to ${relationship.fullNameAndRelationship}`,
    'vaccination-deleted': (relationship) =>
      `Apology for incorrect message sent to ${relationship.fullNameAndRelationship}`
  },
  patient: {
    archived: (archive) =>
      `Record archived: ${lowerCaseFirst(archive.archiveReason)}`,
    expired:
      'Consent, health information, triage outcome and PSD status expired',
    merged: (mergedPatient, patient) =>
      `The record for ${mergedPatient.fullName} (date of birth ${mergedPatient.formatted.dob}) was merged with the record for ${patient.fullName} (date of birth ${patient.formatted.dob}) because they have the same NHS number (${mergedPatient.formatted.nhsn}).`,
    relationship: (relationship) => `${relationship.fullName} added to record`,
    updated: (source) =>
      source
        ? `Record updated automatically after new details were imported in a ${source} upload`
        : 'Record updated manually'
  },
  preScreen: {
    created: 'Completed pre-screening checks'
  },
  psd: {
    added: InstructionStatus.Given,
    invalidated: 'PSD invalidated'
  },
  session: {
    added: (session) => `Added to the session at ${session?.location.name}`,
    removed: (session) =>
      `Removed from the session at ${session?.location.name}`,
    cancelAppointment: (session) =>
      `Cancelled appointment for clinic at ${session?.location.name}`
  },
  triage: {
    decision: (triage) =>
      triage.status === ScreenStatus.NeedsTriage
        ? 'Triage decision: keep in triage'
        : `Triage decision: ${lowerCaseFirst(triage.status)}`
  },
  vaccination: {
    added: 'Vaccination record added manually',
    recorded: (vaccination) =>
      vaccination.wasGiven
        ? vaccination.vaccine
          ? `Vaccinated with ${vaccination.vaccine?.brand}`
          : 'Vaccinated'
        : `${PatientStatus.Deferred}: ${lowerCaseFirst(vaccination.outcome)}`,
    uploaded: 'Vaccination record uploaded',
    updated: 'Vaccination record updated manually'
  }
}
