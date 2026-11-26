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
 * under a VGD or PSD, as only the person who assessed the child can give it under a PGD:
 * - other nurses, if nurses use a VGD for the programme, or the child has a PSD that
 *   the session allows
 * - HCAs, if HCAs use a VGD for the programme, or the child has a PSD that the
 *   session allows
 *
 * A PSD lets any trained staff give the vaccine on the prescriber’s authority
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
  const childHasPsd = canUsePsd(session, patientProgramme)

  return User.findAll(session.context).filter(
    (user) =>
      user.uid === recordedBy.uid ||
      (user.isRegisteredNurse && (nursesUseVgd || childHasPsd)) ||
      (user.isHCA && (hcasUseVgd || childHasPsd))
  )
}

/**
 * Get the protocol a child’s vaccine is given under, which depends on who gives it
 *
 * A PSD takes priority. Otherwise, it’s a VGD if the role of the person giving the
 * vaccine uses one for the programme, or else a PGD
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

  if (canUsePsd(session, patientProgramme)) {
    return VaccinationProtocol.PSD
  }

  if (
    administeredBy?.isHCA &&
    session.getHCAProtocolFor(programme_id) === VaccinationProtocol.VGD
  ) {
    return VaccinationProtocol.VGD
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
