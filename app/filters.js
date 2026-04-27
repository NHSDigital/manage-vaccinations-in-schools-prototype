import prototypeFilters from '@x-govuk/govuk-prototype-filters'
import _ from 'lodash'

import { ordinal } from './utils/number.js'
import { queryToQueryString } from './utils/querystring.js'
import {
  formatHighlight,
  formatList,
  formatMarkdown,
  formatYearGroup
} from './utils/string.js'

/**
 * Prototype specific filters for use in Nunjucks templates.
 *
 * @param {object} env - Nunjucks environment
 * @returns {object} Filters
 */
export default (env) => {
  const filters = {}

  /**
   * Remove border from last summary row
   *
   * @param {Array} array - Summary rows
   * @returns {Array|undefined} Summary rows
   */
  filters.removeLastSummaryBorder = function (array) {
    if (array && Array.isArray(array) && array.length > 0) {
      array.at(-1).border = false

      return array
    }
  }

  /**
   * Highlight difference
   *
   * @param {string} a - Value in consent response
   * @param {string} b - Value in patient record
   * @returns {string} Value, wrapped in <mark> if different
   */
  filters.highlightDifference = (a, b) => {
    if (a !== b) {
      return env.filters.safe(formatHighlight(a))
    }

    return a
  }

  filters.highlightQuery = (string, query) => {
    if (!string || !query) return string

    // Escape special regex characters in the query
    const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Match text between tags or at the start/end of the string
    // Uses positive lookahead/lookbehind to ensure we’re not inside a tag
    const regex = /(?<=>|^)([^<]*)(?=<|$)|(?<=>)([^<]*)(?=<)/g

    // Replace only text content inside tags
    return string.replace(regex, (textContent) => {
      if (!textContent) return textContent
      return textContent.replace(
        new RegExp(`(${escapedQuery})`, 'gi'),
        (match) => formatHighlight(match)
      )
    })
  }

  /**
   * Ordinal
   *
   * @param {number} number - Number to get ordinal for
   * @returns {string} Ordinal
   */
  filters.ordinal = (number) => {
    return ordinal(number)
  }

  /**
   * Truncate
   *
   * @param {string} string - String to truncate
   * @param {number} length - When to truncate
   * @returns {string} Truncated string
   */
  filters.truncate = (string, length) => {
    return _.truncate(string, {
      length,
      omission: '…',
      separator: ' '
    })
  }

  /**
   * Format markdown
   *
   * @param {string} string - Markdown
   * @param {string} headingsStartWith - Initial heading size
   * @returns {string} HTML decorated with nhsuk-* typography classes
   */
  filters.nhsukMarkdown = (string, headingsStartWith) => {
    return env.filters.safe(formatMarkdown(string, headingsStartWith))
  }

  /**
   * Format array as HTML list
   *
   * @param {Array} array - Array
   * @returns {string} HTML unordered list with nhsuk-* typography classes
   */
  filters.nhsukList = function (array) {
    return env.filters.safe(formatList(array))
  }

  /**
   * Format year group
   *
   * @param {number} number - Year group
   * @returns {string} Formatted year group
   */
  filters.yearGroup = function (number) {
    return env.filters.safe(formatYearGroup(number))
  }

  /**
   * Remove last element from an array
   *
   * @param {Array} array - Array
   * @returns {Array} Updated array
   */
  filters.pop = (array) => {
    array.pop()

    return array
  }

  /**
   * Push item to array
   *
   * @template T
   * @param {Array} array - Array
   * @param {T} item - Item to push
   * @returns {Array} Updated array
   */
  filters.push = (array, item) => {
    const newArray = [...array]
    newArray.push(_.cloneDeep(item))

    return newArray
  }

  /**
   * Filter array where key has a value
   *
   * @param {Array} array - Array
   * @param {string} key - Key to check
   * @param {string} value - Value to check
   * @returns {Array} Filtered array
   */
  filters.where = (array, key, value) => {
    return array.filter((item) => _.get(item, key) === value)
  }

  /**
   * Filter array where array includes value
   *
   * @param {Array} array - Array
   * @param {string} value - Value to check
   * @returns {boolean} Returns true or false
   */
  filters.includes = (array, value) => {
    return prototypeFilters.arrayOrStringIncludes(array, value)
  }

  /**
   * Remove empty items from array
   *
   * @param {Array} array - Array
   * @returns {Array} Filtered array
   */
  filters.removeEmpty = (array) => {
    return array.filter((item) => item !== '')
  }

  /**
   * Rebuild the querystring from the request.query object
   *
   * @param {object} query - the request.query object
   * @returns {string} - the rebuilt query string
   */
  filters.asQueryString = function (query) {
    return queryToQueryString(query)
  }

  return filters
}
