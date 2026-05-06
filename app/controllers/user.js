import { User } from '../models.js'

export const userController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, user_uid) {
    response.locals.user = User.findOne(user_uid, request.session.data)

    next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readAll(request, response, next) {
    response.locals.users = User.findAll(request.session.data)

    return next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    return response.render('user/show')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  list(request, response) {
    return response.render('user/list')
  }
}
