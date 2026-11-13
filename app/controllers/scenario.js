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
  listResearchSessions(request, response) {
    // Latest first. ISO dates (YYYY-MM-DD) sort correctly as text
    response.locals.researchSessions = Object.entries(researchSessions)
      .map(([tag, researchSession]) => ({ tag, ...researchSession }))
      .sort((a, b) => b.startDate.localeCompare(a.startDate))

    return response.render('scenario/research-sessions')
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
    response.locals.taskLinkGroups = groupResearchSessionLinks(
      getResearchSessionLinks(Scenario.findAll(data), tag, researchSession)
    )

    return response.render('scenario/research-session')
  }
}

/**
 * Get the links tagged for a research session from across all scenarios,
 * using any link text set for that session, plus the session’s own fixed
 * links (if any)
 *
 * @param {Array<Scenario>} scenarios - All scenarios
 * @param {string} tag - Research session tag
 * @param {ResearchSession} researchSession - Research session
 * @returns {Array<{label: string, href: string}>} Links for the research session
 */
function getResearchSessionLinks(scenarios, tag, researchSession) {
  const links = [...(researchSession.fixedLinks || [])]

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

  return links
}

/**
 * Group a research session’s links under the headings given in their text.
 *
 * A link’s text can start with a heading in square brackets, for example
 * “[Part 1: Warm-up scenarios] Scenario 1: checking a child’s consent”.
 * Links without a heading come first, then each heading in order of its
 * name. Links within each group are in order of their text, without the
 * heading.
 *
 * Sorting is numeric-aware, so “Task 2” comes before “Task 10”
 *
 * @param {Array<{label: string, href: string}>} links - Research session links
 * @returns {Array<{heading?: string, links: Array<{label: string, href: string}>}>}
 *   Groups of links
 */
function groupResearchSessionLinks(links) {
  const linksByHeading = new Map()

  for (const { label, href } of links) {
    const headingMatch = label.match(/^\[([^\]]+)\]\s*(.*)$/)
    const heading = headingMatch ? headingMatch[1].trim() : ''
    const labelWithoutHeading = headingMatch ? headingMatch[2] : label

    if (!linksByHeading.has(heading)) {
      linksByHeading.set(heading, [])
    }
    linksByHeading.get(heading).push({ label: labelWithoutHeading, href })
  }

  // Keep task and heading numbers in text in numerical order
  const compareText = (a, b) => {
    return a.localeCompare(b, undefined, { numeric: true })
  }

  return [...linksByHeading.keys()].sort(compareText).map((heading) => ({
    heading: heading || undefined,
    links: linksByHeading
      .get(heading)
      .sort((a, b) => compareText(a.label, b.label))
  }))
}

/**
 * @import { RequestHandler } from 'express'
 * @import { ResearchSession } from '../../lib/scenarios/research-sessions.js'
 */
