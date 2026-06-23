import { Vaccine } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const vaccineController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, vaccine_snomed) {
    const vaccine = Vaccine.findOne(vaccine_snomed, request.session.data)

    if (!vaccine) {
      return next('route')
    }

    response.locals.vaccine = vaccine
    response.locals.paths = {
      back: '/vaccines',
      next: '/vaccines'
    }

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    response.locals.vaccines = Vaccine.findAll(request.session.data)

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    return response.render('vaccine/show')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.render('vaccine/list')
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      response.render('vaccine/action', { type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  delete(request, response) {
    const { vaccine_snomed } = request.params
    const { data } = request.session
    const { __ } = response.locals

    Vaccine.delete(vaccine_snomed, data)

    request.flash('success', __(`vaccine.delete.success`))

    return saveAndRedirect(request, response, '/vaccines')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
