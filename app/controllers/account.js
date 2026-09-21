import { UserRole } from '../enums.js'
import { User } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { isSafeRedirect } from '../utils/url.js'

/**
 * Regenerate the session, keeping the session ID unguessable to anyone who
 * held a reference to the pre-sign-in session (session fixation), while
 * preserving session data (which holds the prototype’s in-session dataset,
 * not just user preferences)
 *
 * @param {Request} request - Request
 * @param {() => void} callback - Called once the session has regenerated
 */
function regenerateSession(request, callback) {
  const { data } = request.session

  request.session.regenerate((error) => {
    if (error) {
      console.error('Session regeneration failed: ', error)
    }

    request.session.data = data

    callback()
  })
}

export const accountController = {
  /**
   * Change (to pre-assigned user with) role
   *
   * @type {RequestHandler<Record<string, string>>}
   */
  changeRole(request, response) {
    const { role } = request.body.account
    let { referrer } = /** @type {{ referrer?: string }} */ (request.query)
    const { data } = request.session

    const accountWithRole = User.findAll(data).find(
      (user) => user.role === role
    )

    // Update account role
    response.locals.account = accountWithRole

    // Update session token
    // Drop the `context` to prevent circular dependency
    const { context, ...token } = response.locals.account
    request.session.data.token = token

    // Make sure the referrer's safe and use fallback if necessary
    if (!referrer || !isSafeRedirect(referrer)) {
      referrer = '/home'
    }

    return saveAndRedirect(request, response, referrer)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  cis2(request, response) {
    return regenerateSession(request, () => {
      saveAndRedirect(request, response, '/account/change-role')
    })
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  dfeSignIn(request, response) {
    return regenerateSession(request, () => {
      // Update session token (get pre-defined user with school secretary role)
      request.session.data.token = User.findAll(request.session.data).find(
        (user) => user.role === UserRole.SchoolSecretary
      )

      saveAndRedirect(request, response, '/home')
    })
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  login(request, response) {
    const { uid } = /** @type {{ uid?: string }} */ (request.query)

    return regenerateSession(request, () => {
      // Update session token (get pre-defined user with UID)
      request.session.data.token = User.findOne(uid, request.session.data)

      saveAndRedirect(request, response, '/home')
    })
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  logout(request, response) {
    const { account } = response.locals

    const startPath = account.isSchoolUser ? '/start-schools' : '/start'

    delete request.session.data.token

    return saveAndRedirect(request, response, startPath)
  }
}

/**
 * @import { Request, RequestHandler } from 'express'
 */
