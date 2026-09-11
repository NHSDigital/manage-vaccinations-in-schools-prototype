import { School } from '../../app/models.js'

import { ScenarioSchoolUrns } from './constants.js'

/**
 * Create the resources shared across multiple scenarios. Runs once, before any individual
 * scenario, so scenarios never depend on each other - only on what's built here.
 *
 * @param {object} context - Context
 * @param {User} nurse - Nurse used throughout `create-data.js`
 * @returns {SharedResources} Shared resources
 */
export function createSharedResources(context, nurse) {
  const grangeHillSecondarySchool = School.findOne(
    ScenarioSchoolUrns.GrangeHillSecondarySchool,
    context
  )

  return { grangeHillSecondarySchool, nurse }
}

/**
 * @import { User } from '../../app/models.js'
 * @import { SharedResources } from './types.js'
 */
