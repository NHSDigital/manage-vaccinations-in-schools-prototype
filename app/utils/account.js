import { VaccineMethod } from '../enums.js'

/**
 *
 * @param {User} account - Logged in user
 * @param {PatientSession} patientSession - Patient session
 * @returns {Array<VaccineMethod>} Authorised vaccine methods
 */
export function getAccountVaccineMethods(account, patientSession) {
  let vaccineMethods
  if (account.isRegisteredNurse) {
    // Nurses can record all vaccines under any protocol
    vaccineMethods = [VaccineMethod.Injection, VaccineMethod.Intranasal]
  } else if (account.isHealthcareAssistant) {
    // HCAs can record all vaccines under VGD
    if (patientSession.session.hasVgdProtocol) {
      vaccineMethods = [VaccineMethod.Injection, VaccineMethod.Intranasal]
    }

    // HCAs can only record nasal vaccines for children with a PSD
    if (
      patientSession.session.hasPsdProtocol &&
      patientSession.patientProgramme.hasInstruction
    ) {
      vaccineMethods = [VaccineMethod.Intranasal]
    }
  }

  return vaccineMethods
}

/**
 * @import { PatientSession, User } from '../models.js'
 */
