import filters from '@x-govuk/govuk-prototype-filters'
import { isToday } from 'date-fns'

import {
  ConsentStatus,
  ConsentWindow,
  InstructionStatus,
  PatientConsentStatus,
  PatientDeferredStatus,
  PatientStatus,
  PatientRefusedStatus,
  PatientTriageStatus,
  PatientVaccinatedStatus,
  RegistrationStatus,
  ScreenStatus,
  VaccinationOutcome,
  VaccineCriteria
} from '../enums.js'
import { getRepliesWithHealthAnswers } from '../utils/reply.js'

/**
 * Get ready to record outcome
 * Check if registration is needed prior to recording vaccination
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {boolean} Ready to record outcome
 */
export function canRecordOutcome(patientSession) {
  const { register, status, session } = patientSession

  if ([PatientStatus.Due, PatientStatus.Deferred].includes(status)) {
    if (session.hasRegistration && register !== RegistrationStatus.Present) {
      return false
    }

    return true
  }

  return false
}

/**
 * Get expanded description about consent status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {string} Consent status description
 */
export function getConsentStatusDescription(patientSession) {
  const relationships = filters.formatList(patientSession.parentalRelationships)
  const contactNames = filters.formatList(
    patientSession.contactsRequestingFollowUp
  )

  if (patientSession.patient?.isPost16) {
    return `${patientSession.patient.firstName} is old enough to self-consent.`
  }

  if (patientSession.patient?.hasNoContactDetails) {
    return 'There are no contact details for this child.'
  }

  if (patientSession.session?.consentWindow === ConsentWindow.Opening) {
    return patientSession.session?.formatted.consentWindowSentence
  }

  switch (patientSession.consent) {
    case ConsentStatus.NoResponse:
      return 'No-one responded to our requests for consent.'
    case ConsentStatus.NotDelivered:
      return 'Consent response could not be delivered.'
    case ConsentStatus.Inconsistent:
      return 'You can only vaccinate if all respondents give consent.'
    case ConsentStatus.Declined:
      return `${contactNames} would like to speak to a member of the team about other options for their child’s vaccination.`
    case ConsentStatus.Given:
    case ConsentStatus.GivenForAlternativeInjection:
    case ConsentStatus.GivenForIntranasal:
      return `${relationships} gave consent.`
    case ConsentStatus.Refused:
      return `${relationships} refused consent.`
    case ConsentStatus.FinalRefusal:
      return `Refusal to give consent confirmed by ${relationships}.`
    default:
  }
}

/**
 * Get expanded description about screen status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {string} Screen status description
 */
export function getScreenStatusDescription(patientSession) {
  const triageNote = patientSession.triageNotes.at(-1)
  const user = triageNote?.createdBy || { fullName: 'Jane Joy' }
  const person = patientSession.patient.isPost16 ? 'child' : 'parent'

  switch (patientSession.screen) {
    case ScreenStatus.NeedsTriage:
      return patientSession.clinicAppointment
        ? `You need to review the health questions with the ${person} to decide if it’s safe to vaccinate ${patientSession.patient.firstName}.`
        : `You need to decide if it’s safe to vaccinate ${patientSession.patient.firstName}.`
    case ScreenStatus.InvitedToClinic:
      return `${user.fullName} decided that ${patientSession.patient.firstName}’s vaccination should take place at a clinic.`
    case ScreenStatus.DelayVaccination:
      return triageNote?.statusInvalidAt
        ? `${user.fullName} decided that ${patientSession.patient.firstName}’s vaccination should be delayed until ${triageNote.formatted.statusInvalidAt}.`
        : `${user.fullName} decided that ${patientSession.patient.firstName}’s vaccination should be delayed`
    case ScreenStatus.DoNotVaccinate:
      return `${user.fullName} decided that ${patientSession.patient.firstName} should not be vaccinated.`
    case ScreenStatus.Vaccinate:
      return `${user.fullName} decided that ${patientSession.patient.firstName} is safe to vaccinate.`
    case ScreenStatus.VaccinateAlternativeFluInjectionOnly:
      return `${user.fullName} decided that ${patientSession.patient.firstName} is safe to vaccinate using the injected vaccine only.`
    case ScreenStatus.VaccinateAlternativeMMRInjectionOnly:
      return `${user.fullName} decided that ${patientSession.patient.firstName} is safe to vaccinate using the gelatine-free injection only.`
    case ScreenStatus.VaccinateIntranasalOnly:
      return `${user.fullName} decided that ${patientSession.patient.firstName} is safe to vaccinate using the nasal spray only.`
    default:
      return `No triage is needed for ${patientSession.patient.firstName}.`
  }
}

/**
 * Get instruction status for nasal spray
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {InstructionStatus|boolean} Instruction status
 */
export function getInstructionStatus(patientSession) {
  if (!patientSession.vaccine) {
    return false
  }

  if (patientSession.vaccine.criteria === VaccineCriteria.Intranasal) {
    return patientSession.patientProgramme.instruction
      ? InstructionStatus.Given
      : InstructionStatus.Needed
  }

  return false
}

