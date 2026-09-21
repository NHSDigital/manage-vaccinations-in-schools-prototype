/**
 * Is the URL given as a redirect target safe to use?
 *
 * By default this requires an absolute path on this site - the right check
 * for a value that reached us from outside (a `referrer`/`back` query
 * parameter), since it protects us from redirects to other harmful sites
 * (phishing, malware, etc.) and from click-to-execute attacks that work by
 * putting javascript into the referrer.
 *
 * Pass `allowRelative: true` for a value a controller constructed itself
 * (e.g. `saveAndRedirect`'s `nextPath`, which is sometimes a bare relative
 * path like `"start"` or `"new?slot=1"`, resolved by the browser against
 * the current page's URL).
 *
 * @param {string|undefined} path - the path to redirect to
 * @param {object} [options] - Options
 * @param {boolean} [options.allowRelative] - Allow a bare relative path
 * @returns {boolean} - true if safe, or false otherwise
 */
export function isSafeRedirect(path, { allowRelative = false } = {}) {
  if (typeof path !== 'string' || path.length === 0) {
    return false
  }

  if (allowRelative) {
    return !path.startsWith('//') && !/^[a-z][a-z0-9+.-]*:/i.test(path)
  }

  return path.startsWith('/') && !path.startsWith('//')
}

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
