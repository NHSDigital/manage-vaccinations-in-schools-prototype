import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { Programme } from '../models.js'

import { today } from './date.js'

/**
 * @readonly
 * @enum {Intl.ListFormatType}
 */
export const ConjunctionType = {
  and: /** @type {Intl.ListFormatType} */ ('conjunction'),
  or: /** @type {Intl.ListFormatType} */ ('disjunction')
}

/**
 * Get a comma-delimited list of programme names to use in a sentence
 *
 * @param {Array<string>} programme_ids - the IDs of programmes whose name will form the list
 * @param {boolean} isEligibleForMmrv - refer to MMRV rather than MMR?
 * @param {Intl.ListFormatType} conjunctionType - Choice between 'and' and 'or'
 * @param {object} context - the data context where programmes are held
 * @returns {string} the list ready to use in a sentence
 */
export const programmeNamesListForSentence = (
  programme_ids,
  isEligibleForMmrv,
  conjunctionType,
  context
) => {
  const programmes = Programme.findAll(context).filter(({ id }) =>
    programme_ids.includes(id)
  )
  const programmeNames = programmes.map((programme) =>
    programme.id === 'mmr' && isEligibleForMmrv ? 'MMRV' : programme.name
  )
  return prototypeFilters
    .formatList(programmeNames, conjunctionType)
    .replace('Flu', 'flu')
}

/**
 * Can a clinic appointment for the given programmes be served (even partly) at a community pharmacy?
 *
 * @param {Array<string>} programme_ids - the vaccinations wanted for a clinic appointment
 * @param {object} context - the data context where programmes are held
 * @returns {boolean} - True if the child can be vaccinated at a community pharmacy, or false otherwise
 */
export const isPharmacyVaccinationAvailable = (programme_ids, context) => {
  // Only flu can be given at community pharmacies
  if (!programme_ids.includes('flu')) {
    return false
  }

  // Community pharmacies for flu begin here:
  const date = today()
  if (date < new Date('2026-12-01')) {
    return false
  }

  // TEMP: hard-code the first end date for community pharmacy flu vaccinations
  if (date > new Date('2027-03-31')) {
    return false
  }

  // TODO: add knowledge of seasons/terms for different programmes in
  // dataset/programmes.js and carry across to `Programme` model
  context

  // Must be in the current season
  // const academicYear = getCurrentAcademicYear()
  // const programme = Programme.findOne('flu', context)
  // if (
  //   date < programme.seasonStartDate(academicYear) ||
  //   date > programme.seasonEndDate(academicYear)
  // ) {
  //   return false
  // }

  return true
}
