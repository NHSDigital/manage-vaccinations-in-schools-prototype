import { UserRole } from '../enums.js'
import { User } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const accountController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  changeRole(request, response) {
    const { role } = request.body.account
    const { referrer } = /** @type {{ referrer?: string }} */ (request.query)

    // Update account role
    response.locals.account.role = role || UserRole.Nurse

    // Update session token
    // Drop the `context` to prevent circular dependency
    const { context, ...token } = response.locals.account
    request.session.data.token = token

    return saveAndRedirect(request, response, referrer || '/home')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  cis2(request, response) {
    return saveAndRedirect(request, response, '/account/change-role')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  dfeSignIn(request, response) {
    const { data } = request.session

    // Update session token (get pre-defined user with school secretary role)
    request.session.data.token = User.findAll(data).find(
      (user) => user.role === UserRole.SchoolSecretary
    )

    return saveAndRedirect(request, response, '/home')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  login(request, response) {
    const { data } = request.session
    const { uid } = /** @type {{ uid?: string }} */ (request.query)

    // Update session token (get pre-defined user with UID)
    request.session.data.token = User.findOne(uid, data)

    return saveAndRedirect(request, response, '/home')
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
 * @import { RequestHandler } from 'express'
 */
