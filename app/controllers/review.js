import { saveAndRedirect } from '../utils/redirect.js'

export const reviewController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return saveAndRedirect(request, response, '/notices')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
