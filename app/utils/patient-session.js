import { isToday } from 'date-fns'

import {
  ConsentOutcome,
  InstructionOutcome,
  PatientStatus,
  RegistrationOutcome,
  ScreenOutcome,
  VaccinationOutcome,
  VaccineCriteria
} from '../enums.js'

/**
 * Get instruction outcome for nasal spray
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {InstructionOutcome|boolean} Instruction outcome
 */
export const getInstructionOutcome = (patientSession) => {
  if (!patientSession.vaccine) {
    return false
  }

  if (patientSession.vaccine.criteria === VaccineCriteria.Intranasal) {
    return patientSession.instruction
      ? InstructionOutcome.Given
      : InstructionOutcome.Needed
  }

  return false
}

/**
 * Get registration outcome
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {RegistrationOutcome} Registration outcome
 */
export const getRegistrationOutcome = (patientSession) => {
  const { patient, session, report } = patientSession

  if (!session.hasRegistration) {
    return RegistrationOutcome.Present
  }

  if (report === PatientStatus.Vaccinated) {
    return RegistrationOutcome.Complete
  } else if (session.register[patient.uuid]) {
    return session.register[patient.uuid]
  }

  return RegistrationOutcome.Pending
}

/**
 * Get ready to record outcome
 * Check if registration is needed prior to recording vaccination
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {boolean} Ready to record outcome
 */
export const canRecordOutcome = (patientSession) => {
  const { register, report, session } = patientSession

  if ([PatientStatus.Due, PatientStatus.Deferred].includes(report)) {
    if (session.hasRegistration && register !== RegistrationOutcome.Present) {
      return false
    }

    return true
  }

  return false
}

/**
 * Get vaccination (session) outcome
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {VaccinationOutcome|undefined} Vaccination (session) outcome
 */
export const getSessionOutcome = (patientSession) => {
  if (patientSession.lastVaccinationOutcome) {
    return patientSession.lastVaccinationOutcome.outcome
  } else if (
    [ConsentOutcome.Refused, ConsentOutcome.FinalRefusal].includes(
      patientSession.consent
    )
  ) {
    return VaccinationOutcome.ConsentRefused
  } else if (patientSession.screen === ScreenOutcome.InviteToClinic) {
    return VaccinationOutcome.InviteToClinic
  } else if (patientSession.screen === ScreenOutcome.DelayVaccination) {
    return VaccinationOutcome.DelayVaccination
  } else if (patientSession.screen === ScreenOutcome.DoNotVaccinate) {
    return VaccinationOutcome.DoNotVaccinate
  }
}

/**
 * Get patient status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {PatientStatus} Overall patient status
 */
export const getPatientStatus = (patientSession) => {
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

  // Has screening outcome
  switch (patientSession.screen) {
    case ScreenOutcome.DelayVaccination:
    case ScreenOutcome.InviteToClinic:
    case ScreenOutcome.DoNotVaccinate:
      return PatientStatus.Deferred

    case ScreenOutcome.Vaccinate:
    case ScreenOutcome.VaccinateAlternativeFluInjectionOnly:
    case ScreenOutcome.VaccinateAlternativeMMRInjectionOnly:
    case ScreenOutcome.VaccinateIntranasalOnly:
      return PatientStatus.Due

    case ScreenOutcome.NeedsTriage:
      return PatientStatus.Triage
  }

  // Has consent outcome
  if (patientSession.consentGiven) {
    return PatientStatus.Due
  }

  switch (patientSession.consent) {
    case ConsentOutcome.Declined:
    case ConsentOutcome.Inconsistent:
    case ConsentOutcome.Refused:
    case ConsentOutcome.FinalRefusal:
      return PatientStatus.Refused

    case ConsentOutcome.NotDelivered:
    case ConsentOutcome.NoResponse:
      return PatientStatus.Consent

    default:
      return PatientStatus.Ineligible
  }
}

/**
 * @import { PatientSession } from '../models.js'
 */
