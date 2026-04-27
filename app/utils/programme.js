import { Programme } from '../models.js'

/**
 * @readonly
 * @enum {string}
 */
export const ConjunctionType = {
  and: 'conjunction',
  or: 'disjunction'
}

/**
 * Get a comma-delimited list of programme names to use in a sentence
 *
 * @param {Array<string>} programme_ids - the IDs of programmes whose name will form the list
 * @param {ConjunctionType} conjunctionType - Choice between 'and' and 'or'
 * @param {object} context - the data context where programmes are held
 * @returns {string} the list ready to use in a sentence
 */
export const programmeNamesListForSentence = (
  programme_ids,
  conjunctionType,
  context
) => {
  const formatter = new Intl.ListFormat('en', {
    style: 'long',
    type: conjunctionType
  })
  const programmeNames = formatter.format(
    programme_ids.map((programme_id) =>
      Programme.findOne(programme_id, context)?.name?.replace('Flu', 'flu')
    )
  )

  return programmeNames
}
