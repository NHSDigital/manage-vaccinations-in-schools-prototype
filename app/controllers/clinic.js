import { Clinic } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const clinicController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, clinic_id) {
    const clinic = Clinic.findOne(clinic_id, request.session.data)

    response.locals.clinic = clinic
    response.locals.paths = {
      back: `${clinic.team.uri}/clinics`,
      next: `${clinic.team.uri}/clinics`
    }

    next()
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  form(type) {
    return (request, response) => {
      response.render('clinic/form', { type })
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      response.render('clinic/action', { type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  create(request, response) {
    const { team_id } = request.params
    const { data } = request.session
    const { __ } = response.locals

    const clinic = Clinic.create(
      {
        ...request.body.clinic,
        team_id
      },
      data
    )

    request.flash('success', __(`clinic.new.success`, { clinic }))

    return saveAndRedirect(request, response, `${clinic.team.uri}/clinics`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { clinic_id } = request.params
    const { data } = request.session
    const { __, paths } = response.locals

    // Clean up session data
    delete data.clinic

    // Update session data
    const clinic = Clinic.update(clinic_id, request.body.clinic, data)

    request.flash('success', __(`clinic.edit.success`, { clinic }))

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  delete(request, response) {
    const { clinic_id } = request.params
    const { data } = request.session
    const { __, paths } = response.locals

    Clinic.delete(clinic_id, data)

    request.flash('success', __(`clinic.delete.success`))

    return saveAndRedirect(request, response, paths.next)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
