import { Reply } from '../models.js'
import { addRespondentToPatient } from '../utils/contact-relationship.js'
import { countAnswersNeedingTriage } from '../utils/reply.js'
import { formatLinkWithSecondaryText } from '../utils/string.js'

/**
 * @class Consent
 * @augments Reply
 */
export class Consent extends Reply {
  static ns = 'consent'

  /**
   * Answers in this consent response need triage
   *
   * @returns {boolean} Has answers needing triage
   */
  get hasAnswersNeedingTriage() {
    return countAnswersNeedingTriage(this.healthAnswers) > 0
  }

  /**
   * Get formatted links
   *
   * @returns {object} Formatted links
   */
  get link() {
    return {
      summary: formatLinkWithSecondaryText(
        this.uri,
        this.contactRelationship.fullNameAndRelationship,
        `for ${this.child.fullName}`
      )
    }
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/consents/${this.uuid}`
  }

  /**
   * Link consent with patient record
   *
   * Also adds the details the parent gave in their response (their phone
   * numbers, email addresses and contact preferences) to their contact on the
   * child’s record, and saves that contact. If the parent isn’t one of the
   * child’s contacts, they’re added as one
   *
   * @param {Patient} patient - Patient
   */
  linkToPatient(patient) {
    this.patient_uuid = patient.uuid

    // Add the parent who responded to the child’s contacts, with the details
    // they gave
    const contactRelationship = addRespondentToPatient(
      patient,
      this,
      this.context
    )
    this.contactRelationship_uuid =
      contactRelationship?.uuid ?? this.contactRelationship_uuid

    patient.addReply(this)
  }
}

/**
 * @import { Patient } from '../models.js'
 */
