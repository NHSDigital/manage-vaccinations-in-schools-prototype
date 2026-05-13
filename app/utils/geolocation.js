import { LocationSearchType } from '../enums.js'

/**
 * Get the type of location represented by the location search term
 *
 * @param {string} searchTerm - the location that the user entered
 * @returns {LocationSearchType|undefined} the type of value entered by the user
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
