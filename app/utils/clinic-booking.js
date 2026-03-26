import { SessionPresets } from '../enums.js'

/**
 * Generate a URL for booking into a clinic whose primary programme is given by the session preset
 *
 * @param {string} sessionPresetName - the primary programme for the clinic
 * @returns {string} - path to the start of the clinic booking journey for the given programme
 */
export const getClinicBookingUrl = (sessionPresetName) => {
  const sessionPreset = SessionPresets.find(
    (preset) => preset.name === sessionPresetName
  )
  return `/book-into-a-clinic/${sessionPreset.slug}`
}
