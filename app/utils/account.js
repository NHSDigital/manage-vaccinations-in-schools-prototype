import { VaccineMethod, VaccinationProtocol } from '../enums.js'

/**
 *
 * @param {User} account - Logged in user
 * @param {PatientSession} patientSession - Patient session
 * @returns {Array<VaccineMethod>} Authorised vaccine methods
 */
export function getAccountVaccineMethods(account, patientSession) {
  // Nurses can record all vaccines under any protocol
  if (account.isRegisteredNurse) {
    return [VaccineMethod.Injection, VaccineMethod.Intranasal]
  }

  // HCAs may be able to record under VGD or PSD
  if (account.isHCA) {
    // HCAs can record all vaccines under VGD
    if (
      patientSession.session.getHCAProtocolFor(patientSession.programme_id) ===
      VaccinationProtocol.VGD
    ) {
      return [VaccineMethod.Injection, VaccineMethod.Intranasal]
    }

    // HCAs can also record the vaccine a child’s PSD is for
    const psdVaccineMethod = patientSession.patientProgramme.vaccine?.method
    const canUsePsd =
      patientSession.session.hasPsdProtocolFor(
        patientSession.patientProgramme
      ) && patientSession.patientProgramme.hasInstruction
    if (canUsePsd && psdVaccineMethod) {
      return [psdVaccineMethod]
    }
  }

  return []
}

/**
 * @import { PatientSession, User } from '../models.js'
 */
