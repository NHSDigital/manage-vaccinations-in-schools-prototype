import process from 'node:process'

import { AdditionalNeeds } from '../enums.js'

/**
 * Which version of the additional needs (collected in consent and clinic appointments) are we using?
 *
 * @returns {AdditionalNeeds} The type of additional needs to collect
 */
export function getAdditionalNeeds() {
  // If not defined at all, go with structured adjustments and impairments
  if (!process.env.STRUCTURED_ADDITIONAL_NEEDS) {
    return AdditionalNeeds.Structured
  }

  // ...otherwise, honour the flag
  return process.env.STRUCTURED_ADDITIONAL_NEEDS === 'true'
    ? AdditionalNeeds.Structured
    : AdditionalNeeds.Basic
}
