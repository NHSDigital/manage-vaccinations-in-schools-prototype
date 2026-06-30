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
    request.session.data.token = response.locals.account

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
    delete request.session.data.token

    return saveAndRedirect(request, response, '/start')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
