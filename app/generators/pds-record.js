import { fakerEN_GB as faker } from '@faker-js/faker'

import { PDSRecord } from '../models.js'

import { generateChild } from './child.js'
import { generateParent } from './parent.js'

/**
 * Generate fake PDS record
 *
 * @returns {PDSRecord} PDS record
 */
export function generatePDSRecord() {
  const child = generateChild()

  // Parents
  const parent1 = generateParent(child.lastName, true)

  // PDS records provide only a subset of parent data
  delete parent1.sms
  delete parent1.contactPreference
  delete parent1.contactPreferenceDetails

  let parent2
  const addSecondParent = faker.datatype.boolean(0.5)
  if (addSecondParent) {
    parent2 = generateParent(child.lastName)

    // PDS records provide only a subset of parent data
    delete parent2.sms
    delete parent2.contactPreference
    delete parent2.contactPreferenceDetails
  }

  return new PDSRecord({
    ...child,
    parent1,
    parent2
  })
}
