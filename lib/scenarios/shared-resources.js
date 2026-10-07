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
  const fluPrimarySchool = School.findOne(
    ScenarioSchoolUrns.FluPrimarySchool,
    context
  )
  const hpvSecondarySchool = School.findOne(
    ScenarioSchoolUrns.HpvSecondarySchool,
    context
  )
  const doublesSecondarySchool = School.findOne(
    ScenarioSchoolUrns.DoublesSecondarySchool,
    context
  )

  return { fluPrimarySchool, hpvSecondarySchool, doublesSecondarySchool, nurse }
}

/**
 * @import { User } from '../../app/models.js'
 * @import { SharedResources } from './types.js'
 */
