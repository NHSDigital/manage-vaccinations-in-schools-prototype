import { ResearchSessionPurpose } from '../../app/enums.js'

/**
 * User research sessions and walkthroughs, keyed by a URL-friendly tag
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
  'psds-and-vgd': {
    title: 'PSDs and VGDs demo',
    purpose: ResearchSessionPurpose.Walkthrough,
    description:
      'A walkthrough of how teams set up vaccine group directions (VGDs) and patient specific directions (PSDs) for a session, and how those settings change triage and vaccination recording. Run `npm run create-data` on the day, as some sessions are dated today.',
    startDate: '2026-12-01'
  },
  'consent-expiry': {
    title: 'Expiring consent in Mavis',
    purpose: ResearchSessionPurpose.UserResearch,
    description:
      'We’re carrying out research to test how consent and refusal expiry has been designed in Mavis. We want to understand whether the proposed functionality meets your team’s needs, is clear and easy to use, and supports your clinical and operational processes.',
    startDate: '2026-11-16',
    fixedLinks: [
      {
        label:
          '[Part 3: Session configuration] Scenario 8: setting up consent requests for a school session',
        href: '/sessions'
      }
    ]
  }
}

/**
 * @typedef {object} ResearchSession
 * @property {string} title - Participant-facing title of the research session
 * @property {ResearchSessionPurpose} purpose - Whether the session is for user
 *   research or for walking people through a feature, such as in a demo
 * @property {string} description - Participant-facing description
 * @property {string} startDate - When the research or walkthrough starts, as
 *   `YYYY-MM-DD`
 * @property {Array<{label: string, href: string}>} [fixedLinks] - Links to
 *   pages that don’t come from a scenario, shown alongside the tagged links
 */
