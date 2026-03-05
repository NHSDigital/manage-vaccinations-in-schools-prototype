import { fakerEN_GB as faker } from '@faker-js/faker'
import { addMonths } from 'date-fns'
import _ from 'lodash'

import vaccines from '../datasets/vaccines.js'
import {
  ConsentOutcome,
  ConsentVaccineCriteria,
  NotifyEmailStatus,
  NotifySmsStatus,
  ProgrammeType,
  ReplyDecision,
  ReplyMethod,
  ReplyRefusal,
  VaccineCriteria
} from '../enums.js'
import {
  Child,
  Parent,
  Patient,
  Programme,
  Session,
  User,
  Vaccination
} from '../models.js'
import { formatDate, today } from '../utils/date.js'
import {
  getConsentOutcomeStatus,
  getReplyDecisionStatus
} from '../utils/status.js'
import {
  formatMarkdown,
  formatOther,
  formatParent,
  formatTag,
  formatWithSecondaryText,
  stringToBoolean
} from '../utils/string.js'

/**
 * @class Reply
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {object} [context] - Global context
 * @property {string} uuid - UUID
 * @property {Date} [createdAt] - Created date
 * @property {string} [createdBy_uid] - User who created reply
 * @property {Date} [updatedAt] - Updated date
 * @property {import('./child.js').Child} [child] - Child
 * @property {import('./parent.js').Parent} [parent] - Parent or guardian
 * @property {ReplyDecision} [decision] - Consent decision
 * @property {boolean} [alternative] - Consent for alternative vaccine
 * @property {boolean} [confirmed] - Decision confirmed
 * @property {boolean} [consultation] - Consultation requested
 * @property {boolean} declined - Reply declines consent
 * @property {boolean} ethnicity - Answered ethnicity questions
 * @property {boolean} given - Reply gives consent
 * @property {boolean} invalid - Reply is invalid
 * @property {ReplyMethod} [method] - Reply method
 * @property {object} [healthAnswers] - Answers to health questions
 * @property {Array} [triageNote] - Triage note for answered health questions
 * @property {ReplyRefusal} [refusalReason] - Refusal reason
 * @property {string} [refusalReasonOther] - Other refusal reason
 * @property {string} [refusalReasonDetails] - Refusal reason details
 * @property {boolean} [selfConsent] - Reply given by child
 * @property {string} [note] - Note about this response
 * @property {string} patient_uuid - Patient UUID
 * @property {string} [programme_id] - Programme ID
 * @property {string} session_id - Session ID
 */
export class Reply {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdBy_uid = options?.createdBy_uid
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.child = options?.child && new Child(options.child)
    this.ethnicity = stringToBoolean(options?.ethnicity)
    this.parent = options?.parent && new Parent(options.parent)
    this.method = options?.method
    this.selfConsent = options?.selfConsent
    this.note = options?.note || ''
    this.patient_uuid = options?.patient_uuid
    this.programme_id = options?.programme_id
    this.session_id = options?.session_id

    // Some values only valid if the consent request was received
    if (this.delivered) {
      this.decision =
        options?.refusalReason === ReplyRefusal.AlreadyVaccinatedMMR
          ? ReplyDecision.AlreadyVaccinated
          : options?.decision
      this.alternative =
        options?.alternative && stringToBoolean(options?.alternative)
      this.confirmed = stringToBoolean(options?.confirmed)
      this.consultation = stringToBoolean(options?.consultation)
      this.declined = this.decision === ReplyDecision.Declined
      this.given = [
        ReplyDecision.Given,
        ReplyDecision.OnlyAlternativeInjection,
        ReplyDecision.OnlyMenACWY,
        ReplyDecision.OnlyTdIPV
      ].includes(this.decision)
      this.healthAnswers = this.given && options?.healthAnswers
      this.triageNote = this.given && options?.triageNote
      this.invalid =
        this?.decision === ReplyDecision.NoResponse
          ? false // Don’t show non response as invalid
          : stringToBoolean(options?.invalid) || false
    }

    if (this.decision === ReplyDecision.AlreadyVaccinated) {
      this.firstDose = options?.firstDose && new Vaccination(options.firstDose)

      if (options?.firstDose?.scheduled) {
        this.firstDose.createdAt = addMonths(this.child?.dob, 12)
      }

      this.secondDose =
        options?.secondDose && new Vaccination(options.secondDose)

      if (options?.secondDose?.scheduled) {
        this.secondDose.createdAt = addMonths(this.child?.dob, 40)
      }
    }

