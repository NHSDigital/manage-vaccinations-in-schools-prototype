import { Reply } from '../models.js'
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
        this.contact.fullNameAndRelationship,
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
   * @param {Patient} patient - Patient
   */
  linkToPatient(patient) {
    this.patient_uuid = patient.uuid
    patient.addReply(this)
  }
}

/**
 * @import { Patient } from '../models.js'
 */
