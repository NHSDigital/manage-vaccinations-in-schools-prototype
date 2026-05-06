/**
 * Generate results page
 *
 * @param {Array<object>} items - Items to paginate
 * @param {object} query - Query parameters
 * @param {number} [limit] - Limit
 * @returns {object} Results
 */
export function getResults(items, query, limit = 50) {
  const page = parseInt(query.page) || 1
  limit = parseInt(query.limit) || limit

  const count = items.length
  const skip = (page - 1) * limit
  const from = (page - 1) * limit + 1
  let to = from - 1 + limit
  to = to > count ? count : to

  return {
    page: items.slice(skip, skip + limit),
    ...(count > 0 && { to }),
    ...(count > 0 && { from }),
    count
  }
}

/**
 * Generate pagination items
 *
 * @param {Array<object>} items - Items to paginate
 * @param {object} query - Query parameters
 * @param {number} [limit] - Limit
 * @returns {object} Pagination
 */
export function getPagination(items, query, limit = 50) {
  const page = parseInt(query.page) || 1
  limit = parseInt(query.limit) || limit

  const count = items.length
  const totalPages = Math.ceil(count / limit)
  const nextPage = page < totalPages ? page + 1 : false
  const prevPage = page > 0 ? page - 1 : false

  const pageItems = [...Array(totalPages).keys()].map((item) => ({
    current: item + 1 === page,
    href: `?${new URLSearchParams({ ...query, page: item + 1, limit })}`,
    number: item + 1
  }))

  return {
    items: pageItems.length > 1 ? pageItems : false,
    current: page,
    next: nextPage && {
      href: `?${new URLSearchParams({ ...query, page: nextPage, limit })}`
    },
    previous: prevPage && {
      href: `?${new URLSearchParams({ ...query, page: prevPage, limit })}`
    }
  }
}
