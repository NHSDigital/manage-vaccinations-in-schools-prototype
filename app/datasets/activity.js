import { InstructionStatus, PatientStatus, ScreenStatus } from '../enums.js'
import { lowerCaseFirst } from '../utils/string.js'

export default {
  attendance: {
    present: (session) => `Attended session at ${session.location.name}`,
    absent: (session) => `Absent from session at ${session.location.name}`
  },
  consent: {
    created: ({ child, decision, contactRelationship, hasSelfConsent }) =>
      hasSelfConsent
        ? `${decision} by ${child?.fullName} (child)`
        : `${decision} by ${contactRelationship?.fullNameAndRelationship}`,
    updated: ({ decision, contactRelationship }) =>
      `${decision} in updated response from ${contactRelationship.fullNameAndRelationship}`,
    followedUp: ({ hasConfirmedRefusal, decision, contactRelationship }) =>
      `${hasConfirmedRefusal ? 'Refusal confirmed' : decision} in followed-up response from ${contactRelationship.fullNameAndRelationship}`,
    matched: ({ contactRelationship }) =>
      `Consent response from ${contactRelationship.fullNameAndRelationship} manually matched with child record`,
    invalid: ({ contactRelationship }) =>
      `Consent response from ${contactRelationship.fullNameAndRelationship} marked as invalid`,
    withdrawn: ({ contactRelationship }) =>
      `Consent response from ${contactRelationship.fullNameAndRelationship} withdrawn`,
    expired: ({ child, contactRelationship, hasSelfConsent }) =>
      hasSelfConsent
        ? `Consent from ${child?.fullName} (child) expired`
        : `Consent from ${contactRelationship?.fullNameAndRelationship} expired`
  },
  gillick: {
    created: (gillick) => gillick.competent,
    updated: (gillick) => gillick.competent?.replace('assessed', 'reassessed')
  },
  note: {
    created: (type) => `${type} added`
  },
  notify: {
    invite: (contactRelationship) =>
      `Consent request sent to ${contactRelationship.fullNameAndRelationship}`,
    'invite-reminder': (contactRelationship) =>
      `Consent reminder sent to ${contactRelationship.fullNameAndRelationship}`,
    'invite-clinic': (contactRelationship) =>
      `Clinic invitation sent to ${contactRelationship.fullNameAndRelationship}`,
    'invite-clinic-reminder': (contactRelationship) =>
      `Clinic invitation reminder sent to ${contactRelationship.fullNameAndRelationship}`,
    'consent-given': (contactRelationship) =>
      `Confirmation of consent given sent to ${contactRelationship.fullNameAndRelationship}`,
    'consent-given-changed-school': (contactRelationship) =>
      `Confirmation of consent given (clinic booking needed) sent to ${contactRelationship.fullNameAndRelationship}`,
    'consent-needs-triage': (contactRelationship) =>
      `Confirmation of consent given (triage needed) sent to ${contactRelationship.fullNameAndRelationship}`,
    'consent-refused': (contactRelationship) =>
      `Confirmation of consent refused sent to ${contactRelationship.fullNameAndRelationship}`,
    'consent-followed-up': (contactRelationship) =>
      `Confirmation of follow-up decision to confirm refusal sent to ${contactRelationship.fullNameAndRelationship}`,
    'consent-unknown-contact': (contactRelationship) =>
      `Unknown parent contact details warning sent to ${contactRelationship.fullNameAndRelationship}`,
    'triage-delay-vaccination': (contactRelationship) =>
      `Confirmation of triage decision (delay vaccination) sent to ${contactRelationship.fullNameAndRelationship}`,
    'triage-do-not-vaccinate': (contactRelationship) =>
      `Confirmation of triage decision (unable to vaccinate) sent to ${contactRelationship.fullNameAndRelationship}`,
    'triage-invite-to-clinic': (contactRelationship) =>
      `Confirmation of triage decision (invite to clinic) sent to ${contactRelationship.fullNameAndRelationship}`,
    'triage-vaccinate': (contactRelationship) =>
      `Confirmation of triage decision (safe to vaccinate) sent to ${contactRelationship.fullNameAndRelationship}`,
    'triage-vaccinate-second-dose': (contactRelationship) =>
      `Confirmation of triage decision (2nd dose will be given in school) sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-reminder': (contactRelationship) =>
      `Session reminder sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-given': (contactRelationship) =>
      `Confirmation the vaccination was given sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-not-given-absent': (contactRelationship) =>
      `Confirmation the vaccination was not given sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-not-given-refused': (contactRelationship) =>
      `Confirmation the vaccination was not given sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-not-given-unwell': (contactRelationship) =>
      `Confirmation the vaccination was not given sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-not-given-contraindicated-delay-vaccination': (
      contactRelationship
    ) =>
      `Confirmation the vaccination was not given sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-not-given-contraindicated-invite-to-clinic': (
      contactRelationship
    ) =>
      `Confirmation the vaccination was not given sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-not-given-contraindicated-do-not-vaccinate': (
      contactRelationship
    ) =>
      `Confirmation the vaccination was not given sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-already-had': (contactRelationship) =>
      `Confirmation previous vaccination discovered since consent sent to ${contactRelationship.fullNameAndRelationship}`,
    'vaccination-deleted': (contactRelationship) =>
      `Apology for incorrect message sent to ${contactRelationship.fullNameAndRelationship}`
  },
  patient: {
    archived: (archive) =>
      `Record archived: ${lowerCaseFirst(archive.archiveReason)}`,
    expired:
      'Consent, health information, triage outcome and PSD status expired',
    merged: (mergedPatient, patient) =>
      `The record for ${mergedPatient.fullName} (date of birth ${mergedPatient.formatted.dob}) was merged with the record for ${patient.fullName} (date of birth ${patient.formatted.dob}) because they have the same NHS number (${mergedPatient.formatted.nhsn}).`,
    contactRelationship: (contactRelationship) =>
      `${contactRelationship.fullName} added to record`,
    contactRelationshipArchived: (contactRelationship) =>
      `${contactRelationship.fullName} archived`,
    // Phone numbers and email addresses aren’t included, in case the record
    // becomes sensitive
    contactAdded: (contactRelationship, contact) =>
      `${contact.type} added for ${contactRelationship.fullNameAndRelationship}`,
    // When a phone number or email address the contact already has is given
    contactConfirmed: (contactRelationship, contact) =>
      `${contact.type} confirmed for ${contactRelationship.fullNameAndRelationship}`,
    contactArchived: (contactRelationship, contact) =>
      `${contact.type} archived for ${contactRelationship.fullNameAndRelationship}`,
    contactRestored: (contactRelationship, contact) =>
      `${contact.type} restored for ${contactRelationship.fullNameAndRelationship}`,
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
    addedToSchoolSession: (session) =>
      `Added to the school session at ${session?.location.name}`,
    bookedIntoClinic: (session) =>
      `Booked into the clinic session at ${session?.location.name}`,
    droppedIntoClinic: (session) =>
      `Dropped into the clinic session at ${session?.location.name}`,
    removed: (session) =>
      `Removed from the session at ${session?.location.name}`,
    moved: (oldSession, newSession) =>
      `Moved from the session at ${oldSession?.location.name} to the session at ${newSession?.location.name}`,
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
