import { fakerEN_GB as faker } from '@faker-js/faker'

import { RelationshipType } from '../enums.js'
import { Contact, Patient } from '../models.js'
import {
  formatOther,
  formatRelationship,
  stringToBoolean
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} RelationshipOptions
 * @property {string} [uuid] - Relationship UUID
 * @property {string} [fullName] - Full name
 * @property {RelationshipType} [type] - Type of relationship to child
 * @property {string} [relationshipOther] - Other relationship to child
 * @property {boolean} [hasParentalResponsibility] - Has parental responsibility
 * @property {boolean} [canNotify] - Notify about consent and vaccinations
 * @property {boolean} [canSms] - Get updates via SMS
 * @property {boolean} [hasCommunicationNeeds] - Has communication needs
 * @property {string} [communicationNeeds] - Communication or language needs
 */

/**
 * @class Relationship
 */
export class Relationship extends BaseModel {
  static contextKey = 'relationships'
  static identifierKey = 'uuid'
  static ns = 'relationship'

  /**
   * @param {RelationshipOptions} options - Options
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
    this.canSms = stringToBoolean(options.canSms)
    this.hasCommunicationNeeds = stringToBoolean(options?.hasCommunicationNeeds)

    if (this.hasCommunicationNeeds) {
      this.communicationNeeds = options?.communicationNeeds
    }
  }

  /**
   * Get full name and relationship to child
   *
   * @returns {string} Full name and relationship
   */
  get fullNameAndRelationship() {
    return formatRelationship(this)
  }

  /**
   * Get contacts
   *
   * @returns {Array<Contact>|undefined} Contacts
   */
  get contacts() {
    try {
      return Contact.findAll(this.context).filter(
        (contact) => contact.relationship_uuid === this.uuid
      )
    } catch (error) {
      console.error('Relationship.contacts', error.message)
    }
  }

  /**
   * Has contact details
   *
   * @returns {boolean} Has contact details
   */
  get hasContactDetails() {
    return this.contacts.length > 0
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
            case 'communicationNeeds':
              return this.communicationNeeds || this.hasCommunicationNeeds
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

Relationship.relate('patient_uuid', () => Patient, 'patient')

/**
 * @import { BaseModelOptions } from './base.js'
 */
