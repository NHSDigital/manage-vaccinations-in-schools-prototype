import { ClinicType, SessionType } from '../enums.js'
import { Session } from '../models.js'

/**
 * Get planned clinic sessions that can be offered in a clinic invitation
 *
 * @param {object} context - the data context holding the sessions
 * @returns {Array<Session>} Planned clinic sessions, excluding drop-in clinics
 */
const getInvitableClinics = (context) =>
  Session.findAll(context)
    .filter(({ type }) => type === SessionType.Clinic)
    .filter(({ isPlanned }) => isPlanned)
    .filter(({ clinicType }) => clinicType !== ClinicType.DropIn)

/**
 * Get open clinic sessions serving any of the given programmes
 *
 * Clinics created before clinic types existed are treated as open.
 *
 * @param {Array<string>} programme_ids - Programmes being invited for
 * @param {object} context - the data context holding the sessions
 * @returns {Array<Session>} Open-to-all clinic sessions
 */
export const getOpenAccessClinics = (programme_ids, context) =>
  getInvitableClinics(context)
    .filter(({ clinicType }) => clinicType !== ClinicType.Restricted)
    .filter((session) =>
      programme_ids.some((id) => session.programme_ids.includes(id))
    )

/**
 * Get restricted invitation clinic sessions serving all of the given programmes
 *
 * Sorted by audience, then date, so that clinics for the same audience are listed together.
 *
 * @param {Array<string>} programme_ids - Programmes being invited for
 * @param {object} context - the data context holding the sessions
 * @returns {Array<Session>} Restricted-invitation clinic sessions that match the given programmes
 */
export const getRestrictedAccessClinics = (programme_ids, context) =>
  getInvitableClinics(context)
    .filter(({ clinicType }) => clinicType === ClinicType.Restricted)
    .filter((session) =>
      programme_ids.every((id) => session.programme_ids.includes(id))
    )
    .sort(
      (a, b) =>
        (a.clinicAudience || '').localeCompare(b.clinicAudience || '') ||
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )
