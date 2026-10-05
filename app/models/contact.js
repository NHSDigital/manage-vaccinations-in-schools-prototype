import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  ContactType,
  NotifyEmailStatus,
  NotifySmsStatus,
  NotifyStatus
} from '../enums.js'
import { Patient, Relationship } from '../models.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ContactOptions
 * @property {string} [uuid] - Contact UUID
 * @property {string} [identifier] - Email address or phone number
 * @property {NotifyStatus} [status] - Delivery status
 */

/**
 * @class Contact
 */
export class Contact extends BaseModel {
  static contextKey = 'contacts'
  static identifierKey = 'uuid'
  static ns = 'contact'

  /**
   * @param {ContactOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    /** @type {string|undefined} */
    this.relationship_uuid

    /** @type {Patient|undefined} */
    this.relationship

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.identifier = options?.identifier
    this.status = options?.status || NotifyStatus.Delivered
  }

  get type() {
    return this.identifier.includes('@') ? ContactType.Email : ContactType.Phone
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const status =
      this.type === ContactType.Email
        ? NotifyEmailStatus[this.status]
        : NotifySmsStatus[this.status]

    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          switch (prop) {
            case 'status':
              return status
            default:
              return undefined
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
    return `/contacts/${this.uuid}`
  }
}

Contact.relate('patient_uuid', () => Patient, 'patient')
Contact.relate('relationship_uuid', () => Relationship, 'relationship')

/**
 * @import { BaseModelOptions } from './base.js'
 */
