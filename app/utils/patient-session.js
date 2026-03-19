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
 * @param {import('../models.js').PatientSession} patientSession - Patient session
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
 * @param {import('../models.js').PatientSession} patientSession - Patient session
 * @returns {RegistrationOutcome} Registration outcome
 */
export const getRegistrationOutcome = (patientSession) => {
  const { patient, session, report } = patientSession

  if (!session.registration) {
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
 * @param {import('../models.js').PatientSession} patientSession - Patient session
 * @returns {boolean|undefined} Ready to record outcome
 */
export const getRecordOutcome = (patientSession) => {
  const { register, report, session } = patientSession

  if (report !== PatientStatus.Vaccinated) {
    if (session.registration && register === RegistrationOutcome.Pending) {
      return false
    }

    return true
  }
}

/**
 * Get vaccination (session) outcome
 *
 * @param {import('../models.js').PatientSession} patientSession - Patient session
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
 * @param {import('../models.js').PatientSession} patientSession - Patient session
 * @returns {PatientStatus} Overall patient status
 */
export const getReportOutcome = (patientSession) => {
  // Has vaccination outcome
  if (patientSession.vaccinationOutcomes?.length > 0) {
    if (
      [
        VaccinationOutcome.Vaccinated,
        VaccinationOutcome.AlreadyVaccinated
      ].includes(patientSession.outcome)
    ) {
      return PatientStatus.Vaccinated
    } else if (
      [
        VaccinationOutcome.Absent,
        VaccinationOutcome.Refused,
        VaccinationOutcome.Unwell
      ].includes(patientSession.outcome)
    ) {
      return PatientStatus.Deferred
    }
  }

  // Has screening outcome
  if (patientSession.screen) {
    if (
      [
        ScreenOutcome.DelayVaccination,
        ScreenOutcome.InviteToClinic,
        ScreenOutcome.DoNotVaccinate
      ].includes(String(patientSession.screen))
    ) {
      return PatientStatus.Deferred
    } else if (
      [
        ScreenOutcome.Vaccinate,
        ScreenOutcome.VaccinateAlternativeFluInjectionOnly,
        ScreenOutcome.VaccinateAlternativeMMRInjectionOnly,
        ScreenOutcome.VaccinateIntranasalOnly
      ].includes(String(patientSession.screen))
    ) {
      return PatientStatus.Due
    }
  }

  // Has triage outcome
  if (patientSession.screen === ScreenOutcome.NeedsTriage) {
    return PatientStatus.Triage
  }

  // Has consent outcome
  if (patientSession.consentGiven) {
    return PatientStatus.Due
  } else if (
    [
      ConsentOutcome.Inconsistent,
      ConsentOutcome.Refused,
      ConsentOutcome.FinalRefusal
    ].includes(patientSession.consent)
  ) {
    return PatientStatus.Refused
  } else if (
    [
      ConsentOutcome.NotDelivered,
      ConsentOutcome.NoResponse,
      ConsentOutcome.NoResponse,
      ConsentOutcome.Declined
    ].includes(patientSession.consent)
  ) {
    return PatientStatus.Consent
  }

  return PatientStatus.Ineligible
}
