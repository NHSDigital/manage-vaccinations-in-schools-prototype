/**
 * Rebuild the querystring from a request.query object
 *
 * @param {object} query - the request.query object
 * @returns {string} - the rebuilt query string
 */
export function queryToQueryString(query) {
  if (!query) {
    return ''
  }

  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (Array.isArray(value)) {
      // Make sure we replicate repeated parameters the way they were originally
      value.forEach((item) => params.append(key, item))
    } else {
      // Otherwise, just set it normally
      params.append(key, value)
    }
  }

  const queryString = params.toString()
  return queryString ? `?${queryString}` : ''
}
