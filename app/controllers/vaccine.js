import { Vaccine } from '../models.js'

export const vaccineController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, vaccine_snomed) {
    response.locals.vaccine = Vaccine.findOne(
      vaccine_snomed,
      request.session.data
    )

    next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readAll(request, response, next) {
    response.locals.vaccines = Vaccine.findAll(request.session.data)

    return next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    return response.render('vaccine/show')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  list(request, response) {
    return response.render('vaccine/list')
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
   */
  action(type) {
    return (request, response) => {
      response.render('vaccine/action', { type })
    }
  },

  /**
   * @type {import("express").RequestHandler}
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
