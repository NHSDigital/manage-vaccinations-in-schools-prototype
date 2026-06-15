import { Vaccine } from '../models.js'

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
   * @type {RequestHandler}
   */
  readAll(request, response, next) {
    response.locals.vaccines = Vaccine.findAll(request.session.data)

    return next()
  },

  /**
   * @type {RequestHandler}
   */
  show(request, response) {
    return response.render('vaccine/show')
  },

  /**
   * @type {RequestHandler}
   */
  list(request, response) {
    return response.render('vaccine/list')
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler} - Request handler
   */
  action(type) {
    return (request, response) => {
      response.render('vaccine/action', { type })
    }
  },

  /**
   * @type {RequestHandler}
   */
  delete(request, response) {
    const { vaccine_snomed } = request.params
    const { data } = request.session
    const { __ } = response.locals

    Vaccine.delete(vaccine_snomed, data)

    request.flash('success', __(`vaccine.delete.success`))

    return response.redirect('/vaccines')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
