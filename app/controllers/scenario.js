import { Scenario } from '../models.js'

export const scenarioController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    const { data } = request.session

    response.locals.scenarios = Scenario.findAll(data)

    return response.render('scenario/list')
  }
}

/**
 * @import { RequestHandler } from 'express'
 */