/**
 * Get registration status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {RegistrationStatus} Registration status
 */
export function getRegistrationStatus(patientSession) {
  const { patient, session, status } = patientSession

  if (!session.hasRegistration) {
    return RegistrationStatus.Present
  }

  if (status === PatientStatus.Vaccinated) {
    return RegistrationStatus.Complete
  } else if (session.register[patient.uuid]) {
    return session.register[patient.uuid]
  }

  return RegistrationStatus.Pending
}

/**
 * Get expanded description about registration status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {string} Registration status description
 */
export function getRegistrationStatusDescription(patientSession) {
  switch (patientSession.register) {
    case RegistrationStatus.Present:
      return `${patientSession.patient?.firstName} is attending this session.`
    case RegistrationStatus.Absent:
      return `${patientSession.patient?.firstName} is absent from this session.`
    case RegistrationStatus.Pending:
      return `${patientSession.patient?.firstName} has not been registered as attending yet.`
    case RegistrationStatus.Complete:
      return `${patientSession.patient?.firstName} has completed this session.`
  }
}

/**
 * Get vaccination (session) outcome
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {VaccinationOutcome|undefined} Vaccination (session) outcome
 */
export function getVaccinationOutcome(patientSession) {
  if (patientSession.lastVaccinationOutcome) {
    return patientSession.lastVaccinationOutcome.outcome
  } else if (
    [ConsentStatus.Refused, ConsentStatus.FinalRefusal].includes(
      patientSession.consent
    )
  ) {
    return VaccinationOutcome.ConsentRefused
  } else if (patientSession.screen === ScreenStatus.InvitedToClinic) {
    return VaccinationOutcome.InvitedToClinic
  } else if (patientSession.screen === ScreenStatus.DelayVaccination) {
    return VaccinationOutcome.DelayVaccination
  } else if (patientSession.screen === ScreenStatus.DoNotVaccinate) {
    return VaccinationOutcome.DoNotVaccinate
  }
}

/**
 * Get patient status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {PatientStatus} Overall patient status
 */
export function getPatientStatus(patientSession) {
  // Has vaccination outcome
  if (patientSession.vaccinationOutcomes?.length > 0) {
    switch (patientSession.outcome) {
      case VaccinationOutcome.Vaccinated:
      case VaccinationOutcome.AlreadyVaccinated:
        return PatientStatus.Vaccinated

      case VaccinationOutcome.Absent:
      case VaccinationOutcome.Refused:
      case VaccinationOutcome.Unwell:
        if (isToday(patientSession.lastVaccinationOutcome?.createdAt)) {
          // ‘Could not vaccinate’ only applies on the day it was recorded
          return PatientStatus.Deferred
        }
    }
  }

  // Has screening status
  switch (patientSession.screen) {
    case ScreenStatus.DelayVaccination:
    case ScreenStatus.InvitedToClinic:
    case ScreenStatus.DoNotVaccinate:
      return PatientStatus.Deferred

    case ScreenStatus.Vaccinate:
    case ScreenStatus.VaccinateAlternativeFluInjectionOnly:
    case ScreenStatus.VaccinateAlternativeMMRInjectionOnly:
    case ScreenStatus.VaccinateIntranasalOnly:
      return PatientStatus.Due

    case ScreenStatus.NeedsTriage:
      return PatientStatus.Triage
  }

  // Has consent status
  if (patientSession.consentGiven) {
    return PatientStatus.Due
  }

  switch (patientSession.consent) {
    case ConsentStatus.Declined:
    case ConsentStatus.Inconsistent:
    case ConsentStatus.Refused:
    case ConsentStatus.FinalRefusal:
      return PatientStatus.Refused

    case ConsentStatus.NotDelivered:
    case ConsentStatus.NoResponse:
      return PatientStatus.Consent

    default:
      return PatientStatus.Ineligible
  }
}

/**
 * Get patient consent status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {PatientConsentStatus|undefined} Patient consent status
 */
export function getPatientConsentStatus(patientSession) {
  if (patientSession.patient?.isPost16) {
    return PatientConsentStatus.SelfConsent
  }

  if (patientSession.patient?.hasNoContactDetails) {
    return PatientConsentStatus.NoDetails
  }

  // Only school sessions have a consent window
  if (patientSession.session.school_id) {
    if (patientSession.session?.consentWindow === ConsentWindow.None) {
      return PatientConsentStatus.NotScheduled
    } else if (
      patientSession.session?.consentWindow === ConsentWindow.Opening
    ) {
      return PatientConsentStatus.Scheduled
    }
  }

  switch (patientSession.consent) {
    case ConsentStatus.NotDelivered:
      return PatientConsentStatus.NotDelivered
    case ConsentStatus.NoResponse:
      return PatientConsentStatus.NoResponse
    case ConsentStatus.Declined:
      return PatientRefusedStatus.FollowUp
    case ConsentStatus.Inconsistent:
      return PatientRefusedStatus.Conflict
    case ConsentStatus.Refused:
      return PatientRefusedStatus.Refusal
  }
}

