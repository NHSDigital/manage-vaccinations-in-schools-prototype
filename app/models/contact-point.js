import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  ContactPointType,
  NotifyEmailStatus,
  NotifySmsStatus
} from '../enums.js'
import { User } from '../models.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ContactPointOptions
 * @property {string} [uuid] - Contact point UUID
 * @property {ContactPointType} [type] - Type of contact point
 * @property {string} [value] - Phone number or email address
 * @property {NotifyEmailStatus|NotifySmsStatus} [status] - Delivery status
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
export class ContactPoint extends BaseModel {
  static ns = 'contactPoint'

  /**
   * @param {ContactPointOptions} options - Options
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
    this.value = options?.value
    this.status = options?.status
    this.archivedAt = options?.archivedAt && new Date(options.archivedAt)
  }

  /**
   * Is an email address
   *
   * @returns {boolean} Is an email address
   */
  get isEmail() {
    return this.type === ContactPointType.Email
  }

  /**
   * Is a phone number
   *
   * @returns {boolean} Is a phone number
   */
  get isPhone() {
    return this.type === ContactPointType.Phone
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
   * Messages sent to this contact point are being delivered
   *
   * @returns {boolean} Messages are being delivered
   */
  get isDelivered() {
    return this.isEmail
      ? this.status === NotifyEmailStatus.Delivered
      : this.status === NotifySmsStatus.Delivered
  }
}

ContactPoint.relate('archivedBy_uid', () => User, 'archivedBy')

/**
 * @import { BaseModelOptions } from './base.js'
 */
