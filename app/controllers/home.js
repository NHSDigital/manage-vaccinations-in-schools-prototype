import { UserRole } from '../enums.js'
import { Notice } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const homeController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  redirect(request, response) {
    const { account } = response.locals

    // School users only have access to uploads section (for now)
    const homepage = account.isSchoolUser ? '/uploads' : '/dashboard'

    return saveAndRedirect(request, response, homepage)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  dashboard(request, response) {
    const { data } = request.session
    const { account } = response.locals

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
