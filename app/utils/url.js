/**
 * Rebuild query string from a `request.query` object
 *
 * @param {ParsedQs} query - Request query
 * @returns {string} Rebuilt query string
 */
export function formatQueryString(query) {
  if (!query) {
    return ''
  }

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    ;[value]
      .flat()
      .filter((value) => typeof value === 'string')
      .forEach((value) => params.append(key, value))
  }

  const queryString = params.toString()

  return queryString ? `?${queryString}` : ''
}

/**
 * Get URL search parameters for multiple filter queries
 *
 * @param {Request} request - Request
 * @param {string[]} radioKeys - Key names for radios (select multiple)
 * @param {string[]} checkboxKeys - Key names checkboxes (select one)
 * @returns {URLSearchParams} URL search parameters
 */
export function getFilterParams(request, radioKeys = [], checkboxKeys = []) {
  const params = new URLSearchParams()

  for (const key of radioKeys) {
    const value = request.body[key]
    if (value) params.append(key, value)
  }

  for (const key of checkboxKeys) {
    const values = [request.body[key]]
      .flat()
      .filter((value) => value && value !== '_unchecked')
    values.forEach((value) => params.append(key, value))
  }

  return params
}

/**
 * @import { Request } from 'express'
 * @import { ParsedQs } from 'qs'
 */
