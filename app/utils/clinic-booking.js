import programmesData from '../datasets/programmes.js'
import { SessionPresets } from '../enums.js'

/**
 * Generate a URL to book into a clinic for vaccination in the given presets' programmes
 *
 * @param {Array<string>} sessionPresetNames - the presets for which the child has been invited to clinic
 * @returns {string} - path to the start of the clinic booking journey for the given programme
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
 * @param {Array<string>} programme_ids - the programmes for which the child has been invited to clinic
 * @returns {string} - path to the start of the clinic booking journey for the given programme
 */
export const getClinicInviteUrlForProgrammes = (programme_ids) => {
  const searchParams = new URLSearchParams()
  for (const programme_id of programme_ids) {
    searchParams.append('programme_id', programme_id)
  }

  return `/book-into-a-clinic/?${searchParams.toString()}`
}
