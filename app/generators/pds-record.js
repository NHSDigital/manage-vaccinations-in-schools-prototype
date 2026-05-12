import { PDSRecord } from '../models.js'

import { generateChild } from './child.js'

/**
 * Generate fake PDS record
 *
 * @returns {PDSRecord} PDS record
 */
export function generatePDSRecord() {
  const child = generateChild()

  // PDS records provide only a subset of child data
  delete child.preferredFirstName
  delete child.preferredLastName
  delete child.registrationGroup
  delete child.school_id

  return new PDSRecord(child)
}
