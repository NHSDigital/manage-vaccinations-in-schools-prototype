import { fakerEN_GB as faker } from '@faker-js/faker'

import { ParentalRelationship } from '../enums.js'
import { Patient } from '../models.js'
import { formatOther, formatContact, stringToBoolean } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ContactOptions
 * @property {string} [uuid] - Contact UUID
 * @property {string} [fullName] - Full name
 * @property {ParentalRelationship} [relationship] - Relationship to child
 * @property {string} [relationshipOther] - Other relationship to child
 * @property {boolean} [hasParentalResponsibility] - Has parental responsibility
 * @property {boolean} [canNotify] - Notify about consent and vaccinations
 * @property {string} [tel] - Phone number
 * @property {string} [email] - Email address
 * @property {NotifyEmailStatus} [emailStatus] - Email status
 * @property {boolean} [sms] - Get updates via SMS
 * @property {NotifySmsStatus} [smsStatus] - SMS status
 * @property {boolean} [contactPreference] - Preferred contact method
 * @property {string} [contactPreferenceDetails] - Contact method details
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

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.fullName = options?.fullName || ''
    this.relationship = options?.relationship || ParentalRelationship.Unknown
    this.relationshipOther =
      this?.relationship === ParentalRelationship.Other
        ? options?.relationshipOther
        : undefined
    this.hasParentalResponsibility =
      this.relationship === ParentalRelationship.Other ||
      ParentalRelationship.Fosterer
        ? stringToBoolean(options.hasParentalResponsibility)
        : undefined
    this.canNotify = stringToBoolean(options?.canNotify)
    this.tel = options?.tel
    this.email = options?.email
    this.emailStatus = this?.email && options?.emailStatus
    this.sms = stringToBoolean(options.sms)
    this.smsStatus = this?.tel && options?.smsStatus
    this.contactPreference = stringToBoolean(options?.contactPreference)

    if (this.contactPreference) {
      this.contactPreferenceDetails = options?.contactPreferenceDetails
    }
  }

  /**
   * Get full name and relationship to child
   *
   * @returns {string} Full name and relationship
   */
  get fullNameAndRelationship() {
    return formatContact(this, false)
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
          switch (prop) {
            case 'contactPreference':
              return this.contactPreferenceDetails || this.contactPreference
            case 'fullName':
              return this.fullName || 'Name unknown'
            case 'relationship':
              return formatOther(this.relationshipOther, this.relationship)
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

/**
 * @import { NotifyEmailStatus, NotifySmsStatus } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
