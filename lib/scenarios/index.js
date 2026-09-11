import _ from 'lodash'

import { createSharedResources } from './shared-resources.js'

// The explicit list of scenarios to run. Order doesn't matter - each scenario only ever reads
// `shared`, never another scenario's output - so they can be added, removed or reordered freely
const scenarios = []

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

  console.info(`Created ${scenarios.length} scenario(s):`)
  for (const scenario of scenarios) {
    console.info(`  - ${scenario.name}`)
  }
}

/**
 * @import { User } from '../../app/models.js'
 */
