/**
 * User research sessions, keyed by a URL-friendly tag
 *
 * Links created by scenarios (see `lib/scenarios/`) can be tagged for use in
 * any of these sessions. Each session gets a page listing its tagged links,
 * which researchers can share with participants.
 *
 * The title and description are shown to participants, so should not hint at
 * what the research is looking for.
 *
 * @type {Record<string, ResearchSession>}
 */
export default {
  'consent-expiry': {
    title: 'Checking children’s consent before a session',
    description:
      'Use these examples to carry out the tasks your researcher gives you.',
    startDate: '2026-11-16'
  }
}

/**
 * @typedef {object} ResearchSession
 * @property {string} title - Participant-facing title of the research session
 * @property {string} description - Participant-facing description
 * @property {string} startDate - When the research starts, as `YYYY-MM-DD`
 */
