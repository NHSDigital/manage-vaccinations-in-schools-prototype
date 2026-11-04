import wizard from '@x-govuk/govuk-prototype-wizard'

import { Clinic } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

/**
 * Get (or set up) the copy of a clinic being edited in the wizard
 *
 * @param {import('express').Request} request - Request
 * @param {import('express').Response} response - Response
 * @returns {Clinic} Clinic
 */
const getWizardClinic = (request, response) => {
  const { clinic_id } = request.params
  const { data } = request.session

  data.wizard = data.wizard || {}

  let clinic = Clinic.findOne(String(clinic_id), data.wizard)
  if (!clinic) {
    clinic = Clinic.create(response.locals.clinic, data.wizard)
  }

  return new Clinic(clinic, data)
}

export const clinicController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, clinic_id) {
    const { team_id } = request.params
    const { data } = request.session

    // A new clinic only exists in the wizard until it has been added
    const clinic =
      Clinic.findOne(clinic_id, data) || Clinic.findOne(clinic_id, data.wizard)

    response.locals.clinic = clinic
    response.locals.paths = {
      back: `/teams/${team_id}/clinics`,
      next: `/teams/${team_id}/clinics`
    }

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { team_id } = request.params
    const { data } = request.session

    data.wizard = data.wizard || {}

    const clinic = Clinic.create({ team_id }, data.wizard)

    return saveAndRedirect(request, response, `${clinic.uri}/new/details`)
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
    const { clinic_id, team_id } = request.params
    const { data } = request.session
    const { __ } = response.locals

    // Add clinic using answers given in the wizard
    const clinic = Clinic.create(
      {
        ...data.wizard?.clinics?.[clinic_id],
        team_id
      },
      data
    )

    // Clean up session data
    delete data.clinic
    delete data.wizard?.clinics?.[clinic_id]

    request.flash('success', __(`clinic.new.success`, { clinic }))

    return saveAndRedirect(request, response, `/teams/${team_id}/clinics`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  edit(request, response) {
    response.locals.clinic = getWizardClinic(request, response)

    return response.render('clinic/edit')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { clinic_id } = request.params
    const { data } = request.session
    const { __, paths } = response.locals

    // Update session data with changes made in the wizard
    const clinic = Clinic.update(
      clinic_id,
      data.wizard?.clinics?.[clinic_id] || {},
      data
    )

    // Clean up session data
    delete data.clinic
    delete data.wizard?.clinics?.[clinic_id]

    request.flash('success', __(`clinic.edit.success`, { clinic }))

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { clinic_id, team_id } = request.params
      const { referrer } = /** @type {{ referrer?: string }} */ (request.query)

      const clinic = getWizardClinic(request, response)
      response.locals.clinic = clinic
      response.locals.type = type

      if (type === 'edit') {
        response.locals.paths = {
          back: `${clinic.uri}/edit`,
          next: `${clinic.uri}/edit`
        }

        return next()
      }

      const journey = {
        [`/${clinic_id}/${type}/details`]: {},
        [`/${clinic_id}/${type}/ods-code`]: {},
        [`/${clinic_id}/${type}/careplus-code`]: {},
        [`/${clinic_id}/${type}/clinic-information`]: {},
        ...(clinic.team?.hasSubteams && {
          [`/${clinic_id}/${type}/sub-team`]: {}
        }),
        [`/${clinic_id}/${type}/check-answers`]: {}
      }

      const paths = wizard(journey, request)

      response.locals.paths = {
        ...paths,
        // First question goes back to list of clinics
        back: paths.back || `/teams/${team_id}/clinics`,
        // Change links on check answers page return to it
        ...(referrer && { back: referrer, next: referrer })
      }

      return next()
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { view } = request.params

    return response.render(`clinic/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { clinic_id } = request.params
    const { data } = request.session
    const { paths } = response.locals

    Clinic.update(clinic_id, request.body.clinic, data.wizard)

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
