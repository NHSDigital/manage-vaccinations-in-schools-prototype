export const reviewController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.redirect('/notices')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
