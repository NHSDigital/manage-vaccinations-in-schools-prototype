import { fakerEN_GB as faker } from '@faker-js/faker'

import { ParentalRelationship } from '../enums.js'
import { Patient } from '../models.js'
import { formatOther, formatContact, stringToBoolean } from '../utils/string.js'

/**
 * @typedef {object} ContactOptions
 * @property {string} [uuid] - Contact UUID
 * @property {string} [fullName] - Full name
 * @property {ParentalRelationship} [relationship] - Relationship to child
 * @property {string} [relationshipOther] - Other relationship to child
 * @property {boolean} [hasParentalResponsibility] - Has parental responsibility
 * @property {boolean} [notify] - Notify about consent and vaccination events
 * @property {string} [tel] - Phone number
 * @property {string} [email] - Email address
 * @property {NotifyEmailStatus} [emailStatus] - Email status
 * @property {boolean} [sms] - Get updates via SMS
 * @property {NotifySmsStatus} [smsStatus] - SMS status
 * @property {boolean} [contactPreference] - Preferred contact method
 * @property {string} [contactPreferenceDetails] - Contact method details
 * @property {string} [patient_uuid] - Patient UUID
 */

/**
 * @class Contact
 */
export class Contact {
  /**
   * @param {ContactOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
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
    this.notify = stringToBoolean(options?.notify)
    this.tel = options?.tel
    this.email = options?.email
    this.emailStatus = this?.email && options?.emailStatus
    this.sms = stringToBoolean(options.sms) || false
    this.smsStatus = this?.tel && options?.smsStatus
    this.contactPreference = stringToBoolean(options?.contactPreference)

    if (this.contactPreference) {
      this.contactPreferenceDetails = options?.contactPreferenceDetails
    }

    this.patient_uuid = options?.patient_uuid
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
   * Get patient
   *
   * @returns {Patient|undefined} Patient
   */
  get patient() {
    try {
      if (this.patient_uuid) {
        return Patient.findOne(this.patient_uuid, this.context)
      }
    } catch (error) {
      console.error('Contact.patient', error.message)
    }
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
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'contact'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/contacts/${this.uuid}`
  }

  /**
   * Remove `context` so it’s hidden from JSON.stringify, or we’ll get
   * circular reference issues during saving
   *
   * @returns {object} Contact ready to be serialized to JSON
   */
  toJSON() {
    const { context, ...rest } = this
    return rest
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Contact>|undefined} Contacts
   * @static
   */
  static findAll(context) {
    return Object.values(context.contacts).map(
      (contact) => new Contact(contact, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} uuid - Contact UUID
   * @param {object} context - Context
   * @returns {Contact|undefined} Contact
   * @static
   */
  static findOne(uuid, context) {
    if (context?.contacts?.[uuid]) {
      return new Contact(context.contacts[uuid], context)
    }
  }

  /**
   * Create
   *
   * @param {object} contact - Contact
   * @param {object} context - Context
   * @returns {Contact} Created contact
   * @static
   */
  static create(contact, context) {
    const createdContact = new Contact(contact)

    // Update context
    context.contacts = context.contacts || {}
    context.contacts[createdContact.uuid] = createdContact

    return createdContact
  }

  /**
   * Update
   *
   * @param {string} uuid - Contact UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Contact} Updated contact
   * @static
   */
  static update(uuid, updates, context) {
    const updatedContact = Object.assign(
      Contact.findOne(uuid, context),
      updates
    )

    // Remove move context
    delete updatedContact.context

    // Delete original move (with previous UUID)
    delete context.contacts[uuid]

    // Update context
    context.contacts[updatedContact.uuid] = updatedContact

    return updatedContact
  }

  /**
   * Delete
   *
   * @param {string} uuid - Contact UUID
   * @param {object} context - Context
   * @static
   */
  static delete(uuid, context) {
    delete context.contacts[uuid]
  }
}

/**
 * @import { NotifyEmailStatus, NotifySmsStatus } from '../enums.js'
 */
