/**
 * Generate range of numbers
 *
 * @param {number} start - First number
 * @param {number} end - Last number
 * @yields {object} Generator
 */
export function* range(start, end) {
  for (let index = start; index <= end; index++) {
    yield index
  }
}

/**
 * Get ordinal from number
 *
 * @param {number} number - Number, e.g. 1
 * @returns {string} Ordinal, e.g. 1st
 */
export function ordinal(number) {
  const rule = new Intl.PluralRules('en-GB', {
    type: 'ordinal'
  }).select(number)

  const suffixes = new Map([
    ['one', 'st'],
    ['two', 'nd'],
    ['few', 'rd'],
    ['other', 'th']
  ])

  return `${number}${suffixes.get(rule)}`
}
