/**
 * User research sessions, keyed by a URL-friendly tag
 *
 * Links created by scenarios (see `lib/scenarios/`) can be tagged for use in
 * any of these sessions. Each session gets a page listing its tagged links,
 * along with any fixed links it adds (to pages that no scenario creates),
 * which researchers can share with participants.
 *
 * The title and description are shown to participants, so should not hint at
 * what the research is looking for.
 *
 * @type {Record<string, ResearchSession>}
 */
export default {
  'consent-expiry': {
    title: 'Expiring consent in Mavis',
    description:
      'We’re carrying out research to test how consent and refusal expiry has been designed in Mavis. We want to understand whether the proposed functionality meets your team’s needs, is clear and easy to use, and supports your clinical and operational processes.',
    startDate: '2026-11-16',
    fixedLinks: [
      {
        label:
          '[Part 2: Core scenarios] Scenario 8: setting up consent requests for a school session',
        href: '/sessions'
      }
    ]
  }
}

/**
 * @typedef {object} ResearchSession
 * @property {string} title - Participant-facing title of the research session
 * @property {string} description - Participant-facing description
 * @property {string} startDate - When the research starts, as `YYYY-MM-DD`
 * @property {Array<{label: string, href: string}>} [fixedLinks] - Links to
 *   pages that don’t come from a scenario, shown alongside the tagged links
 */
