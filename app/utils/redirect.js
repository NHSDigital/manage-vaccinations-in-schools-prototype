/**
 * Fully save the session before carrying out the redirect
 *
 * @param {Request} request - the Express request
 * @param {Response} response - the Express response
 * @param {string} nextPath - the path to redirect to
 * @returns {object} value to return from the controller's request handler
 */
export function saveAndRedirect(request, response, nextPath) {
  return request.session.save((error) => {
    if (error) {
      console.error('Session save failed: ', error)
    }
    return response.redirect(nextPath)
  })
}

/**
 * @import { Request, Response } from 'express'
 */
