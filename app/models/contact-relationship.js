import { fakerEN_GB as faker } from '@faker-js/faker'

import { ContactType, RelationshipType } from '../enums.js'
import { Contact, Patient } from '../models.js'
import { tokenize } from '../utils/object.js'
import {
  formatOther,
  formatContactRelationship,
  stringToBoolean
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ContactRelationshipOptions
 * @property {string} [uuid] - Contact UUID
 * @property {string} [fullName] - Full name
 * @property {RelationshipType} [relationship] - Type of relationship to child
 * @property {string} [relationshipOther] - Other relationship to child
 * @property {boolean} [hasParentalResponsibility] - Has parental responsibility
 * @property {boolean} [canNotify] - Notify about consent and vaccinations
 * @property {Array<ContactOptions>} [contactPoints] - Phone numbers and
 *   email addresses
 * @property {string} [tel] - Phone number (added as a contact point)
 * @property {string} [email] - Email address (added as a contact point)
 * @property {boolean} [canSms] - Get updates via SMS
 * @property {NotifyEmailStatus} [emailStatus] - Email status (of `email`)
 * @property {NotifySmsStatus} [smsStatus] - SMS status (of `tel`)
 * @property {Array<ContactOptions>} [pendingContactPoints] - Contact
 *   points found in an upload that need review
 */

/**
 * @class Contact
 */
export class ContactRelationship extends BaseModel {
  static contextKey = 'contactRelationships'
  static identifierKey = 'uuid'
  static ns = 'contactRelationship'

  /**
   * Consent response or clinic booking the contact gave, if linked to one
   *
   * A private field, so it isn’t saved with the contact or copied with it
   *
   * @type {Reply|ClinicBooking|undefined}
   */
  #response

  /**
   * @param {ContactRelationshipOptions} options - Options
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
    this.contacts = (options?.contacts || []).map(
      (contact) => new Contact(contact, context)
    )

    // Forms (and older data) give a single phone number and email address,
    // with their delivery statuses, so add these to the contact points
    for (const key of ['tel', 'email', 'smsStatus', 'emailStatus']) {
      if (options && key in options) {
        this[key] = options[key]
      }
    }

    this.canSms = this.tel ? stringToBoolean(options?.canSms) : undefined

    this.pendingContacts = (options?.pendingContacts || []).map(
      (contact) => new Contact(contact, context)
    )
  }

  /**
   * Link the contact to the consent response or clinic booking they gave
   *
   * Communication needs are given with each response or booking, rather than
   * kept with the contact, so a contact linked to one can show them. The link
   * isn’t saved with the contact.
   *
   * @param {Reply|ClinicBooking} [response] - Response or booking
   * @returns {ContactRelationship} Contact
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
   * @returns {Array<Contact>} Contact points
   */
  get activeContacts() {
    return this.contacts.filter((contact) => !contact.isArchived)
  }

  /**
   * Get contact points that have been archived
   *
   * @returns {Array<Contact>} Contact points
   */
  get archivedContacts() {
    return this.contacts.filter((contact) => contact.isArchived)
  }

  /**
   * Add contact point
   *
   * If the contact already has an active contact point with the same value,
   * add any new sources to that contact point instead, and mark it as updated
   * if it was given more recently
   *
   * @param {ContactOptions} options - Contact point options
   * @returns {Contact} Contact point added or updated
   */
  addContact(options) {
    const contact = new Contact(options, this.context)

    const existingContact = this.activeContacts.find(
      ({ type, normalisedValue }) =>
        type === contact.type &&
        normalisedValue !== undefined &&
        normalisedValue === contact.normalisedValue
    )

    if (existingContact) {
      existingContact.sources = [
        ...new Set([...existingContact.sources, ...contact.sources])
      ]

      // Only mark as updated if given again later than last given
      const lastGivenAt = existingContact.updatedAt || existingContact.createdAt
      if (contact.createdAt > lastGivenAt) {
        existingContact.updatedAt = contact.createdAt
      }

      return existingContact
    }

    this.contacts.push(contact)

    return contact
  }

  /**
   * Is a contact for a child whose record is sensitive
   *
   * The contact points of these contacts are hidden, and can’t be searched for
   *
   * @returns {boolean} Is a contact for a child with a sensitive record
   */
  get isSensitive() {
    return !!this.patient?.isSensitive
  }

  /**
   * Get formatted values of active contact points of a given type
   *
   * Returns no values for contacts of children with sensitive records
   *
   * @param {ContactType} type - Type of contact point
   * @returns {Array<string>} Formatted values
   */
  formattedContactValues(type) {
    if (this.isSensitive) {
      return []
    }

    return this.activeContacts
      .filter((contact) => contact.type === type)
      .map((contact) => contact.formatted.value)
  }

  /**
   * Get first active contact point of a given type
   *
   * @param {ContactType} type - Type of contact point
   * @returns {Contact|undefined} Contact point
   */
  firstActiveContact(type) {
    return this.activeContacts.find((contact) => contact.type === type)
  }

  /**
   * Set the value of the first active contact point of a given type
   *
   * Adds a contact point if there isn’t one, and removes it if no value given.
   *
   * @param {ContactType} type - Type of contact point
   * @param {string} [value] - Phone number or email address
   */
  setFirstActiveContact(type, value) {
    const contact = this.firstActiveContact(type)

    if (!value) {
      if (contact) {
        this.contacts.splice(this.contacts.indexOf(contact), 1)
      }
    } else if (contact) {
      contact.value = value
    } else {
      this.addContact({ type, value })
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
    return this.firstActiveContact(ContactType.Phone)?.value
  }

  /**
   * Set phone number
   *
   * TODO: Remove once callers use contact points
   *
   * @param {string|undefined} value - Phone number
   */
  set tel(value) {
    this.setFirstActiveContact(ContactType.Phone, value)
  }

  /**
   * Get email address
   *
   * TODO: Remove once callers use contact points
   *
   * @returns {string|undefined} Email address
   */
  get email() {
    return this.firstActiveContact(ContactType.Email)?.value
  }

  /**
   * Set email address
   *
   * TODO: Remove once callers use contact points
   *
   * @param {string|undefined} value - Email address
   */
  set email(value) {
    this.setFirstActiveContact(ContactType.Email, value)
  }

  /**
   * Get SMS status
   *
   * TODO: Remove once callers use contact points
   *
   * @returns {NotifySmsStatus|undefined} SMS status
   */
  get smsStatus() {
    return this.firstActiveContact(ContactType.Phone)?.status
  }

  /**
   * Set SMS status
   *
   * TODO: Remove once callers use contact points
   *
   * @param {NotifySmsStatus|undefined} status - SMS status
   */
  set smsStatus(status) {
    const contact = this.firstActiveContact(ContactType.Phone)
    if (contact) {
      contact.status = status
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
    return this.firstActiveContact(ContactType.Email)?.status
  }

  /**
   * Set email status
   *
   * TODO: Remove once callers use contact points
   *
   * @param {NotifyEmailStatus|undefined} status - Email status
   */
  set emailStatus(status) {
    const contact = this.firstActiveContact(ContactType.Email)
    if (contact) {
      contact.status = status
    }
  }

  /**
   * Get full name and relationship to child
   *
   * @returns {string} Full name and relationship
   */
  get fullNameAndRelationship() {
    return formatContactRelationship(this, false)
  }

  /**
   * Has contact details
   *
   * @returns {boolean} Has contact details
   */
  get hasContactDetails() {
    return this.activeContacts.length > 0
  }

  /**
   * Are these the contact details of the same person as another contact?
   *
   * They need to have the same and the same relationship to the child
   * (ignoring parental responsibility settings)
   *
   * @param {ContactRelationship} [contactRelationship] - Other contact
   * @returns {boolean} Contact details are for the same person
   */
  isSamePersonAs(contactRelationship) {
    if (!contactRelationship) {
      return false
    }

    const normaliseText = (text) =>
      text?.trim().replace(/\s+/g, ' ').toLowerCase() || undefined

    const hasSameName =
      normaliseText(this.fullName) !== undefined &&
      normaliseText(this.fullName) ===
        normaliseText(contactRelationship.fullName)
    const hasSameRelationship =
      this.relationship === contactRelationship.relationship &&
      (this.relationship === RelationshipType.Other
        ? normaliseText(this.relationshipOther) ===
          normaliseText(contactRelationship.relationshipOther)
        : true)

    return hasSameName && hasSameRelationship
  }

  /**
   * Has an active contact point that messages are being delivered to
   *
   * @returns {boolean} Has a contact point that messages are delivered to
   */
  get hasDeliveredContact() {
    return this.activeContacts.some((contact) => contact.isDelivered)
  }

  /**
   * Get tokenised values (to use in search queries)
   *
   * Includes archived contact points, so a child can be found using a phone
   * number or email address a parent no longer uses. Contact points aren’t
   * included for children with sensitive records.
   *
   * @returns {string} Tokens
   */
  get tokenized() {
    const contacts = this.isSensitive ? [] : this.contacts
    const contactTokens = contacts
      .map(({ value }) => value?.toLowerCase())
      .filter((value) => value !== undefined)

    return [tokenize(this, ['fullName']), ...contactTokens].join(' ')
  }

  /**
   * Has contact points found in an upload that need review
   *
   * @returns {boolean} Has pending contact points
   */
  get hasPendingContacts() {
    return this.pendingContacts.length > 0
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
          // Phone numbers and email addresses are an empty string, rather
          // than undefined, if there are none (or they’re hidden), so summary
          // lists don’t show a contact’s unformatted values instead
          switch (prop) {
            case 'communicationNeeds':
              return this.response?.formatted['communicationNeeds']
            case 'fullName':
              return this.fullName || 'Name unknown'
            case 'relationship':
              return formatOther(this.relationshipOther, this.relationship)
            case 'email':
              return this.formattedContactValues(ContactType.Email).join('<br>')
            case 'tel':
              return this.formattedContactValues(ContactType.Phone).join('<br>')
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
    return `/contact-relationships/${this.uuid}`
  }
}

ContactRelationship.relate('patient_uuid', () => Patient, 'patient')

/**
 * @import { NotifyEmailStatus, NotifySmsStatus } from '../enums.js'
 * @import { ClinicBooking, Reply } from '../models.js'
 * @import { BaseModelOptions } from './base.js'
 * @import { ContactOptions } from './contact.js'
 */
