import { LocationSearchType } from '../enums.js'

/**
 * Get the type of location represented by location search term
 *
 * @param {string} searchTerm - Location that user entered
 * @returns {LocationSearchType|undefined} Type of value entered by user
 */
export const getLocationSearchType = (searchTerm) => {
  if (!searchTerm) {
    return undefined
  }
  const cleanInput = searchTerm.trim().toUpperCase()

  // Regex for a full UK postcode (e.g., SW1A 1AA or NE12 7ET)
  const fullPostcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/
  if (fullPostcodeRegex.test(cleanInput)) {
    return LocationSearchType.Postcode
  }

  // Regex for a postcode Outcode (e.g., NE12, SW1A, B1)
  const outcodeRegex = /^[A-Z]{1,2}\d[A-Z\d]?$/
  if (outcodeRegex.test(cleanInput)) {
    return LocationSearchType.Outcode
  }

  return LocationSearchType.Place
}

/**
 * Extract the postcode sector from a full UK postcode
 *
 * @param {string} postcode - e.g. "NE1 4DA" or "ne14da"
 * @returns {string|undefined} - e.g. "NE1 4" or undefined if postcode was invalid
 */
export const getPostcodeSector = (postcode) => {
  if (!postcode || typeof postcode !== 'string') return undefined

  // Normalise string: trim extra whitespace and convert to upper case
  const clean = postcode.trim().toUpperCase()

  // Standard UK postcode regex to validate and capture parts:
  // Group 1: Outcode (e.g., SW1A or NE12)
  // Group 2: Sector digit (e.g., 1 or 7)
  const postcodeRegex = /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d)[A-Z]{2}$/

  const match = clean.match(postcodeRegex)

  if (!match) {
    return undefined // Input was not a valid full UK postcode
  }

  const outcode = match[1]
  const sectorDigit = match[2]

  return `${outcode} ${sectorDigit}`
}
