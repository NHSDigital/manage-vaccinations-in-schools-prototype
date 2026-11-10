import { fakerEN_GB as faker } from '@faker-js/faker'

import { ContactPointType, RelationshipType } from '../enums.js'
import { ContactPoint, Patient } from '../models.js'
import { tokenize } from '../utils/object.js'
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
 * @property {Array<ContactPointOptions>} [contactPoints] - Phone numbers and
 *   email addresses
 * @property {string} [tel] - Phone number (added as a contact point)
 * @property {string} [email] - Email address (added as a contact point)
 * @property {boolean} [canSms] - Get updates via SMS
 * @property {NotifyEmailStatus} [emailStatus] - Email status (of `email`)
 * @property {NotifySmsStatus} [smsStatus] - SMS status (of `tel`)
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
   * Consent response or clinic booking the contact gave, if linked to one
   *
   * A private field, so it isn’t saved with the contact or copied with it
   *
   * @type {Reply|ClinicBooking|undefined}
   */
  #response

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
    // Only ask about parental responsibility if it isn’t implied by the
    // relationship (as it is for mums and dads)
    this.hasParentalResponsibility = [
      RelationshipType.Fosterer,
      RelationshipType.Guardian,
      RelationshipType.Other
    ].includes(this.relationship)
      ? stringToBoolean(options?.hasParentalResponsibility)
      : undefined
    this.canNotify = stringToBoolean(options?.canNotify)
    this.contactPoints = (options?.contactPoints || []).map(
      (contactPoint) => new ContactPoint(contactPoint, context)
    )

    // Forms (and older data) give a single phone number and email address,
    // with their delivery statuses, so add these to the contact points
    for (const key of ['tel', 'email', 'smsStatus', 'emailStatus']) {
      if (options && key in options) {
        this[key] = options[key]
      }
    }

    this.canSms = this.tel ? stringToBoolean(options?.canSms) : undefined
    this.emailStatus = this?.email && options?.emailStatus
    this.smsStatus = this?.tel && options?.smsStatus

    this.pendingChanges = options?.pendingChanges || {}
  }

  /**
   * Link the contact to the consent response or clinic booking they gave
   *
   * Communication needs are given with each response or booking, rather than
   * kept with the contact, so a contact linked to one can show them. The link
   * isn’t saved with the contact.
   *
   * @param {Reply|ClinicBooking} [response] - Response or booking
   * @returns {Contact} Contact
   */
  setResponse(response) {
    this.#response = response

    return this
  }

  /**
   * Get the consent response or clinic booking the contact gave
   *
   * @returns {Reply|ClinicBooking|undefined} Response or booking
   */
  get response() {
    return this.#response
  }

  /**
   * Has communication needs (from the response or booking they gave)
   *
   * @returns {boolean|undefined} Has communication needs
   */
  get hasCommunicationNeeds() {
    return this.response?.hasCommunicationNeeds
  }

  /**
   * Get communication needs (from the response or booking they gave)
   *
   * @returns {string|undefined} Communication needs
   */
  get communicationNeeds() {
    return this.response?.communicationNeeds
  }

  /**
   * Get contact points that haven’t been archived
   *
   * @returns {Array<ContactPoint>} Contact points
   */
  get activeContactPoints() {
    return this.contactPoints.filter((contactPoint) => !contactPoint.isArchived)
  }

  /**
   * Get contact points that have been archived
   *
   * @returns {Array<ContactPoint>} Contact points
   */
  get archivedContactPoints() {
    return this.contactPoints.filter((contactPoint) => contactPoint.isArchived)
  }

  /**
   * Add contact point
   *
   * @param {ContactPointOptions} options - Contact point options
   * @returns {ContactPoint} Contact point
   */
  addContactPoint(options) {
    const contactPoint = new ContactPoint(options, this.context)
    this.contactPoints.push(contactPoint)

    return contactPoint
  }

  /**
   * Get first active contact point of a given type
   *
   * @param {ContactPointType} type - Type of contact point
   * @returns {ContactPoint|undefined} Contact point
   */
  firstActiveContactPoint(type) {
    return this.activeContactPoints.find(
      (contactPoint) => contactPoint.type === type
    )
  }

  /**
   * Set the value of the first active contact point of a given type
   *
   * Adds a contact point if there isn’t one, and removes it if no value given.
   *
   * @param {ContactPointType} type - Type of contact point
   * @param {string} [value] - Phone number or email address
   */
  setFirstActiveContactPoint(type, value) {
    const contactPoint = this.firstActiveContactPoint(type)

    if (!value) {
      if (contactPoint) {
        this.contactPoints.splice(this.contactPoints.indexOf(contactPoint), 1)
      }
    } else if (contactPoint) {
      contactPoint.value = value
    } else {
      this.addContactPoint({ type, value })
    }
  }

  /**
   * Get phone number
   *
   * TODO: Remove once callers use contact points
   *
   * @returns {string|undefined} Phone number
   */
  get tel() {
    return this.firstActiveContactPoint(ContactPointType.Phone)?.value
  }

  /**
   * Set phone number
   *
   * TODO: Remove once callers use contact points
   *
   * @param {string|undefined} value - Phone number
   */
  set tel(value) {
    this.setFirstActiveContactPoint(ContactPointType.Phone, value)
  }

  /**
   * Get email address
   *
   * TODO: Remove once callers use contact points
   *
   * @returns {string|undefined} Email address
   */
  get email() {
    return this.firstActiveContactPoint(ContactPointType.Email)?.value
  }

  /**
   * Set email address
   *
   * TODO: Remove once callers use contact points
   *
   * @param {string|undefined} value - Email address
   */
  set email(value) {
    this.setFirstActiveContactPoint(ContactPointType.Email, value)
  }

  /**
   * Get SMS status
   *
   * TODO: Remove once callers use contact points
   *
   * @returns {NotifySmsStatus|undefined} SMS status
   */
  get smsStatus() {
    return this.firstActiveContactPoint(ContactPointType.Phone)?.status
  }

  /**
   * Set SMS status
   *
   * TODO: Remove once callers use contact points
   *
   * @param {NotifySmsStatus|undefined} status - SMS status
   */
  set smsStatus(status) {
    const contactPoint = this.firstActiveContactPoint(ContactPointType.Phone)
    if (contactPoint) {
      contactPoint.status = status
    }
  }

  /**
   * Get email status
   *
   * TODO: Remove once callers use contact points
   *
   * @returns {NotifyEmailStatus|undefined} Email status
   */
  get emailStatus() {
    return this.firstActiveContactPoint(ContactPointType.Email)?.status
  }

  /**
   * Set email status
   *
   * TODO: Remove once callers use contact points
   *
   * @param {NotifyEmailStatus|undefined} status - Email status
   */
  set emailStatus(status) {
    const contactPoint = this.firstActiveContactPoint(ContactPointType.Email)
    if (contactPoint) {
      contactPoint.status = status
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
   * Has contact details
   *
   * @returns {boolean} Has contact details
   */
  get hasContactDetails() {
    return this.activeContactPoints.length > 0
  }

  /**
   * Are these the contact details of the same person as another contact?
   *
   * They need to have the same and the same relationship to the child
   * (ignoring parental responsibility settings)
   *
   * @param {Contact} [contact] - Other contact
   * @returns {boolean} Contact details are for the same person
   */
  isSamePersonAs(contact) {
    if (!contact) {
      return false
    }

    const normaliseText = (text) =>
      text?.trim().replace(/\s+/g, ' ').toLowerCase() || undefined

    const hasSameName =
      normaliseText(this.fullName) !== undefined &&
      normaliseText(this.fullName) === normaliseText(contact.fullName)
    const hasSameRelationship =
      this.relationship === contact.relationship &&
      (this.relationship === RelationshipType.Other
        ? normaliseText(this.relationshipOther) ===
          normaliseText(contact.relationshipOther)
        : true)

    return hasSameName && hasSameRelationship
  }

  /**
   * Get tokenised values (to use in search queries)
   *
   * Includes archived contact points, so a child can be found using a phone
   * number or email address a parent no longer uses
   *
   * @returns {string} Tokens
   */
  get tokenized() {
    const contactPointTokens = this.contactPoints
      .map(({ value }) => value?.toLowerCase())
      .filter((value) => value !== undefined)

    return [tokenize(this, ['fullName']), ...contactPointTokens].join(' ')
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
              return this.response?.formatted['communicationNeeds']
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
 * @import { ClinicBooking, Reply } from '../models.js'
 * @import { BaseModelOptions } from './base.js'
 * @import { ContactPointOptions } from './contact-point.js'
 */
