import { fakerEN_GB as faker } from '@faker-js/faker'
import _ from 'lodash'

import { Child, Contact } from '../models.js'
import { tokenize } from '../utils/object.js'
import {
  formatList,
  formatNhsNumber,
  formatContact,
  formatWithSecondaryText,
  stringToBoolean
} from '../utils/string.js'

/**
 * @typedef {object} PDSRecordOptions
 * @property {string} [nhsn] - NHS number
 * @property {boolean} [invalid] - Flagged as invalid
 * @property {boolean} [sensitive] - Flagged as sensitive
 * @property {object} [address] - Address
 * @property {Array<string>} [contact_uuids] - Contact UUIDS
 */

/**
 * @class PDS record
 * @augments Child
 */
export class PDSRecord extends Child {
  /**
   * @param {PDSRecordOptions & ChildOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    const invalid = stringToBoolean(options?.invalid)
    const sensitive = stringToBoolean(options?.sensitive)

    this.nhsn =
      options?.nhsn ||
      '999#######'.replace(/#+/g, (m) => faker.string.numeric(m.length))
    this.invalid = invalid
    this.sensitive = sensitive
    this.address = !sensitive && options?.address ? options.address : undefined
    this.school_id = null
    this.contact_uuids = options?.contact_uuids || []
  }

  /**
   * Has no contact details
   *
   * @returns {boolean} Has no contact details
   */
  get hasNoContactDetails() {
    return this.contacts.every((contact) => !contact.email && !contact.tel)
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
   * Get contacts (from record and replies)
   *
   * @returns {Array<Contact>|undefined} Contacts
   */
  get contacts() {
    if (!this.sensitive) {
      return this.contact_uuids.map((uuid) =>
        Contact.findOne(uuid, this.context)
      )
    }
  }

  /**
   * Get tokenised values (to use in search queries)
   *
   * @returns {string} Tokens
   */
  get tokenized() {
    const contactTokens = []
    for (const contact of this.contacts) {
      contactTokens.push(tokenize(contact, ['fullName', 'tel', 'email']))
    }

    const childTokens = tokenize(this, ['nhsn', 'fullName', 'postalCode'])

    return [childTokens, contactTokens].join(' ')
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          const getFormattedNhsn = () =>
            formatNhsNumber(this.nhsn, this.invalid)

          switch (prop) {
            case 'fullNameAndNhsn':
              return formatWithSecondaryText(this.fullName, getFormattedNhsn())
            case 'nhsn':
              return getFormattedNhsn()
            case 'contacts': {
              const formattedContacts = this.contacts.map((contact) =>
                formatContact(contact)
              )
              return formatList(formattedContacts)
            }
            default:
              return super.formatted?.[prop]
          }
        }
      }
    )
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

/**
 * @import { ChildOptions } from './child.js'
 */
