/**
 * Type definitions for the demo/test scenario system used by `npm run create-data`.
 *
 * This file exists purely for JSDoc `@typedef`s - nothing here runs.
 */

/**
 * @typedef {object} ScenarioLink
 * @property {string} label - What this links to, e.g. "Session: Grange Hill flu clinic"
 * @property {string} href - URL to link to, usually read straight off a model's `.uri` getter
 */

/**
 * @typedef {object} ScenarioResult
 * @property {string} [startUrl] - The best page to start from when testing this scenario.
 * @property {Array<ScenarioLink>} [links] - Links to the key models this scenario created
 */

/**
 * @callback ScenarioRun
 * @param {object} context - The global context
 * @param {SharedResources} shared - Models built up front and shared across scenarios
 * @returns {ScenarioResult|void}
 */

/**
 * @typedef {object} Scenario
 * @property {string} name - Human-readable name, to be shown on the scenarios page, etc.
 * @property {string} description - What this sets up and why (probably UR-focused)
 * @property {ScenarioRun} run - Callback to create this scenario's data
 */

/**
 * @typedef {object} SharedResources
 * @property {School} grangeHillSecondarySchool - One school to use for lots of scenarios
 * @property {User} nurse - The nurse user used throughout `create-data`
 */

export {}

/**
 * @import { School, User } from '../../app/models.js'
 */
