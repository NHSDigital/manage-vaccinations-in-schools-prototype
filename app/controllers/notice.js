import { Notice } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const noticeController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, notice_uuid) {
    const notice = Notice.findOne(notice_uuid, request.session.data)

    response.locals.notice = notice

    next()
  },

  readAll(request, response, next) {
    response.locals.notices = Notice.findAll(request.session.data).filter(
      ({ archivedAt }) => !archivedAt
    )

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.render('notice/list')
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      response.render('notice/action', { type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  archive(request, response) {
    const { notice_uuid } = request.params
    const { data } = request.session
    const { __, paths } = response.locals

    Notice.archive(notice_uuid, data)

    request.flash('success', __(`notice.archive.success`))

    return saveAndRedirect(request, response, paths.next)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
