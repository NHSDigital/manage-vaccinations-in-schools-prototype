import { PatientStatus, RegistrationStatus } from '../enums.js'

/**
 * Get ready to record outcome
 * Check if registration is needed prior to recording vaccination
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {boolean} Ready to record outcome
 */
export function canRecordOutcome(patientSession) {
  const { patientProgramme, register, session } = patientSession

  if (
    [PatientStatus.Due, PatientStatus.Deferred].includes(
      patientProgramme.status
    )
  ) {
    if (session.hasRegistration && register !== RegistrationStatus.Present) {
      return false
    }

    return true
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
  const { patientProgramme, patient, session } = patientSession

  if (!session.hasRegistration) {
    return RegistrationStatus.Present
  }

  if (patientProgramme.isVaccinated) {
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
 * @import { PatientSession } from '../models.js'
 */
