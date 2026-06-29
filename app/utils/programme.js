import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { Programme } from '../models.js'

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
 * @param {boolean} eligibleForMmrv - refer to MMRV rather than MMR?
 * @param {Intl.ListFormatType} conjunctionType - Choice between 'and' and 'or'
 * @param {object} context - the data context where programmes are held
 * @returns {string} the list ready to use in a sentence
 */
export const programmeNamesListForSentence = (
  programme_ids,
  eligibleForMmrv,
  conjunctionType,
  context
) => {
  const programmes = Programme.findAll(context).filter(({ id }) =>
    programme_ids.includes(id)
  )
  const programmeNames = programmes.map((programme) =>
    programme.id === 'mmr' && eligibleForMmrv ? 'MMRV' : programme.name
  )
  return prototypeFilters
    .formatList(programmeNames, conjunctionType)
    .replace('Flu', 'flu')
}
