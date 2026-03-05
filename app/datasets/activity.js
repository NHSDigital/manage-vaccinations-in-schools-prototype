import { ScreenOutcome } from '../enums.js'

export default {
  attendance: {
    present: (session) => `Attended session at ${session.location.name}`,
    absent: (session) => `Absent from the session at ${session.location.name}`
  },
  consent: {
    created: ({ decision, parent }) =>
      `${decision} by ${parent.formatted.fullNameAndRelationship}`,
    updated: ({ decision, parent }) =>
      `${decision} in updated response from ${parent.formatted.fullNameAndRelationship}`,
    matched: ({ parent }) =>
      `Consent response from ${parent.formatted.fullNameAndRelationship} manually matched with child record`,
    invalid: ({ parent }) =>
      `Consent response from ${parent.formatted.fullNameAndRelationship} marked as invalid`,
    withdrawn: ({ parent }) =>
      `Consent response from ${parent.formatted.fullNameAndRelationship} withdrawn`
  },
  gillick: {
    created: (gillick) => gillick.competent,
    updated: (gillick) => gillick.competent.replace('assessed', 'reassessed')
  },
  note: {
    created: (type) => `${type} added`
  },
  notify: {
    invitedToClinic: (parent) =>
      `Invitation to book a clinic appointment<br>sent to ${parent.formatted.fullNameAndRelationship}, ${parent.email || parent.tel}`,
    invitedToClinicReminder: (parent) =>
      `Reminder to book a clinic appointment<br>sent to ${parent.formatted.fullNameAndRelationship}, ${parent.email || parent.tel}`,
    requestedConsent: (parent) =>
      `Consent request<br>sent to ${parent.formatted.fullNameAndRelationship}, ${parent.email || parent.tel}`,
    requestedConsentReminder: (parent) =>
      `Reminder to give or refuse consent<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    consentGiven: (parent) =>
      `Confirmation of consent given<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    consentGivenClinic: (parent) =>
      `Confirmation of consent given (clinic booking needed)<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    consentGivenTriage: (parent) =>
      `Confirmation of consent given (triage needed)<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    consentRefused: (parent) =>
      `Confirmation of consent refused<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    consentUnknownContact: (parent) =>
      `Unknown parent contact details warning<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    sessionReminder: (parent) =>
      `Session reminder<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    triageDelayVaccination: (parent) =>
      `Confirmation of triage decision (delay vaccination)<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    triageDoNotVaccinate: (parent) =>
      `Confirmation of triage decision (unable to vaccinate)<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    triageInviteToClinic: (parent) =>
      `Confirmation of triage decision (invite to clinic)<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    triageSafeToVaccinate: (parent) =>
      `Confirmation of triage decision (safe to vaccinate)<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    triageSecondDose: (parent) =>
      `Confirmation of triage decision (2nd dose will be given in school)<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    vaccinationAlreadyGiven: (parent) =>
      `Confirmation of vaccination discovered since consent<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    vaccinationDeleted: (parent) =>
      `Apology for sending an incorrect message<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    vaccinationGiven: (parent) =>
      `Confirmation of vaccination<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`,
    vaccinationNotGiven: (parent) =>
      `Confirmation of vaccination not given<br>sent to ${parent.fullName}, ${parent.email || parent.tel}`
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
        ? 'Triage decision: Keep in triage'
        : `Triage decision: ${triage.outcome}`
  },
  vaccination: {
    added: 'Vaccination record added manually',
    recorded: (vaccination) =>
      vaccination.given
        ? `Vaccinated with ${vaccination.vaccine.brand}`
        : `Vaccination not given: ${vaccination.outcome}`,
    uploaded: 'Vaccination record uploaded'
  }
}
