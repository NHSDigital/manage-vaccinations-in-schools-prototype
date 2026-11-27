import { VaccinationProtocol } from '../enums.js'
import { User } from '../models.js'

/**
 * Can the child be given the vaccine under a PSD in this session?
 *
 * @param {Session} session - Session
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {boolean} Child can be vaccinated under a PSD
 */
function canUsePsd(session, patientProgramme) {
  return (
    session.hasPsdProtocolFor(patientProgramme) &&
    patientProgramme.hasInstruction
  )
}

/**
 * Get the people who can give a child their vaccine in a session
 *
 * The person recording the vaccination can always give it. Others can only give it
 * under a VGD, as only the person who assessed the child can give it under a PGD:
 * - other nurses, if nurses use a VGD for the programme
 * - HCAs, if HCAs use a VGD for the programme
 *
 * HCAs giving a vaccine under a PSD assess the child themselves, so they record it
 * themselves too, rather than a nurse recording it for them
 *
 * @param {Session} session - Session
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @param {User} recordedBy - Person recording the vaccination
 * @returns {Array<User>} People who can give the vaccine
 */
export function getPossibleVaccinators(session, patientProgramme, recordedBy) {
  const { programme_id } = patientProgramme
  const nursesUseVgd =
    session.getNurseProtocolFor(programme_id) === VaccinationProtocol.VGD
  const hcasUseVgd =
    session.getHCAProtocolFor(programme_id) === VaccinationProtocol.VGD

  return User.findAll(session.context).filter(
    (user) =>
      user.uid === recordedBy.uid ||
      (user.isRegisteredNurse && nursesUseVgd) ||
      (user.isHCA && hcasUseVgd)
  )
}

/**
 * Get the protocol a child’s vaccine is given under, which depends on who gives it
 *
 * Nurses give it under a VGD if nurses use one for the programme, or else a PGD.
 * HCAs give it under a VGD if HCAs use one for the programme, or else a PSD if the
 * child has one the session allows
 *
 * @param {Session} session - Session
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @param {User} [administeredBy] - Person giving the vaccine
 * @returns {VaccinationProtocol} Protocol
 */
export function getVaccinationProtocol(
  session,
  patientProgramme,
  administeredBy
) {
  const { programme_id } = patientProgramme

  if (administeredBy?.isHCA) {
    if (session.getHCAProtocolFor(programme_id) === VaccinationProtocol.VGD) {
      return VaccinationProtocol.VGD
    }

    if (canUsePsd(session, patientProgramme)) {
      return VaccinationProtocol.PSD
    }
  }

  if (
    administeredBy?.isRegisteredNurse &&
    session.getNurseProtocolFor(programme_id) === VaccinationProtocol.VGD
  ) {
    return VaccinationProtocol.VGD
  }

  return VaccinationProtocol.PGD
}

/**
 * @import { PatientProgramme, Session } from '../models.js'
 */
