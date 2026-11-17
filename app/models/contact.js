import { fakerEN_GB as faker } from '@faker-js/faker'
import { formatPhoneNumber } from 'nhsuk-prototype-kit/nunjucks-filters'

import {
  ContactSource,
  ContactType,
  NotifyEmailStatus,
  NotifySmsStatus
} from '../enums.js'
import { User } from '../models.js'
import { formatDate, today } from '../utils/date.js'
import { stringToArray } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ContactOptions
 * @property {string} [uuid] - Contact point UUID
 * @property {ContactType} [type] - Type of contact point
 * @property {string} [value] - Phone number or email address
 * @property {NotifyEmailStatus|NotifySmsStatus} [status] - Delivery status
 * @property {Array<ContactSource>} [sources] - Where the phone number or
 *   email address came from
 * @property {Date} [archivedAt] - Date archived
 * @property {string} [archivedBy_uid] - User who archived contact point
 */

/**
 * A phone number or email address for a contact
 *
 * Contact points are stored with their contact, rather than in a collection of
 * their own, so that copies of a contact (like those kept by replies, clinic
 * bookings and audit events) include the contact points they had at the time.
 *
 * @class ContactPoint
 */
export class Contact extends BaseModel {
  static ns = 'contact'

  /**
   * @param {ContactOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.archivedBy_uid

    /** @type {User|undefined} */
    this.archivedBy

    this.uuid = options?.uuid || faker.string.uuid()
    this.type = options?.type
    this.value = Contact.normaliseValue(options?.type, options?.value)
    this.status = options?.status
    this.sources = stringToArray(options?.sources)
    this.archivedAt = options?.archivedAt && new Date(options.archivedAt)
  }

  /**
   * Is an email address
   *
   * @returns {boolean} Is an email address
   */
  get isEmail() {
    return this.type === ContactType.Email
  }

  /**
   * Is a phone number
   *
   * @returns {boolean} Is a phone number
   */
  get isPhone() {
    return this.type === ContactType.Phone
  }

  /**
   * Normalise a phone number or email address
   *
   * Values are saved normalised, so they can be compared with each other.
   * Email addresses ignore case and spaces. Phone numbers keep only their
   * digits, with the UK country code replaced by a leading zero (they’re
   * formatted with spaces when shown, using `displayValue`)
   *
   * @param {ContactType} type - Type of contact point
   * @param {string} [value] - Phone number or email address
   * @returns {string|undefined} Normalised value
   */
  static normaliseValue(type, value) {
    if (typeof value !== 'string') {
      return value
    }

    if (type === ContactType.Phone) {
      // Replace the UK country code (with or without 00 before it, and any 0
      // after it, as in +44 (0)7700 900123) with a leading 0
      return value.replace(/\D/g, '').replace(/^(?:00)?440?/, '0')
    }

    return value.replace(/\s/g, '').toLowerCase()
  }

  /**
   * Get value to show (phone numbers are formatted with spaces)
   *
   * @returns {string|undefined} Value to show
   */
  get displayValue() {
    return this.isPhone ? String(formatPhoneNumber(this.value)) : this.value
  }

  /**
   * Was given in a consent response or clinic booking
   *
   * @returns {boolean} Was given in a consent response or clinic booking
   */
  get isFromResponse() {
    return this.sources.some((source) =>
      [ContactSource.ConsentResponse, ContactSource.ClinicBooking].includes(
        source
      )
    )
  }

  /**
   * Has been archived
   *
   * @returns {boolean} Has been archived
   */
  get isArchived() {
    return !!this.archivedAt
  }

  /**
   * Archive
   *
   * @param {object} [options] - Options
   * @param {Date} [options.archivedAt] - Date archived
   * @param {string} [options.archivedBy_uid] - User who archived it
   */
  archive({ archivedAt = today(), archivedBy_uid } = {}) {
    this.archivedAt = archivedAt
    this.archivedBy_uid = archivedBy_uid
  }

  /**
   * Restore
   */
  restore() {
    this.archivedAt = undefined
    this.archivedBy_uid = undefined
  }

  /**
   * Messages sent to this contact point are being delivered
   *
   * @returns {boolean} Messages are being delivered
   */
  get isDelivered() {
    return this.isEmail
      ? this.status === NotifyEmailStatus.Delivered
      : this.status === NotifySmsStatus.Delivered
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const dateOptions = { day: 'numeric', month: 'long', year: 'numeric' }

    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          switch (prop) {
            case 'value':
              return this.isArchived
                ? `<s>${this.displayValue}</s>`
                : this.displayValue
            case 'sources':
              return this.sources.length > 0
                ? this.sources.join('<br>')
                : undefined
            case 'createdAt':
              return formatDate(this.createdAt, dateOptions)
            case 'updatedAt':
              return this.updatedAt && formatDate(this.updatedAt, dateOptions)
            case 'archivedAt':
              return this.archivedAt && formatDate(this.archivedAt, dateOptions)
            default:
              return undefined
          }
        }
      }
    )
  }
}

Contact.relate('archivedBy_uid', () => User, 'archivedBy')

/**
 * @import { BaseModelOptions } from './base.js'
 */
