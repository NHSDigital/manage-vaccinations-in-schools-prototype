import { UserRole } from '../enums.js'
import { Notice } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const homeController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  redirect(request, response) {
    const { account } = request.app.locals

    if (account.role === UserRole.DataConsumer) {
      return saveAndRedirect(request, response, '/reports')
    }

    return saveAndRedirect(request, response, '/dashboard')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  dashboard(request, response) {
    const { account } = request.app.locals
    const { data } = request.session

    if (account.role === UserRole.Nurse) {
      response.locals.notices = Notice.findAll(data).filter(
        ({ archivedAt }) => !archivedAt
      )
    }

    return response.render('dashboard')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  start(request, response) {
    return response.render('start')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
