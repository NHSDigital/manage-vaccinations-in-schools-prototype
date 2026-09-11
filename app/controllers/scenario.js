import { Scenario } from '../models.js'

export const scenarioController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    response.locals.scenarios = Scenario.findAll(request.session.data)

    return response.render('scenario/list')
  }
}
