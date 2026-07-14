import prototypeFilters from '@x-govuk/govuk-prototype-filters'
import i18n from 'i18n'

import { healthQuestions } from '../datasets/health-questions.js'

import { ordinal } from './number.js'

/**
 * kebab-case to camelCase
 *
 * @param {string} string - String to convert
 * @returns {string} camelCase string
 */
export function kebabToCamelCase(string) {
  return string
    .replace(/(^\w|-\w)/g, (match) => match.replace(/-/, '').toUpperCase())
    .replace(/^./, (match) => match.toLowerCase())
}

/**
 * camelCase to kebab-case
 *
 * @param {string} string - String to convert
 * @returns {string} kebab-case string
 */
export function camelToKebabCase(string) {
  return string.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

/**
 * Convert string to boolean
 *
 * @template {string|boolean} T
 * @param {T|Array<T>} value - Value to test
 * @returns {boolean} Boolean
 */
export function stringToBoolean(value) {
  // Ensure single checkbox returns boolean not an array with _unchecked
  if (Array.isArray(value)) {
    value = value.filter((item) => item !== '_unchecked')[0]
  }

  return typeof value === 'string' ? value === 'true' : value
}

/**
 * Convert string to array
 *
 * @param {string|Array|undefined} value - Value to test
 * @returns {Array} Array
 */
export function stringToArray(value) {
  if (value === undefined) {
    return []
  }

  if (Array.isArray(value)) {
    return value.includes('_unchecked')
      ? value.filter((item) => item !== '_unchecked')
      : value
  }

  return [value].filter((item) => item !== '_unchecked')
}

/**
 * Format highlight
 *
 * @param {object} healthAnswer - Health answer
 * @param {string} healthAnswer.answer - Yes/No
 * @param {string} healthAnswer.details - Details for yes answer
 * @param {string} [healthAnswer.relationship] - Relationship of respondent
 * @returns {string|Promise<string>} Formatted HTML
 */
export function formatHealthAnswer({ answer = 'No', details, relationship }) {
  let html = relationship
    ? prototypeFilters.govukMarkdown(
        [relationship, answer].join(' responded: ')
      )
    : prototypeFilters.govukMarkdown(answer)

  if (answer === 'Yes' && details) {
    html += `\n<blockquote>${String(prototypeFilters.govukMarkdown(details)).replaceAll('govuk-', 'nhsuk-')}</blockquote>`
  }

  return html
}

/**
 * Format highlight
 *
 * @param {string|number} string - String
 * @returns {string|undefined} Formatted HTML
 */
export function formatHighlight(string) {
  if (!string) return

  return `<mark class="app-highlight">${string}</mark>`
}

/**
 * Format link
 *
 * @param {string} href - Hyperlink reference
 * @param {string} text - Hyperlink text
 * @param {object} [attributes] - Hyperlink attributes
 * @returns {string} HTML anchor decorated with nhsuk-link class
 */
export function formatLink(href, text, attributes = {}) {
  const attrs = []

  const classes = [
    'nhsuk-link',
    ...(attributes.classes ? [attributes.classes] : [])
  ].join(' ')

  delete attributes.classes

  for (const [key, value] of Object.entries(attributes)) {
    if (value === true || value === 'true') {
      attrs.push(key)
    } else if (value !== undefined || value !== null || value !== false) {
      attrs.push(`${key}="${value}"`)
    }
  }

  return `<a class="${classes}" href="${href}"${attrs.join(' ')}>${text}</a>`
}

/**
 * Format link with optional secondary text
 *
 * @param {string} href - Hyperlink reference
 * @param {string} text - Hyperlink text
 * @param {string} [secondary] - Secondary text
 * @returns {string} Formatted HTML
 */
export function formatLinkWithSecondaryText(href, text, secondary) {
  let html = text

  if (href) {
    html = formatLink(href, text)
  }

  if (secondary) {
    html += '<br>'
    html += formatSecondaryText(secondary)
  }

  return `<span>${html}</span>`
}

/**
 * Format text with optional secondary text
 *
 * @param {string} text - Primary text
 * @param {string} [secondary] - Secondary text
 * @param {boolean} [hasLineBreak] - Whether to add a line break before secondary text
 * @returns {string} Formatted HTML
 */
export function formatWithSecondaryText(text, secondary, hasLineBreak = true) {
  let html = text

  if (secondary) {
    html += hasLineBreak ? '<br>' : ''
    html += formatSecondaryText(secondary)
  }

  return `<span>${html}</span>`
}

/**
 * Format text as secondary text
 *
 * @param {string} [secondary] - Secondary text
 * @returns {string} Formatted HTML
 */
export function formatSecondaryText(secondary) {
  return `<span class="nhsuk-u-secondary-text-colour nhsuk-u-font-size-16">${secondary}</span>`
}

/**
 * Format tag
 *
 * @param {object} options - Tag options
 * @param {string} [options.text] - Text
 * @param {string} [options.html] - Text
 * @param {string} [options.colour] - Colour
 * @param {string} [options.classes] - Classes
 * @returns {string} Formatted HTML
 */
export function formatTag({ text, html, colour, classes }) {
  text = html || text

  const classAttr = classes ? classes.split(' ') : []

  if (colour && colour === 'transparent') {
    classAttr.push('app-tag--transparent')
  } else if (colour) {
    classAttr.push(`nhsuk-tag--${colour}`)
  }

  classAttr.unshift('nhsuk-tag')

  if (colour) {
    return `<strong class="${classAttr.join(' ')}">${text}</strong>`
  }

  return `<strong class="${classes}">${text}</strong>`
}

export function formatProgrammeStatus(programme, status, note) {
  let html = formatTag({
    classes: 'app-tag--attached',
    text: programme.name,
    colour: 'transparent'
  })

  if (status) {
    html += formatTag(status)
  }

  if (note) {
    html += `<span class="nhsuk-u-secondary-text-colour">${note}</span>`
  }

  return html
}

export function formatHealthQuestions(questions) {
  const items = Object.entries(questions).map(([key, question]) => {
    if (!question.conditional) {
      return `- ${healthQuestions[key].label}`
    }

    const subList = Object.keys(question.conditional)
      .map((conditionalKey) => `  - ${healthQuestions[conditionalKey].label}`)
      .join('\n')
    return `- ${healthQuestions[key].label}\n${subList}`
  })

  return formatMarkdown(items.join('\n'))
}

/**
 * Format array as HTML list
 *
 * @param {Array<string>} array - Array
 * @returns {string|undefined} HTML unordered list with nhsuk-* classes
 */
export function formatList(array) {
  if (!Array.isArray(array)) {
    return array
  }

  // Only use list if more than one item in array
  if (array.length === 1) {
    return formatMarkdown(array[0])
  } else if (array.length > 1) {
    const list = array.map((item) => `- ${item}`)
    return formatMarkdown(list.join('\n'))
  }

  return ''
}

/**
 * Format markdown
 *
 * @param {string} string - Markdown
 * @param {string} headingsStartWith - Initial heading size
 * @returns {string|undefined} HTML decorated with nhsuk-* classes
 */
export function formatMarkdown(string, headingsStartWith = 'l') {
  if (!string) return

  const markdown = prototypeFilters.govukMarkdown(string, {
    headingsStartWith
  })
  const nhsukMarkdown = String(markdown)
    .replaceAll('govuk-', 'nhsuk-')
    .replaceAll('-!-', '-u-')

  return nhsukMarkdown
}

/**
 * Format millilitres
 *
 * @param {string|number} string - Amount
 * @returns {string|undefined} Formatted string
 */
export function formatMillilitres(string) {
  if (!string) return

  return `${string} ml`
}

/**
 * Format with code styling
 *
 * @param {string|number} string - String
 * @param {boolean} [shouldNoWrap] - Prevent wrapping
 * @returns {string|undefined} Formatted HTML
 */
export function formatCode(string, shouldNoWrap = false) {
  if (!string) return

  const classes = ['nhsuk-u-font-code']

  if (shouldNoWrap) {
    classes.push('nhsuk-u-nowrap')
  }

  return `<span class="${classes.join(' ')}">${string}</span>`
}

/**
 * Format NHS number
 * Replace each space in number with a non-breaking space and zero-width word
 * joiner to prevent telephone format detection
 *
 * @param {string} string - String
 * @param {boolean} isInvalid - Is invalid record
 * @returns {string|undefined|null} Formatted HTML
 */
export function formatNhsNumber(string, isInvalid) {
  if (!string) return

  // Patients without an NHS number have a 10 character alphanumeric UID
  const isNhsNumber = string.match(/^\d{10}$/)

  if (isNhsNumber) {
    string = string.toString().replaceAll(/(\d{3})(\d{3})(\d{4})/g, '$1 $2 $3')

    if (isInvalid) {
      string = `<s>${string}</s>`
    }

    return formatCode(string, true)
  }

  return null
}

/**
 * Format contact name with optional display of contact details
 *
 * @param {Contact} contact - Contact
 * @param {boolean} [shouldIncludeContactDetails] - Include contact details
 * @returns {string|undefined} Formatted contact HTML
 */
export function formatContact(contact, shouldIncludeContactDetails = true) {
  if (!contact) return

  let string = contact.fullName || 'Parent or guardian'

  // Add relationship, if provided
  if (contact.fullName !== undefined && contact.relationship) {
    string += ` (${lowerCaseFirst(contact.relationship)})`
  }

  // Add telephone number, if provided
  if (shouldIncludeContactDetails && contact.tel) {
    string += `<br><span class="nhsuk-u-secondary-text-colour">${contact.tel}</span>`
  }

  // Add email address, if provided
  if (shouldIncludeContactDetails && contact.email) {
    string += `<br><span class="nhsuk-u-secondary-text-colour">${contact.email}</span>`
  }

  return string
}

/**
 * Format progress
 *
 * @param {number} number - Progress
 * @returns {string|undefined} Formatted progress HTML
 */
export function formatProgress(number) {
  if (!number) return

  return `<progress class="app-progress" value="${number}" max="100"></progress><br><span class="nhsuk-u-secondary-text-colour nhsuk-u-font-size-16">Processing: ${number}% complete</span>`
}

/**
 * Format identifier
 *
 * @param {object} identifiedBy - Identifier
 * @returns {string|undefined} Formatted identifier HTML
 */
export function formatIdentifier(identifiedBy) {
  if (!identifiedBy) return

  let string = identifiedBy.name

  // Add relationship, if provided
  if (identifiedBy.name !== undefined && identifiedBy.relationship) {
    string += ` (${identifiedBy.relationship})`
  }

  return string
}

/**
 * Format parental relationship, falling back to name else unknown
 *
 * @param {Contact} contact - Contact
 * @returns {string|undefined} Formatted parental relationship HTML
 */
export function formatParentalRelationship(contact) {
  if (!contact) return

  return contact.relationship || contact.fullName || 'Name unknown'
}

/**
 * Format dose sequence
 *
 * @param {string} sequence - Dose sequence
 * @returns {string|undefined} Formatted dose sequence
 */
export function formatSequence(sequence) {
  if (!sequence) return

  const number = Number(sequence.charAt(0))
  const identifier = sequence.charAt(1)

  if (identifier === 'B') {
    return `${ordinal(number)} booster dose`
  }

  return `${ordinal(number)} primary dose`
}

/**
 * Append other value, if one is provided
 *
 * @param {string} other - Other option name (typically ‘Other’)
 * @param {string} string - Other value
 * @returns {string|undefined} Full other value
 */
export function formatOther(other, string) {
  if (!other) return

  return other ? [string, other].join(' – ') : string
}

/**
 * Format vaccine criteria
 *
 * @param {string} string - String
 * @returns {string|undefined} Formatted HTML
 */
export function formatVaccineCriteria(string) {
  if (!string) return

  return `<span class="app-vaccine-criteria" data-value="${string}">${string}</span>`
}

/**
 * Format year group
 *
 * @param {number} yearGroup - Year group
 * @returns {string} Formatted year group
 */
export function formatYearGroup(yearGroup) {
  switch (true) {
    case yearGroup === 0:
      return 'Reception'
    case yearGroup < 0:
      return 'Nursery'
    default:
      return `Year ${yearGroup}`
  }
}

/**
 * Format year groups
 *
 * @param {Array<number>} yearGroups - Year groups
 * @returns {string} Formatted year groups
 */
export function formatYearGroups(yearGroups) {
  // Single year group
  if (yearGroups.length === 1) {
    return formatYearGroup(yearGroups[0])
  }

  // Check if all year groups are consecutive
  const isConsecutive = yearGroups.every(
    (year, i) => i === 0 || year - yearGroups[i - 1] === 1
  )

  // If consecutive year groups, use range format
  if (isConsecutive) {
    const first = formatYearGroup(yearGroups[0])
    const last = formatYearGroup(yearGroups.at(-1))

    return yearGroups.length === 2
      ? `${first} and ${last}`
      : `${first} to ${last}`
  }

  // Non-consecutive: list them all out
  const hasReception = yearGroups.includes(0)
  const regularYears = yearGroups.filter((y) => y !== 0)

  // Has reception year
  if (hasReception) {
    return regularYears.length === 1
      ? `Reception and year ${regularYears[0]}`
      : `Reception and years ${prototypeFilters.formatList(regularYears.map(String))}`
  }

  return `Years ${prototypeFilters.formatList(regularYears.map(String))}`
}

/**
 * Lower case first letter
 *
 * @param {string} string - String to change
 * @returns {string} String with lower cased first letter
 */
export function lowerCaseFirst(string) {
  return string.charAt(0).toLowerCase() + string.slice(1)
}

/**
 * Format a child's name in a manner suitable for the given audience
 *
 * @param {string} firstName - the person's first name
 * @param {string} lastName - the person's last name
 * @param {boolean} isParentFacing - true to format naturally for parents, or false to put surname first for SAIS teams
 * @returns {string} - the formatted name
 */
export function formatFullName(firstName, lastName, isParentFacing = false) {
  if (!firstName || !lastName) return ''

  return isParentFacing
    ? [firstName, lastName].join(' ')
    : [lastName.toUpperCase(), firstName].join(', ')
}

/**
 * Get programme names that can be used in a sentence
 *
 * @param {string} string - String to change
 * @returns {string|undefined} Sentence cased programme names
 */
export function sentenceCaseProgrammeName(string) {
  if (!string) return

  return string
    .replaceAll('Children', 'children') // Children’s flu vaccine
    .replaceAll('Flu', 'flu') // Flu vaccination
    .replaceAll('Human', 'human') // Human papillomavirus
}

/**
 * Format a given hour number from the 24-hour clock as am/pm
 *
 * @example
 * // returns 9am
 * formatHour(9)
 * @example
 * // returns 12pm
 * formatHour(12)
 * @example
 * // returns 3pm
 * formatHour(15)
 * @param {number} hour - the hour as a number from the 24-hour clock
 * @returns {string} the hour, formatted with a trailing am or pm e.g.
 */
export function formatHour(hour) {
  const hourText = hour < 13 ? String(hour) : String(hour - 12)
  const amPm = hour < 12 ? 'am' : 'pm'

  return `${hourText}${amPm}`
}

/**
 * Format the time in a date using the 12-hour clock and an am/pm suffix
 *
 * @param {Date} date - the date containing the time we want to format
 * @param {boolean} isHour12 - use the 12 hour clock and am/pm?
 * @returns {string} the time formatted according to the hour12 parameter
 */
export function formatTime(date, isHour12 = true) {
  const locale = i18n.getLocale()

  if (!isHour12) {
    return date.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    })
  }

  // NHS style: lowercase am/pm with no space, full stop between hours and
  // minutes, omit :00, and use midday/midnight for noon/midnight.
  const hours = date.getHours()
  const minutes = date.getMinutes()

  if (minutes === 0) {
    if (hours === 0) return 'midnight'
    if (hours === 12) return 'midday'
  }

  const period = hours < 12 ? 'am' : 'pm'
  const hours12 = hours % 12 || 12
  return minutes === 0
    ? `${hours12}${period}`
    : `${hours12}.${minutes.toString().padStart(2, '0')}${period}`
}

/**
 * @import { Contact } from '../models.js'
 */
