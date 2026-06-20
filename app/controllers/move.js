import _ from 'lodash'

import { Move } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const moveController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, move_uuid) {
    response.locals.move = Move.findOne(move_uuid, request.session.data)

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    const moves = Move.findAll(request.session.data).filter(
      (move) => !move.ignored
    )

    // Sort
    let results = _.sortBy(moves, 'createdAt')

    response.locals.moves = moves
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    return response.render('move/show')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.render('move/list')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
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

    return saveAndRedirect(request, response, '/moves')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
