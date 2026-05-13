import programmesData from '../datasets/programmes.js'
import { SessionPresets } from '../enums.js'

/**
 * Generate a URL for booking into a clinic whose primary programme is given by the session preset
 *
 * @param {Array<string>} sessionPresetNames - the programmes for which the child has been invited to clinic
 * @returns {string} - path to the start of the clinic booking journey for the given programme
 */
export const getClinicInviteUrl = (sessionPresetNames) => {
  const sessionPresets = SessionPresets.filter((preset) =>
    sessionPresetNames.includes(preset.name)
  )
  const programme_ids = sessionPresets.flatMap((preset) =>
    preset.programmeTypes.map((type) => programmesData[type].id)
  )

  const searchParams = new URLSearchParams()
  for (const programme_id of programme_ids) {
    searchParams.append('programme_id', programme_id)
  }

  return `/book-into-a-clinic/?${searchParams.toString()}`
}
