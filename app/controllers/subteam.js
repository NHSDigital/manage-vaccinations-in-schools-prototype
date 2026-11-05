import wizard from '@x-govuk/govuk-prototype-wizard'

import { Clinic, School, Subteam, Team } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

/**
 * Get (or set up) the copy of a subteam being edited in the wizard
 *
 * @param {import('express').Request} request - Request
 * @param {import('express').Response} response - Response
 * @returns {Subteam} Subteam
 */
const getWizardSubteam = (request, response) => {
  const { subteam_id } = request.params
  const { data } = request.session

  data.wizard = data.wizard || {}

  let subteam = Subteam.findOne(String(subteam_id), data.wizard)
  if (!subteam) {
    subteam = Subteam.create(response.locals.subteam, data.wizard)
  }

  return new Subteam(subteam, data)
}

export const subteamController = {
  /**
   * Get parent team (all subteam routes are nested under a team)
   *
   * @type {RequestHandler<Record<string, string>>}
   */
  readTeam(request, response, next) {
    const { team_id } = request.params
    const { data } = request.session

    const team = Team.findOne(team_id, data)

    if (!team?.canHaveSubteams) {
      return response.redirect(team ? `${team.uri}/contact` : '/')
    }

    response.locals.team = team
    response.locals.paths = {
      back: `${team.uri}/subteams`,
      next: `${team.uri}/subteams`
    }

    next()
  },

  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, subteam_id) {
    const { data } = request.session
    const { team } = response.locals

    // A new subteam only exists in the wizard until it has been added
    const subteam =
      Subteam.findOne(subteam_id, data) ||
      Subteam.findOne(subteam_id, data.wizard)

    if (!subteam || subteam.team_id !== team.id) {
      return response.redirect(`${team.uri}/subteams`)
    }

    response.locals.subteam = subteam

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { data } = request.session
    const { team } = response.locals

    data.wizard = data.wizard || {}

    const subteam = Subteam.create({ team_id: team.id }, data.wizard)

    return saveAndRedirect(request, response, `${subteam.uri}/new/details`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  create(request, response) {
    const { subteam_id } = request.params
    const { data } = request.session
    const { __, team } = response.locals

    // Add subteam using answers given in the wizard
    const subteam = Subteam.create(
      {
        ...data.wizard?.subteams?.[subteam_id],
        team_id: team.id
      },
      data
    )

    // Clean up session data
    delete data.subteam
    delete data.wizard?.subteams?.[subteam_id]

    request.flash('success', __('subteam.new.success', { subteam }))

    return saveAndRedirect(request, response, `${team.uri}/subteams`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  edit(request, response) {
    response.locals.subteam = getWizardSubteam(request, response)

    return response.render('subteam/edit')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { subteam_id } = request.params
    const { data } = request.session
    const { __, paths } = response.locals

    // Update session data with changes made in the wizard
    const subteam = Subteam.update(
      subteam_id,
      data.wizard?.subteams?.[subteam_id] || {},
      data
    )

    // Clean up session data
    delete data.subteam
    delete data.wizard?.subteams?.[subteam_id]

    request.flash('success', __('subteam.edit.success', { subteam }))

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { subteam_id } = request.params
      const { referrer } = /** @type {{ referrer?: string }} */ (request.query)
      const { team } = response.locals

      const subteam = getWizardSubteam(request, response)
      response.locals.subteam = subteam
      response.locals.type = type

      if (type === 'edit') {
        response.locals.paths = {
          back: `${subteam.uri}/edit`,
          next: `${subteam.uri}/edit`
        }

        return next()
      }

      const journey = {
        [`/${subteam_id}/${type}/details`]: {},
        [`/${subteam_id}/${type}/contact-details`]: {},
        [`/${subteam_id}/${type}/check-answers`]: {}
      }

      const paths = wizard(journey, request)

      response.locals.paths = {
        ...paths,
        // First question goes back to list of subteams
        back: paths.back || `${team.uri}/subteams`,
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

    return response.render(`subteam/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { subteam_id } = request.params
    const { data } = request.session
    const { paths } = response.locals

    const { contactDetails, ...updates } = request.body.subteam || {}

    // Using the parent team’s contact details clears any of the subteam’s own
    if (contactDetails === 'team') {
      updates.email = ''
      updates.tel = ''
    }

    Subteam.update(subteam_id, updates, data.wizard)

    // Clean up session data
    delete data.subteam

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @param {string} type - Action type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      return response.render('subteam/action', { type })
    }
  },

  /**
   * Delete subteam, returning its clinics and schools to the parent team
   *
   * @type {RequestHandler<Record<string, string>>}
   */
  delete(request, response) {
    const { data } = request.session
    const { __, paths, subteam } = response.locals

    for (const clinic of subteam.clinics) {
      Clinic.update(clinic.id, { subteam_id: '' }, data)
    }

    for (const school of subteam.schools) {
      School.update(school.id, { subteam_id: '' }, data)
    }

    Subteam.delete(subteam.id, data)

    request.flash('success', __('subteam.delete.success', { subteam }))

    return saveAndRedirect(request, response, paths.next)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
