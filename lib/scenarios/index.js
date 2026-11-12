import _ from 'lodash'

import { PatientSession } from '../../app/models.js'

import clinicBookingsInConsent from './library/clinic-bookings-in-consent.js'
import doublesSessionMixOfChildren from './library/doubles-session-mix-of-children.js'
import dropInClinics from './library/drop-in-clinics.js'
import fluConsentOverSeveralSeasons from './library/flu-consent-over-several-seasons.js'
import fluSessionMixOfChildren from './library/flu-session-mix-of-children.js'
import consentExpiryTestCases from './library/hpv-session-consent-expiry.js'
import hpvSessionMixOfChildren from './library/hpv-session-mix-of-children.js'
import consentRequestsTestCases from './library/hpv-sessions-consent-requests.js'
import { createSharedResources } from './shared-resources.js'

// The explicit list of scenarios to run. Order doesn't matter - each scenario only ever reads
// `shared`, never another scenario's output - so they can be added, removed or reordered freely
const scenarios = [
  consentRequestsTestCases,
  fluConsentOverSeveralSeasons,
  clinicBookingsInConsent,
  consentExpiryTestCases,
  dropInClinics,
  fluSessionMixOfChildren,
  hpvSessionMixOfChildren,
  doublesSessionMixOfChildren
]

/**
 * Create all demo/test scenario data, and record what each one created so we
 * can list them on a scenarios page for easy access.
 *
 * @param {object} context - Context
 * @param {User} nurse - Nurse used throughout `create-data.js`
 */
export function createScenarioData(context, nurse) {
  const shared = createSharedResources(context, nurse)

  context.scenarios = {}

  // Any patient sessions that already exist weren’t created by a scenario
  const existingPatientSessionUuids = new Set(
    PatientSession.findAll(context).map(({ uuid }) => uuid)
  )

  for (const scenario of scenarios) {
    let result
    try {
      result = scenario.run(context, shared) || {}
    } catch (error) {
      throw new Error(`Scenario "${scenario.name}" failed`, { cause: error })
    }

    const id = _.kebabCase(scenario.name)
    context.scenarios[id] = {
      id,
      name: scenario.name,
      description: scenario.description,
      startUrl: result.startUrl,
      links: result.links || []
    }
  }

  sendConsentRequestsAndReminders(
    PatientSession.findAll(context).filter(
      ({ uuid }) => !existingPatientSessionUuids.has(uuid)
    )
  )

  console.info(`Created ${scenarios.length} scenario(s):`)
  for (const scenario of scenarios) {
    console.info(`  - ${scenario.name}`)
  }
}

/**
 * Send consent requests and automatic reminders for children in scenario
 * sessions, as `create-data.js` does for its own sessions
 *
 * This waits until every scenario has run, so all the responses exist.
 * Requests then only go out if consent should be requested for the session,
 * and reminders only go to parents who haven’t responded to the request
 *
 * @param {Array<PatientSession>} patientSessions - Patient sessions created by
 *   scenarios
 */
function sendConsentRequestsAndReminders(patientSessions) {
  for (const patientSession of patientSessions) {
    const { patient, patientProgramme, session } = patientSession

    // Requests go out when the consent window opens
    const shouldRequestConsent =
      session.areConsentRequestsSent &&
      patientProgramme.getConsentRequestNeedsForSession(session)?.shouldRequest
    if (shouldRequestConsent) {
      patient.requestConsent(patientSession)
    }

    patient.remindToGiveConsent(patientSession)
  }
}

/**
 * @import { User } from '../../app/models.js'
 */
