import { PDSRecord } from '../models.js'

/**
 * Generate fake PDS record
 *
 * @param {Child} child - Child
 * @returns {PDSRecord} PDS record
 */
export function generatePDSRecord(child) {
  // PDS records provide only a subset of child data
  delete child.preferredFirstName
  delete child.preferredLastName
  delete child.registrationGroup
  delete child.school_id

  return new PDSRecord(child)
}

/**
 * @import { Child } from '../models.js'
 */
