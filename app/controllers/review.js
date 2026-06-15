export const reviewController = {
  /**
   * @type {RequestHandler}
   */
  list(request, response) {
    return response.redirect('/notices')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
