import _ from 'lodash'

import programmesData from '../datasets/programmes.js'
import { SessionPresets, SessionStatus, SessionType } from '../enums.js'
import { Session } from '../models.js'

/**
 * Generate a URL to book into a clinic for vaccination in the given presets' programmes
 *
 * @param {Array<string>} sessionPresetNames - the presets for which the child has been invited to clinic
 * @returns {string} Path to start of clinic booking journey for given programme
 */
export const getClinicInviteUrlForPresets = (sessionPresetNames) => {
  const sessionPresets = SessionPresets.filter((preset) =>
    sessionPresetNames.includes(preset.name)
  )
  const programme_ids = sessionPresets.flatMap((preset) =>
    preset.programmeTypes.map((type) => programmesData[type].id)
  )

  return getClinicInviteUrlForProgrammes(programme_ids)
}

/**
 * Generate a URL to book into a clinic for vaccination in the given programmes
 *
 * @param {Array<string>} programme_ids - Programmes for which child has been invited to clinic
 * @returns {string} Path to start of clinic booking journey for given programme
 */
export const getClinicInviteUrlForProgrammes = (programme_ids) => {
  const searchParams = new URLSearchParams()
  for (const programme_id of programme_ids) {
    searchParams.append('programme_id', programme_id)
  }

  return `/book-into-a-clinic/?${searchParams.toString()}`
}

/**
 * Get a list of clinic sessions serving any of the given programmes and that are open to booking
 *
 * @param {object} context - the data context for the models to check
 * @param {Array<string>} programme_ids - the programmes that must be served at the clinics
 * @param {boolean} requiresStockingPeriod - must there be time before the session starts to plan stocks?
 * @returns {Array<Session>} the list of sessions open to booking serving the given programmes
 */
export const getBookableClinicSessions = (
  context,
  programme_ids,
  requiresStockingPeriod
) => {
  const scheduledClinics = Session.findAll(context).filter(
    (session) =>
      session.type === SessionType.Clinic &&
      session.status === SessionStatus.Planned &&
      session.programme_ids.some((id) => programme_ids.includes(id)) &&
      session.daysLeftToBook >= (requiresStockingPeriod ? 1 : 0) &&
      session.availableSlotCount > 0
  )

  return scheduledClinics
}

/**
 * Get the clinic location options to present to the user
 *
 * @param {object} context - Data context for the models to check
 * @param {Array<string>} programme_ids - Programmes that must be served at the clinics
 * @param {boolean} requiresStockingPeriod - must there be time before the session starts to plan stocks?
 * @param {boolean|undefined} isFakeOutOfArea - Flag to say whether to pretend all clinics are a long way away
 * @returns {Array<object>} Set of radio buttons to present to the user, one per location
 */
export const getScheduledClinicLocationItems = (
  context,
  programme_ids,
  requiresStockingPeriod,
  isFakeOutOfArea
) => {
  const scheduledClinics = getBookableClinicSessions(
    context,
    programme_ids,
    requiresStockingPeriod
  )
  const sessionsByLocation = _.groupBy(
    scheduledClinics,
    (session) => session.clinic_id
  )

  let distanceToClinic = isFakeOutOfArea ? 100.5 : 0.5
  const clinicLocationItems = []
  Object.entries(sessionsByLocation).forEach(([clinic_id, sessions]) => {
    const firstSession = sessions.reduce((earliest, current) => {
      return current.date < earliest.date ? current : earliest
    })

    clinicLocationItems.push({
      text: sessions[0].formatted.location,
      value: clinic_id,
      hint: `${distanceToClinic.toFixed(1)} miles away, next date is ${firstSession.formatted.date}`
    })
    distanceToClinic += 2.1
  })

  return clinicLocationItems
}
