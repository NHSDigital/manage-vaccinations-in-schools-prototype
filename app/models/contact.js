import { fakerEN_GB as faker } from '@faker-js/faker'

import { RelationshipType } from '../enums.js'
import { Patient } from '../models.js'
import { formatOther, formatContact, stringToBoolean } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ContactOptions
 * @property {string} [uuid] - Contact UUID
 * @property {string} [fullName] - Full name
 * @property {RelationshipType} [relationship] - Type of relationship to child
 * @property {string} [relationshipOther] - Other relationship to child
 * @property {boolean} [hasParentalResponsibility] - Has parental responsibility
 * @property {boolean} [canNotify] - Notify about consent and vaccinations
 * @property {string} [tel] - Phone number
 * @property {string} [email] - Email address
 * @property {boolean} [canSms] - Get updates via SMS
 * @property {NotifyEmailStatus} [emailStatus] - Email status
 * @property {NotifySmsStatus} [smsStatus] - SMS status
 * @property {boolean} [hasCommunicationNeeds] - Has communication needs
 * @property {string} [communicationNeeds] - Communication or language needs
 * @property {Partial<Contact>} [pendingChanges] - Pending changes to contact details
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
    this.relationship = options?.relationship || RelationshipType.Unknown
    this.relationshipOther =
      this?.relationship === RelationshipType.Other
        ? options?.relationshipOther
        : undefined
    this.hasParentalResponsibility =
      this.relationship === RelationshipType.Other || RelationshipType.Fosterer
        ? stringToBoolean(options.hasParentalResponsibility)
        : undefined
    this.canNotify = stringToBoolean(options?.canNotify)
    this.tel = options?.tel
    this.email = options?.email
    this.canSms = stringToBoolean(options.canSms)
    this.emailStatus = this?.email && options?.emailStatus
    this.smsStatus = this?.tel && options?.smsStatus
    this.hasCommunicationNeeds = stringToBoolean(options?.hasCommunicationNeeds)

    if (this.hasCommunicationNeeds) {
      this.communicationNeeds = options?.communicationNeeds
    }

    this.pendingChanges = options?.pendingChanges || {}
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
   * Has contact details
   *
   * @returns {boolean} Has contact details
   */
  get hasContactDetails() {
    return !!this.email || !!this.tel
  }

  /**
   * Has pending changes
   *
   * @returns {boolean} Has pending changes
   */
  get hasPendingChanges() {
    return Object.keys(this.pendingChanges).length > 0
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
          const isSensitive = this.patient?.isSensitive
          const redactIfSensitive = (value) =>
            isSensitive && value !== undefined ? 'Sensitive' : value

          switch (prop) {
            case 'communicationNeeds':
              return redactIfSensitive(
                this.communicationNeeds || this.hasCommunicationNeeds
              )
            case 'fullName':
              return this.fullName || 'Name unknown'
            case 'relationship':
              return formatOther(this.relationshipOther, this.relationship)
            case 'email':
              return redactIfSensitive(this.email)
            case 'tel':
              return redactIfSensitive(this.tel)
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
