import { fakerEN_GB as faker } from '@faker-js/faker'
import _ from 'lodash'

import { Child, Parent } from '../models.js'
import { tokenize } from '../utils/object.js'
import {
  formatList,
  formatNhsNumber,
  formatParent,
  formatWithSecondaryText,
  stringToBoolean
} from '../utils/string.js'

/**
 * @class PDS record
 * @augments Child
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {string} [uuid] - UUID
 * @property {string} [nhsn] - NHS number
 * @property {boolean} [invalid] - Flagged as invalid
 * @property {boolean} [sensitive] - Flagged as sensitive
 * @property {object} [address] - Address
 * @property {Parent} [parent1] - Parent 1
 * @property {Parent} [parent2] - Parent 2
 */
export class PDSRecord extends Child {
  constructor(options, context) {
    super(options, context)

    const invalid = stringToBoolean(options?.invalid)
    const sensitive = stringToBoolean(options?.sensitive)

    this.uuid = options?.uuid || faker.string.uuid()
    this.nhsn =
      options?.nhsn ||
      '999#######'.replace(/#+/g, (m) => faker.string.numeric(m.length))
    this.invalid = invalid
    this.sensitive = sensitive
    this.address = !sensitive && options?.address ? options.address : undefined
    this.parent1 =
      !sensitive && options?.parent1 ? new Parent(options.parent1) : undefined
    this.parent2 =
      !sensitive && options?.parent2 ? new Parent(options.parent2) : undefined
    this.school_id = null
  }

  /**
   * Has no parental contact details
   *
   * @returns {boolean} Has no parental details
   */
  get hasNoContactDetails() {
    return (
      !this.parent1?.email &&
      !this.parent1?.tel &&
      !this.parent2?.email &&
      !this.parent2?.tel
    )
  }

  /**
   * Get full name, formatted as LASTNAME, Firstname
   *
   * @returns {string} Full name
   */
  get fullName() {
    return [this.lastName.toUpperCase(), this.firstName].join(', ')
  }

  /**
   * Get parents (from record and replies)
   *
   * @returns {Array<Parent>} Parents
   */
  get parents() {
    const parents = new Map()

    if (this.parent1) {
      parents.set(this.parent1.uuid, new Parent(this.parent1))
    }

    if (this.parent2) {
      parents.set(this.parent2.uuid, new Parent(this.parent2))
    }

    return [...parents.values()]
  }

  /**
   * Get tokenised values (to use in search queries)
   *
   * @returns {string} Tokens
   */
  get tokenized() {
    const parentTokens = []
    for (const parent of this.parents) {
      parentTokens.push(tokenize(parent, ['fullName', 'tel', 'email']))
    }

    const childTokens = tokenize(this, ['nhsn', 'fullName', 'postalCode'])

    return [childTokens, parentTokens].join(' ')
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const formattedNhsn = formatNhsNumber(this.nhsn, this.invalid)
    const formattedParents = this.parents.map((parent) => formatParent(parent))

    return {
      ...super.formatted,
      fullNameAndNhsn: formatWithSecondaryText(this.fullName, formattedNhsn),
      nhsn: formattedNhsn,
      parent1: this.parent1 && formatParent(this.parent1),
      parent2: this.parent2 && formatParent(this.parent2),
      parents: formatList(formattedParents)
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'pdsRecord'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/pds/${this.uuid}/new/result`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<PDSRecord>|undefined} PDS records
   * @static
   */
  static findAll(context) {
    return Object.values(context.pdsRecords).map(
      (pdsRecord) => new PDSRecord(pdsRecord, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} uuid - PDS record UUID
   * @param {object} context - Context
   * @returns {PDSRecord|undefined} PDS record
   * @static
   */
  static findOne(uuid, context) {
    if (context?.pdsRecords?.[uuid]) {
      return new PDSRecord(context.pdsRecords[uuid], context)
    }
  }

  /**
   * Create
   *
   * @param {PDSRecord} pdsRecord - PDS record
   * @param {object} context - Context
   * @returns {PDSRecord} Created PDS record
   * @static
   */
  static create(pdsRecord, context) {
    const createdRecord = new PDSRecord(pdsRecord)

    // Update context
    context.pdsRecords = context.pdsRecords || {}
    context.pdsRecords[createdRecord.uuid] = createdRecord

    return createdRecord
  }

  /**
   * Update
   *
   * @param {string} uuid - PDS record UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {PDSRecord} Updated PDS record
   * @static
   */
  static update(uuid, updates, context) {
    const updatedPdsRecord = _.merge(PDSRecord.findOne(uuid, context), updates)

    // Remove patient context
    delete updatedPdsRecord.context

    // Delete original PDS record (with previous UUID)
    delete context.pdsRecords[uuid]

    // Update context
    context.pdsRecords[updatedPdsRecord.uuid] = updatedPdsRecord

    return updatedPdsRecord
  }
}
