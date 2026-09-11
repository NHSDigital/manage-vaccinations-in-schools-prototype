/**
 * Identity wrapper that gives every scenario file the same recognisable shape, and a single
 * place to add cross-cutting behaviour later (e.g. logging, timing) without touching every
 * scenario file.
 *
 * @param {Scenario} scenario - Scenario definition
 * @returns {Scenario} The same scenario definition, unchanged
 */
export function defineScenario(scenario) {
  return scenario
}

/**
 * @import { Scenario } from './types.js'
 */
