/**
 * Create the resources shared across multiple scenarios. Runs once, before any individual
 * scenario, so scenarios never depend on each other - only on what's built here.
 *
 * @param {object} context - Context
 * @param {User} nurse - Nurse used throughout `create-data.js`
 * @returns {SharedResources} Shared resources
 */
export function createSharedResources(context, nurse) {
  return { nurse }
}

/**
 * @import { User } from '../../app/models.js'
 * @import { SharedResources } from './types.js'
 */
