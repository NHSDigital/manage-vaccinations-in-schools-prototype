import { User } from '../models.js'

export const userController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, user_uid) {
    response.locals.user = User.findOne(user_uid, request.session.data)

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    response.locals.users = User.findAll(request.session.data)

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    return response.render('user/show')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.render('user/list')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
