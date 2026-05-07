import programmesData from '../datasets/programmes.js'
import { SessionPresets } from '../enums.js'

/**
 * Generate a URL for booking into a clinic whose primary programme is given by the session preset
 *
 * @param {string} sessionPresetName - the primary programme for the clinic
 * @returns {string} - path to the start of the clinic booking journey for the given programme
 */
export const getClinicInviteUrl = (sessionPresetName) => {
  const sessionPreset = SessionPresets.find(
    (preset) => preset.name === sessionPresetName
  )
  const programme_ids = sessionPreset.programmeTypes.map(
    (type) => programmesData[type].id
  )

  const searchParams = new URLSearchParams()
  for (const programme_id of programme_ids) {
    searchParams.append('programme_id', programme_id)
  }

  return `/book-into-a-clinic/?${searchParams.toString()}`
}
