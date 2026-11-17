import { fakerEN_GB as faker } from '@faker-js/faker'

import { Child, ContactRelationship } from '../models.js'
import { tokenize } from '../utils/object.js'
import {
  formatList,
  formatNhsNumber,
  formatContactRelationship,
  formatWithSecondaryText,
  stringToBoolean
} from '../utils/string.js'

/**
 * @typedef {ChildOptions & object} PDSRecordOptions
 * @property {string} [nhsn] - NHS number
 * @property {boolean} [isInvalid] - Flagged as invalid
 * @property {boolean} [isSensitive] - Flagged as sensitive
 * @property {object} [address] - Address
 * @property {Array<string>} [contact_uuids] - Contact UUIDS
 */

/**
 * @class PDS record
 * @augments Child
 */
export class PDSRecord extends Child {
  static contextKey = 'pdsRecords'
  static identifierKey = 'uuid'
  static ns = 'pdsRecord'

  /**
   * @param {PDSRecordOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    const isInvalid = stringToBoolean(options?.isInvalid)
    const isSensitive = stringToBoolean(options?.isSensitive)

    this.nhsn =
      options?.nhsn ||
      '999#######'.replace(/#+/g, (m) => faker.string.numeric(m.length))
    this.isInvalid = isInvalid
    this.isSensitive = isSensitive
    this.address =
      !isSensitive && options?.address ? options.address : undefined
    this.school_id = null
    this.contactRelationship_uuids = options?.contactRelationship_uuids || []
  }

  /**
   * Has contact details
   *
   * @returns {boolean} Has contact details
   */
  get hasContactDetails() {
    return this.contactRelationships.some(
      (contactRelationship) => contactRelationship.hasContactDetails
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
   * Get contacts (from record and replies)
   *
   * @returns {Array<ContactRelationship>} Contacts
   */
  get contactRelationships() {
    // Don’t show contact details for sensitive records
    if (this.isSensitive) {
      return []
    }

    return this.contactRelationship_uuids
      .map((uuid) => ContactRelationship.findOne(uuid, this.context))
      .filter((contactRelationship) => contactRelationship)
  }

  /**
   * Get tokenised values (to use in search queries)
   *
   * @returns {string} Tokens
   */
  get tokenized() {
    const contactRelationshipTokens = []
    for (const contactRelationship of this.contactRelationships) {
      contactRelationshipTokens.push(
        tokenize(contactRelationship, ['fullName', 'tel', 'email'])
      )
    }

    const childTokens = tokenize(this, ['nhsn', 'fullName', 'postalCode'])

    return [childTokens, contactRelationshipTokens].join(' ')
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
            formatNhsNumber(this.nhsn, this.isInvalid)

          switch (prop) {
            case 'fullNameAndNhsn':
              return formatWithSecondaryText(this.fullName, getFormattedNhsn())
            case 'nhsn':
              return getFormattedNhsn()
            case 'contactRelationships': {
              const formattedContactRelationships =
                this.contactRelationships.map((contactRelationship) =>
                  formatContactRelationship(contactRelationship)
                )
              return formatList(formattedContactRelationships)
            }
            default:
              return super.formatted?.[prop]
          }
        }
      }
    )
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/pds/${this.uuid}/new/result`
  }
}

/**
 * @import { ChildOptions } from './child.js'
 */
