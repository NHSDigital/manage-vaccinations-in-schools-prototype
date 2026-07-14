import { fakerEN_GB as faker } from '@faker-js/faker'

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
    if (!this.isSensitive) {
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
            formatNhsNumber(this.nhsn, this.isInvalid)

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
