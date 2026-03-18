import { Reply } from '../models.js'
import { countAnswersNeedingTriage } from '../utils/reply.js'
import { formatLinkWithSecondaryText } from '../utils/string.js'

/**
 * @class Consent
 * @augments Reply
 */
export class Consent extends Reply {
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
        this.parent.fullNameAndRelationship,
        `for ${this.child.fullName}`
      )
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'consent'
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
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Consent>|undefined} Consents
   * @static
   */
  static findAll(context) {
    return Object.values(context.replies)
      .map((reply) => new Consent(reply, context))
      .filter((consent) => !consent.invalid)
      .filter((consent) => !consent.patient_uuid)
  }

  /**
   * Find one
   *
   * @param {string} uuid - Reply UUID
   * @param {object} context - Context
   * @returns {Consent|undefined} Consent
   * @static
   */
  static findOne(uuid, context) {
    if (context?.replies?.[uuid]) {
      return new Consent(context.replies[uuid], context)
    }
  }

  /**
   * Link consent with patient record
   *
   * @param {import('./patient.js').Patient} patient - Patient
   */
  linkToPatient(patient) {
    this.patient_uuid = patient.uuid
    patient.addReply(this)
  }
}
