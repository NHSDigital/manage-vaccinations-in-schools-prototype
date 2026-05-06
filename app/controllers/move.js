import _ from 'lodash'

import { Move } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const moveController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, move_uuid) {
    response.locals.move = Move.findOne(move_uuid, request.session.data)

    next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readAll(request, response, next) {
    let moves = Move.findAll(request.session.data)

    // Sort
    moves = _.sortBy(moves, 'createdAt')

    response.locals.moves = moves
    response.locals.results = getResults(moves, request.query)
    response.locals.pages = getPagination(moves, request.query)

    return next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    return response.render('move/show')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  list(request, response) {
    return response.render('move/list')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  update(request, response) {
    const { decision } = request.body
    const { data } = request.session
    const { __, move } = response.locals

    // Clean up session data
    delete data.decision

    // Ignore or switch schools
    decision === 'ignore'
      ? move.ignore(move.uuid, data)
      : move.switch(move.uuid, data)

    request.flash('success', __(`move.${decision}.success`, { move }))

    return response.redirect('/moves')
  }
}
