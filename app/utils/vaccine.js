const MMRV_SNOMEDS = ['45480711000001107', '45525711000001102']

/**
 * Is an MMRV vaccine?
 *
 * @param {string} snomed - SNOMED code
 * @returns {boolean} Is an MMRV vaccine?
 */
export const isMmrvVaccine = (snomed) => {
  return MMRV_SNOMEDS.includes(snomed)
}
