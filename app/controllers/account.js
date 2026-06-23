import { saveAndRedirect } from '../utils/redirect.js'

export const accountController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  changeRole(request, response) {
    const { account } = request.app.locals
    const { referrer } = /** @type {{ referrer?: string }} */ (request.query)

    request.session.data.token = {
      ...account,
      ...{ role: request.body.role }
    }

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
    const { account } = request.app.locals

    request.session.data.token = {
      ...account,
      ...{ role: request.query.role }
    }

    return saveAndRedirect(request, response, '/home')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  logout(request, response) {
    // Delete role selected when signing in via CIS2
    delete request.session.data.role

    return saveAndRedirect(request, response, '/start')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