    if (
      [
        ReplyDecision.Refused,
        ReplyDecision.OnlyMenACWY,
        ReplyDecision.OnlyTdIPV
      ].includes(this.decision)
    ) {
      this.refusalReason = options?.refusalReason || ''

      if (this.refusalReason === ReplyRefusal.Other) {
        this.refusalReasonOther = options?.refusalReasonOther
      }

      if (
        ![ReplyRefusal.Personal, ReplyRefusal.Other].includes(
          this.refusalReason
        )
      ) {
        this.refusalReasonDetails = options?.refusalReasonDetails || ''
      }
    }
  }

  /**
   * Get respondent’s full name
   *
   * @returns {string|undefined} Full name
   */
  get fullName() {
    if (this.parent) {
      return this.parent.fullName
    } else if (this.child) {
      return this.child.fullName
    }
  }

  /**
   * Was the consent response delivered?
   *
   * @returns {boolean} Response was delivered
   */
  get delivered() {
    // Only invites to give consent online can have delivery failures
    if (this.method !== ReplyMethod.Website) {
      return true
    }

    const hasEmailGotEmail =
      this.parent?.email &&
      this.parent?.emailStatus === NotifyEmailStatus.Delivered
    const hasTelSmsGotSms =
      this.parent?.tel && this.parent?.smsStatus === NotifySmsStatus.Delivered

    return hasEmailGotEmail || hasTelSmsGotSms
  }

  /**
   * Get respondent’s relationship to child
   *
   * @returns {string|undefined} Relationship to child
   */
  get relationship() {
    if (this.parent) {
      return this.parent.relationship
    } else if (this.child) {
      return 'Child (Gillick competent)'
    }
  }

  /**
   * Get user who created reply
   *
   * @returns {User} User
   */
  get createdBy() {
    try {
      if (this.createdBy_uid) {
        return User.findOne(this.createdBy_uid, this.context)
      }
    } catch (error) {
      console.error('Reply.createdBy', error.message)
    }
  }

  /**
   * Get chosen vaccine method
   *
   * @returns {ConsentVaccineCriteria|undefined} Chosen vaccination method
   */
  get vaccineCriteria() {
    if (this.given && this.programme.type === ProgrammeType.Flu) {
      switch (true) {
        case this.decision === ReplyDecision.Given && !this.alternative:
          return ConsentVaccineCriteria.IntranasalOnly
        case this.decision === ReplyDecision.OnlyAlternativeInjection:
          return ConsentVaccineCriteria.AlternativeFluInjectionOnly
        default:
          return ConsentVaccineCriteria.IntranasalPreferred
      }
    }

    if (this.given && this.programme.type === ProgrammeType.MMR) {
      if (this.decision === ReplyDecision.OnlyAlternativeInjection) {
        return ConsentVaccineCriteria.AlternativeMMRInjectionOnly
      }
    }
  }

  /**
   * Has parent given consent for an injected vaccine?
   *
   * @returns {boolean} Consent given for an injected vaccine
   */
  get hasConsentForInjection() {
    return (
      this.decision === ReplyDecision.OnlyAlternativeInjection ||
      this.alternative
    )
  }

  /**
   * Get health questions to show based on programme and decision given
   *
   * @returns {Array} Health questions
   */
  get healthQuestionsForDecision() {
    const { Flu, HPV, MenACWY, TdIPV } = ProgrammeType
    const programme = this.session.programmes[0]

    const healthQuestionsForDecision = new Map()
    let consentedMethod
    let consentedVaccine

    // Consent given for flu programme with method of vaccination
    if (programme?.type === Flu) {
      consentedVaccine = Object.values(vaccines).filter(
        (programme) => programme.type === Flu
      )

      // If no consent for alternative injection or only consent for injection
      if (!this.alternative) {
        consentedMethod =
          this.decision === ReplyDecision.OnlyAlternativeInjection
            ? VaccineCriteria.AlternativeInjection
            : VaccineCriteria.Intranasal
        consentedVaccine = Object.values(vaccines).find(
          (programme) => programme.method === consentedMethod
        )
      }
    }

    // Consent given for HPV programme
    if (programme?.type === HPV) {
      consentedVaccine = Object.values(vaccines).find(
        (programme) => programme.type === HPV
      )
    }

    // Consent given for MenACWY programme only
    if (this.decision === ReplyDecision.OnlyMenACWY) {
      consentedVaccine = Object.values(vaccines).find(
        (programme) => programme.type === MenACWY
      )
    }

    // Consent given for Td/IPV programme only
    if (this.decision === ReplyDecision.OnlyTdIPV) {
      consentedVaccine = Object.values(vaccines).find(
        (programme) => programme.type === TdIPV
      )
    }

    // Consent given for all programmes
    if (ReplyDecision.Given && !consentedVaccine) {
      consentedVaccine = this.session.vaccines
    }

    /** @type {Array} */
    const consentedVaccines = Array.isArray(consentedVaccine)
      ? consentedVaccine
      : [consentedVaccine]

    for (const vaccine of consentedVaccines) {
      for (const [key, value] of Object.entries(vaccine.healthQuestions)) {
        healthQuestionsForDecision.set(key, value)
      }
    }

    return Object.fromEntries(healthQuestionsForDecision)
  }

  /**
   * Get patient
   *
   * @returns {Patient} Patient
   */
  get patient() {
    try {
      if (this.patient_uuid) {
        return Patient.findOne(this.patient_uuid, this.context)
      }
    } catch (error) {
      console.error('Reply.patient', error.message)
    }
  }
  /**
   * Get programme
   *
   * @returns {Programme} User
   */
  get programme() {
    try {
      if (this.programme_id) {
        return Programme.findOne(this.programme_id, this.context)
      }
    } catch (error) {
      console.error('Upload.programme', error.message)
    }
  }

  /**
   * Get session
   *
   * @returns {Session} Session
   */
  get session() {
    try {
      if (this.session_id) {
        return Session.findOne(this.session_id, this.context)
      }
    } catch (error) {
      console.error('Reply.session', error.message)
    }
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    let decisionStatus = formatTag(getReplyDecisionStatus(this.decision))
    if (!this.delivered) {
      decisionStatus = formatTag(
        getConsentOutcomeStatus(ConsentOutcome.NotDelivered)
      )
    } else if (this.invalid) {
      decisionStatus = formatWithSecondaryText(
        formatTag({
          colour: 'grey',
          html: `<s>${this.decision}</s>`
        }),
        'Invalid',
        false
      )
    } else if (this.confirmed) {
      decisionStatus = formatWithSecondaryText(
        decisionStatus,
        'Confirmed',
        false
      )
    }

    return {
      createdAt: formatDate(this.createdAt, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      createdBy: this.createdBy?.fullName || '',
      decisionStatus,
      fullNameAndRelationship: this.selfConsent
        ? this.relationship
        : formatParent(this.parent, false),
      parent: formatParent(this.parent, true),
      tel: this.parent && this.parent.tel,
      email: this.parent && this.parent.email,
      programme: this.programme?.nameTag,
      refusalReason: formatOther(this.refusalReasonOther, this.refusalReason),
      refusalReasonDetails: formatMarkdown(this.refusalReasonDetails),
      note: formatMarkdown(this.note)
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'reply'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/sessions/${this.session_id}/patients/${this.patient.nhsn}/${this.programme_id}/replies/${this.uuid}`
  }

  /**
   * Get parent form URI
   *
   * @returns {string} Parent form URI
   */
  get parentUri() {
    return `${this.session.consentUrl}/${this.uuid}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Reply>|undefined} Replies
   * @static
   */
  static findAll(context) {
    return Object.values(context.replies).map(
      (reply) => new Reply(reply, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} uuid - Reply UUID
   * @param {object} context - Context
   * @returns {Reply|undefined} Reply
   * @static
   */
  static findOne(uuid, context) {
    if (context?.replies?.[uuid]) {
      return new Reply(context.replies[uuid], context)
    }
  }

  /**
   * Create
   *
   * @param {object} reply - Consent
   * @param {object} context - Context
   * @returns {Reply} Created reply
   * @static
   */
  static create(reply, context) {
    const createdReply = new Reply(reply)

    // Update context
    context.replies = context.replies || {}
    context.replies[createdReply.uuid] = createdReply

    return createdReply
  }

  /**
   * Update
   *
   * @param {string} uuid - Reply UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Reply} Updated reply
   * @static
   */
  static update(uuid, updates, context) {
    const updatedReply = _.merge(Reply.findOne(uuid, context), updates)
    updatedReply.updatedAt = today()

    // Remove reply context
    delete updatedReply.context

    // Delete original reply (with previous UUID)
    delete context.replies[uuid]

    // Update context
    context.replies[updatedReply.uuid] = updatedReply

    return updatedReply
  }
}
