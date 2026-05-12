import { fakerEN_GB as faker } from '@faker-js/faker'

import { ParentalRelationship } from '../enums.js'
import { formatOther, formatParent, stringToBoolean } from '../utils/string.js'

/**
 * @class Parent
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
 */
export class Parent {
  constructor(options) {
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
}
