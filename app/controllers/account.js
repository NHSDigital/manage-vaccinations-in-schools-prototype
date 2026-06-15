import { UserRole } from '../enums.js'

export const accountController = {
  /**
   * @type {RequestHandler}
   */
  changeRole(request, response) {
    request.session.data.token.role = request.body.role

    return response.redirect(
      /** @type {string} */ (request.query.referrer || '/home')
    )
  },

  /**
   * @type {RequestHandler}
   */
  cis2(request, response) {
    const { data } = request.session

    const user = Object.values(data.users).at(-1)
    user.role = UserRole.Nurse

    request.session.data.token = user

    return response.redirect('/account/change-role')
  },

  /**
   * @type {RequestHandler}
   */
  login(request, response) {
    const { data } = request.session
    const { role } = request.query

    const user = Object.values(data.users).at(-1)
    user.role = role || UserRole.Nurse

    request.session.data.token = user

    return response.redirect('/home')
  },

  /**
   * @type {RequestHandler}
   */
  logout(request, response) {
    delete request.session.data.token

    return response.redirect('/start')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