/**
 * Get patient refused status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {PatientRefusedStatus|undefined} Patient refused status
 */
export function getPatientRefusedStatus(patientSession) {
  switch (patientSession.consent) {
    case ConsentStatus.Inconsistent:
      return PatientRefusedStatus.Conflict
    case ConsentStatus.Declined:
      return PatientRefusedStatus.FollowUp
    case ConsentStatus.Refused:
    case ConsentStatus.FinalRefusal:
      return patientSession.isVaccinationWantedOutsideSchool
        ? PatientRefusedStatus.NotInSchool
        : PatientRefusedStatus.Refusal
  }
}

/**
 * Get patient triage status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {PatientTriageStatus|undefined} Patient triage status
 */
export function getPatientTriageStatus(patientSession) {
  const responses = Object.values(patientSession.responses)
  const responsesToTriage = getRepliesWithHealthAnswers(responses)

  if (patientSession.screen === ScreenStatus.NeedsTriage) {
    if (responsesToTriage.length > 0) {
      return PatientTriageStatus.Responses
    } else if (patientSession.clinicAppointment) {
      return PatientTriageStatus.Consultation
    }
  }
}

/**
 * Get patient deferred status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {PatientDeferredStatus|undefined} Patient deferred status
 */
export function getPatientDeferredStatus(patientSession) {
  if (patientSession.screen === ScreenStatus.DoNotVaccinate) {
    return PatientDeferredStatus.DoNotVaccinate
  } else if (patientSession.screen === ScreenStatus.DelayVaccination) {
    return PatientDeferredStatus.DelayVaccination
  } else if (patientSession.screen === ScreenStatus.InvitedToClinic) {
    return PatientDeferredStatus.InvitedToClinic
  }

  switch (patientSession.outcome) {
    case VaccinationOutcome.Absent:
      return PatientDeferredStatus.ChildAbsent
    case VaccinationOutcome.Refused:
      return PatientDeferredStatus.ChildRefused
    case VaccinationOutcome.Unwell:
      return PatientDeferredStatus.ChildUnwell
    case VaccinationOutcome.InvitedToClinic:
      return PatientDeferredStatus.InvitedToClinic
    case VaccinationOutcome.DelayVaccination:
      return PatientDeferredStatus.DelayVaccination
    case VaccinationOutcome.DoNotVaccinate:
      return PatientDeferredStatus.DoNotVaccinate
  }
}

/**
 * Get expanded description about deferred status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {string} Deferred description
 */
export function getPatientDeferredDescription(patientSession) {
  switch (patientSession.patientDeferred) {
    case PatientDeferredStatus.ChildAbsent:
    case PatientDeferredStatus.ChildRefused:
    case PatientDeferredStatus.ChildUnwell:
      return `${patientSession.patientDeferred} on ${patientSession.lastVaccinationOutcome?.formatted.createdAt}.`
    case PatientDeferredStatus.InvitedToClinic:
    case PatientDeferredStatus.DelayVaccination:
    case PatientDeferredStatus.DoNotVaccinate:
      return patientSession.screenDescription
    default:
      return patientSession.patientDeferred
  }
}

/**
 * Get patient vaccinated status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {PatientVaccinatedStatus|undefined} Patient vaccinated status
 */
export function getPatientVaccinatedStatus(patientSession) {
  switch (patientSession.outcome) {
    case VaccinationOutcome.Vaccinated:
    case VaccinationOutcome.PartVaccinated:
      return PatientVaccinatedStatus.Vaccinated
    case VaccinationOutcome.AlreadyVaccinated:
      return PatientVaccinatedStatus.AlreadyVaccinated
  }
}

/**
 * Get expanded description about patient status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {string|undefined} Patient status description
 */
export function getPatientStatusDescription(patientSession) {
  switch (patientSession.status) {
    case PatientStatus.Ineligible:
      return patientSession.patientProgramme?.ineligibilityDescription
    case PatientStatus.Vaccinated:
      return `${patientSession.patient?.firstName} was vaccinated by ${patientSession.lastVaccinationOutcome.createdBy.fullName} on ${patientSession.lastVaccinationOutcome.formatted.createdAt}.`
    case PatientStatus.Due:
      return patientSession.vaccineCriteria
        ? `${patientSession.patient?.firstName} is ready to vaccinate (${patientSession.vaccineCriteria.toLowerCase()}).`
        : `${patientSession.patient?.firstName} is ready to vaccinate.`
    case PatientStatus.Deferred:
      return patientSession.deferredDescription
    case PatientStatus.Triage:
      return patientSession.screenDescription
    case PatientStatus.Refused:
    case PatientStatus.Consent:
      // Don’t show full consent description as it’s shown directly below
      return `${patientSession.patientConsent}.`
  }
}

/**
 * @import { PatientSession } from '../models.js'
 */
