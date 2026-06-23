/**
 * Fully save session before carrying out redirect
 *
 * @param {Request} request - Request
 * @param {Response} response - Response
 * @param {string} nextPath - Path to redirect to
 * @returns {Session & Partial<SessionData>} Value to return from controller’s request handler
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
 * @import { Session, SessionData } from 'express-session'
 */
