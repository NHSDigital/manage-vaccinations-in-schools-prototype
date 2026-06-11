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

    return response.redirect(referrer || '/home')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  cis2(request, response) {
    return response.redirect('/account/change-role')
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

    return response.redirect('/home')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  logout(request, response) {
    // Delete role selected when signing in via CIS2
    delete request.session.data.role

    return response.redirect('/start')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
