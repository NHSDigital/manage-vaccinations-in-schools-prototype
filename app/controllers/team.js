import { School, Team } from '../models.js'

export const teamController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, team_id) {
    const { view } = request.params
    const { __ } = response.locals

    const team = Team.findOne(team_id, request.session.data)
    response.locals.team = team

    response.locals.navigationItems = [
      'contact',
      'clinics',
      'schools',
      'sessions'
    ].map((item) => ({
      text: __(`team.${item}.title`),
      href: `${team.uri}/${item}`,
      current: view?.includes(item)
    }))

    next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  redirect(request, response) {
    const { team_id } = request.params

    return response.redirect(`${team_id}/contact`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`team/${view}`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readForm(request, response, next) {
    const { view } = request.params
    const { team } = response.locals

    const referrers = {
      contact: `${team.uri}/contact`,
      sessions: `${team.uri}/sessions`,
      password: `${team.uri}/sessions`
    }

    response.locals.paths = {
      back: referrers[view],
      next: referrers[view]
    }

    return next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readSchool(request, response, next) {
    const { school_id } = request.params

    const school = School.findOne(school_id, request.session.data)
    response.locals.school = school

    return next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  showSchool(request, response) {
    return response.render(`team/school`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  showForm(request, response) {
    const view = request.params.view || 'contact'

    return response.render(`team/form/${view}`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  updateForm(request, response) {
    const { team_id } = request.params
    const { data } = request.session
    const { __, paths } = response.locals

    // Clean up session data
    delete data.team

    // Update session data
    Team.update(team_id, request.body.team, data)

    request.flash('success', __(`team.edit.success`))

    return response.redirect(paths.next)
  }
}
