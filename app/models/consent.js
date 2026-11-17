import { ContactRelationship, Reply } from '../models.js'
import { addReplyDetailsToContactRelationship } from '../utils/contact-relationship.js'
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
   * child’s record, and saves that contact
   *
   * @param {Patient} patient - Patient
   */
  linkToPatient(patient) {
    this.patient_uuid = patient.uuid
    patient.addReply(this)

    const contactRelationship = ContactRelationship.findOne(
      this.contactRelationship_uuid,
      this.context
    )
    if (contactRelationship && this.contactRelationship_) {
      addReplyDetailsToContactRelationship(contactRelationship, this)
      ContactRelationship.update(
        contactRelationship.uuid,
        contactRelationship,
        this.context
      )
    }
  }
}

/**
 * @import { Patient } from '../models.js'
 */
