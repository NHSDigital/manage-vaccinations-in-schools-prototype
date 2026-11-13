import researchSessions from '../../lib/scenarios/research-sessions.js'
import { Scenario } from '../models.js'

export const scenarioController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    const { data } = request.session

    response.locals.scenarios = Scenario.findAll(data)

    return response.render('scenario/list')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showResearchSession(request, response, next) {
    const { tag } = request.params
    const { data } = request.session

    const researchSession = researchSessions[tag]
    if (!researchSession) {
      return next()
    }

    response.locals.researchSession = researchSession
    response.locals.taskLinks = getResearchSessionLinks(
      Scenario.findAll(data),
      tag
    )

    return response.render('scenario/research-session')
  }
}

/**
 * Get the links tagged for a research session from across all scenarios,
 * using any link text set for that session, and sorted by that text.
 *
 * The sort is numeric-aware, so “Task 2” comes before “Task 10”
 *
 * @param {Array<Scenario>} scenarios - All scenarios
 * @param {string} tag - Research session tag
 * @returns {Array<{label: string, href: string}>} Links for the research session
 */
function getResearchSessionLinks(scenarios, tag) {
  const links = []

  for (const scenario of scenarios) {
    for (const link of scenario.links) {
      const researchTag = link.researchTags?.find(
        (researchTag) => researchTag.tag === tag
      )
      if (researchTag) {
        links.push({
          label: researchTag.label || link.label,
          href: link.href
        })
      }
    }
  }

  return links.sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { numeric: true })
  )
}

/**
 * @import { RequestHandler } from 'express'
 */
