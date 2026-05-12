import { fakerEN_GB as faker } from '@faker-js/faker'

import { ParentalRelationship } from '../enums.js'
import { Patient } from '../models.js'
import { formatOther, formatParent, stringToBoolean } from '../utils/string.js'

/**
 * @class Parent
 * @param {object} options - Options
 * @param {object} [context] - Context
 * @property {object} [context] - Context
 * @property {string} uuid - UUID
 * @property {string} [fullName] - Full name
 * @property {ParentalRelationship} [relationship] - Relationship to child
 * @property {string} [relationshipOther] - Other relationship to child
 * @property {boolean} [hasParentalResponsibility] - Has parental responsibility
 * @property {boolean} notify - Notify about consent and vaccination events
 * @property {string} tel - Phone number
 * @property {string} email - Email address
 * @property {import('../enums.js').NotifyEmailStatus} emailStatus - Email status
 * @property {boolean} sms - Get updates via SMS
 * @property {import('../enums.js').NotifySmsStatus} smsStatus - SMS status
 * @property {boolean} [contactPreference] - Preferred contact method
 * @property {string} [contactPreferenceDetails] - Contact method details
 * @property {string} [patient_uuid] - Patient UUID
 */
export class Parent {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.fullName = options.fullName || ''
    this.relationship = options.relationship || ParentalRelationship.Unknown
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
    return formatParent(this, false)
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
      console.error('Parent.patient', error.message)
    }
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return {
      contactPreference:
        this.contactPreferenceDetails || this.contactPreference,
      fullName: this.fullName || 'Name unknown',
      relationship: formatOther(this.relationshipOther, this.relationship)
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'parent'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/parents/${this.uuid}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Parent>|undefined} Parents
   * @static
   */
  static findAll(context) {
    return Object.values(context.parents).map(
      (parent) => new Parent(parent, context)
    )
  }

  /**
   * Find one
   *
   * @param {string|string[]} uuid - Parent UUID
   * @param {object} context - Context
   * @returns {Parent|undefined} Parent
   * @static
   */
  static findOne(uuid, context) {
    uuid = String(uuid)

    if (context?.parents?.[uuid]) {
      return new Parent(context.parents[uuid], context)
    }
  }

  /**
   * Create
   *
   * @param {object} parent - Parent
   * @param {object} context - Context
   * @returns {Parent} Created parent
   * @static
   */
  static create(parent, context) {
    const createdParent = new Parent(parent)

    // Update context
    context.parents = context.parents || {}
    context.parents[createdParent.uuid] = createdParent

    return createdParent
  }

  /**
   * Update
   *
   * @param {string|string[]} uuid - Parent UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Parent} Updated parent
   * @static
   */
  static update(uuid, updates, context) {
    uuid = String(uuid)

    const updatedParent = Object.assign(Parent.findOne(uuid, context), updates)

    // Remove move context
    delete updatedParent.context

    // Delete original move (with previous UUID)
    delete context.parents[uuid]

    // Update context
    context.parents[updatedParent.uuid] = updatedParent

    return updatedParent
  }

  /**
   * Delete
   *
   * @param {string|string[]} uuid - Parent UUID
   * @param {object} context - Context
   * @static
   */
  static delete(uuid, context) {
    delete context.parents[String(uuid)]
  }
}
