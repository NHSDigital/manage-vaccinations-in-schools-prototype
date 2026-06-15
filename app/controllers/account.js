export const accountController = {
  /**
   * @type {RequestHandler}
   */
  changeRole(request, response) {
    const { account } = request.app.locals

    request.session.data.token = {
      ...account,
      ...{ role: request.body.role }
    }

    return response.redirect(
      /** @type {string} */ (request.query.referrer || '/home')
    )
  },

  /**
   * @type {RequestHandler}
   */
  cis2(request, response) {
    return response.redirect('/account/change-role')
  },

  /**
   * @type {RequestHandler}
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
   * @type {RequestHandler}
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
