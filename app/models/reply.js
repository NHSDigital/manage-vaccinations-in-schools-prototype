import { fakerEN_GB as faker } from '@faker-js/faker'
import { addMonths } from 'date-fns'

import vaccines from '../datasets/vaccines.js'
import {
  ConsentStatus,
  ConsentVaccineCriteria,
  NotifyEmailStatus,
  NotifySmsStatus,
  ProgrammeType,
  ReplyDecision,
  ReplyMethod,
  ReplyRefusal,
  VaccineCriteria,
  VaccineMethod
} from '../enums.js'
import {
  Child,
  Contact,
  Patient,
  PatientSession,
  Programme,
  Session,
  Vaccination
} from '../models.js'
import { formatDate } from '../utils/date.js'
import {
  getConsentStatusProperties,
  getReplyDecisionProperties
} from '../utils/enum-properties.js'
import {
  formatMarkdown,
  formatOther,
  formatContact,
  formatTag,
  formatWithSecondaryText,
  stringToBoolean
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ReplyOptions
 * @property {string} [uuid] - Reply UUID
 * @property {Child} [child] - Child
 * @property {Contact} [contact_] - Parent or guardian
 * @property {ReplyDecision} [decision] - Consent decision
 * @property {boolean} [hasConsentForAlternativeVaccine] - Consent for alternative vaccine
 * @property {boolean} [hasConfirmedRefusal] - Refusal confirmed
 * @property {boolean} [hasRequestedConsultation] - Consultation requested
 * @property {boolean} [hasEthnicityAnswers] - Answered ethnicity questions
 * @property {boolean} [hasDeclinedConsent] - Reply declines consent
 * @property {boolean} [hasGivenConsent] - Reply gives consent
 * @property {boolean} [hasRefusedConsent] - Reply refuses consent
 * @property {boolean} [isInvalidated] - Reply is invalid
 * @property {ReplyMethod} [method] - Reply method
 * @property {object} [healthAnswers] - Answers to health questions
 * @property {object} [firstDose] - First dose
 * @property {object} [secondDose] - Second dose
 * @property {string} [triageNote] - Triage note for answered health questions
 * @property {ReplyRefusal} [refusalReason] - Refusal reason
 * @property {string} [refusalReasonOther] - Other refusal reason
 * @property {string} [refusalReasonDetails] - Refusal reason details
 * @property {boolean} [hasSelfConsent] - Reply given by child
 * @property {string} [note] - Note about this response
 */

/**
 * @class Reply
 */
export class Reply extends BaseModel {
  static contextKey = 'replies'
  static identifierKey = 'uuid'
  static ns = 'reply'

  /**
   * @param {ReplyOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.contact_uuid

    /** @type {Contact|undefined} */
    this.contact

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    /** @type {string|undefined} */
    this.programme_id

    /** @type {Programme|undefined} */
    this.programme

    /** @type {string|undefined} */
    this.session_id

    /** @type {Session|undefined} */
    this.session

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.child = options?.child && new Child(options.child)
    this.hasConsentForAlternativeVaccine =
      options?.hasConsentForAlternativeVaccine &&
      stringToBoolean(options?.hasConsentForAlternativeVaccine)
    this.hasConfirmedRefusal = stringToBoolean(options?.hasConfirmedRefusal)
    this.hasRequestedConsultation = stringToBoolean(
      options?.hasRequestedConsultation
    )
    this.decision =
      this.hasConfirmedRefusal === true
        ? ReplyDecision.Refused
        : options?.decision
    this.hasEthnicityAnswers = stringToBoolean(options?.hasEthnicityAnswers)
    this.hasDeclinedConsent = this.decision === ReplyDecision.Declined
    this.hasGivenConsent = [
      ReplyDecision.Given,
      ReplyDecision.OnlyAlternativeInjection,
      ReplyDecision.OnlyMenACWY,
      ReplyDecision.OnlyTdIPV
    ].includes(this.decision)
    this.hasRefusedConsent = [
      ReplyDecision.AlreadyVaccinated,
      ReplyDecision.Refused
    ].includes(this.decision)
    this.isInvalidated =
      this?.decision === ReplyDecision.NoResponse
        ? false // Don’t show non response as invalid
        : stringToBoolean(options?.isInvalidated) || false
    this.method = options?.method
    this.hasSelfConsent = options?.hasSelfConsent || false
    this.note = options?.note || ''
    this.contact_uuid = options?.contact_uuid
    this.patient_uuid = options?.patient_uuid
    this.programme_id = options?.programme_id
    this.session_id = options?.session_id

    // For reasons of simplicity, we use `contact_` this to store contact
    // details in the parental consent journey.
    // TODO: Find out why contact() setter doesn’t work for this purpose
    this.contact_ = options?.contact_ && new Contact(options.contact_)

    // Given options
    if (this.hasGivenConsent) {
      this.healthAnswers = this.hasGivenConsent && options?.healthAnswers
      this.triageNote = this.hasGivenConsent && options?.triageNote
    }

    // Refusal options
    if (
      [
        ReplyDecision.Declined,
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

    // Already vaccinated response
    if (this.isDelivered) {
      this.decision =
        options?.refusalReason === ReplyRefusal.AlreadyVaccinatedMMR
          ? ReplyDecision.AlreadyVaccinated
          : this.decision
    }

    if (
      [ReplyDecision.AlreadyVaccinated, ReplyDecision.Refused].includes(
        this.decision
      )
    ) {
      this.firstDose = options?.firstDose && new Vaccination(options.firstDose)

      if (options?.firstDose?.isScheduled) {
        this.firstDose.createdAt = addMonths(this.child?.dob, 12)
      }

      this.secondDose =
        options?.secondDose && new Vaccination(options.secondDose)

      if (options?.secondDose?.isScheduled) {
        this.secondDose.createdAt = addMonths(this.child?.dob, 40)
      }
    }
  }

  /**
   * Get respondent’s full name
   *
   * @returns {string|undefined} Full name
   */
  get fullName() {
    if (this.contact) {
      return this.contact.fullName
    } else if (this.child) {
      return this.child.fullName
    }
  }

  /**
   * Get respondent’s relationship to child
   *
   * @returns {string|undefined} Relationship to child
   */
  get relationship() {
    if (this.contact) {
      return this.contact.relationship
    } else if (this.child) {
      return `${this.child.fullName} (child)`
    }
  }

  /**
   * Get full name and relationship to child
   *
   * @returns {string} Full name and relationship
   */
  get fullNameAndRelationship() {
    return this.hasSelfConsent
      ? this.relationship
      : formatContact(this.contact, false)
  }

  /**
   * Was the consent response delivered?
   *
   * @returns {boolean} Response was delivered
   */
  get isDelivered() {
    // Only invites to give consent online can have delivery failures
    if (this.method !== ReplyMethod.Website) {
      return true
    }

    const hasEmailGotEmail =
      this.contact?.email &&
      this.contact?.emailStatus === NotifyEmailStatus.Delivered
    const hasTelSmsGotSms =
      this.contact?.tel && this.contact?.smsStatus === NotifySmsStatus.Delivered

    return hasEmailGotEmail || hasTelSmsGotSms
  }

  /**
   * Get chosen vaccine method
   *
   * @returns {ConsentVaccineCriteria|undefined} Chosen vaccination method
   */
  get vaccineCriteria() {
    if (this.hasGivenConsent && this.programme.type === ProgrammeType.Flu) {
      switch (true) {
        case this.decision === ReplyDecision.Given &&
          !this.hasConsentForAlternativeVaccine:
          return ConsentVaccineCriteria.IntranasalOnly
        case this.decision === ReplyDecision.OnlyAlternativeInjection:
          return ConsentVaccineCriteria.AlternativeFluInjectionOnly
        default:
          return ConsentVaccineCriteria.IntranasalPreferred
      }
    }

    if (this.hasGivenConsent && this.programme.type === ProgrammeType.MMR) {
      if (this.decision === ReplyDecision.OnlyAlternativeInjection) {
        return ConsentVaccineCriteria.AlternativeMMRInjectionOnly
      }
    }
  }

  /**
   * Has contact given consent for an injected vaccine?
   *
   * @returns {boolean} Consent given for an injected vaccine
   */
  get hasConsentForInjection() {
    return (
      this.decision === ReplyDecision.OnlyAlternativeInjection ||
      this.hasConsentForAlternativeVaccine
    )
  }

  /**
   * Get health questions to show based on programme and decision given
   *
   * @returns {Array} Health questions
   */
  get healthQuestionsForDecision() {
    const { Flu, HPV, MenACWY, TdIPV, MMR } = ProgrammeType
    const healthQuestionsForDecision = new Map()
    let consentedVaccine

    // Consent given for flu programme with method of vaccination
    if (this.programme?.type === Flu) {
      consentedVaccine = Object.values(vaccines).filter(
        (programme) => programme.type === Flu
      )

      switch (this.decision) {
        case ReplyDecision.OnlyAlternativeInjection:
          // Injection only was chosen
          consentedVaccine = consentedVaccine.filter(
            ({ method }) => method === VaccineMethod.Injection
          )
          break
        case ReplyDecision.Given: {
          // Nasal chosen, but was the alternative injection also accepted?
          if (!this.hasConsentForAlternativeVaccine) {
            consentedVaccine = consentedVaccine.filter(
              ({ method }) => method === VaccineMethod.Intranasal
            )
          }
          break
        }
        default:
          // Presumably refused consent
          consentedVaccine = []
          break
      }
    }

    // Consent given for HPV programme
    if (this.programme?.type === HPV) {
      consentedVaccine = Object.values(vaccines).find(
        ({ type }) => type === HPV
      )
    }

    // Consent given for MenACWY programme only
    if (this.decision === ReplyDecision.OnlyMenACWY) {
      consentedVaccine = Object.values(vaccines).find(
        ({ type }) => type === MenACWY
      )
    }

    // Consent given for Td/IPV programme only
    if (this.decision === ReplyDecision.OnlyTdIPV) {
      consentedVaccine = Object.values(vaccines).find(
        ({ type }) => type === TdIPV
      )
    }

    // Consent given for MMR programme (gelatine-free, or either vaccine)
    if (this.programme?.type == MMR) {
      const allowedCriteria = [
        VaccineCriteria.AlternativeInjection,
        ...(this.hasConsentForAlternativeVaccine
          ? []
          : [VaccineCriteria.Injection])
      ]
      consentedVaccine = Object.values(vaccines)
        .filter(({ type }) => type === ProgrammeType.MMR)
        .filter(({ criteria }) => allowedCriteria.includes(criteria))
    }

    // Consent given for all programmes
    if (!consentedVaccine) {
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
   * Get patient session
   *
   * @returns {PatientSession|undefined} Patient session
   */
  get patientSession() {
    if (this.session_id) {
      return PatientSession.findAll(this.context).find(
        ({ patient_uuid, programme_id, session_id }) =>
          patient_uuid === this.patient_uuid &&
          programme_id === this.programme_id &&
          session_id === this.session_id
      )
    }
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
          const getDecisionStatus = () => {
            let decisionStatus = formatTag(
              getReplyDecisionProperties(this.decision)
            )
            if (!this.isDelivered) {
              decisionStatus = formatTag(
                getConsentStatusProperties(ConsentStatus.NotDelivered)
              )
            } else if (this.isInvalidated) {
              decisionStatus = formatWithSecondaryText(
                formatTag({
                  colour: 'grey',
                  html: `<s>${this.decision}</s>`
                }),
                'Invalid',
                false
              )
            } else if (this.hasConfirmedRefusal) {
              decisionStatus = formatWithSecondaryText(
                decisionStatus,
                'Confirmed',
                false
              )
            }
            return decisionStatus
          }

          switch (prop) {
            case 'createdAt':
              return formatDate(this.createdAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'createdBy':
              return this.createdBy?.fullName || ''
            case 'decisionStatus':
              return getDecisionStatus()
            case 'contact':
              return formatContact(this.contact, true)
            case 'tel':
              return this.contact && this.contact.tel
            case 'email':
              return this.contact && this.contact.email
            case 'programme':
              return this.programme?.nameTag
            case 'refusalReason':
              return formatOther(this.refusalReasonOther, this.refusalReason)
            case 'refusalReasonDetails':
              return formatMarkdown(this.refusalReasonDetails)
            case 'note':
              return formatMarkdown(this.note)
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
    return `/patients/${this.patient_uuid}/programmes/${this.programme_id}/replies/${this.uuid}`
  }

  /**
   * Get public-facing form URI
   *
   * @returns {string} Public-facing form URI
   */
  get publicUri() {
    return `${this.session.consentUrl}/${this.uuid}`
  }
}

Reply.relate('contact_uuid', () => Contact, 'contact')
Reply.relate('patient_uuid', () => Patient, 'patient')
Reply.relate('programme_id', () => Programme, 'programme')
Reply.relate('session_id', () => Session, 'session')

/**
 * @import { BaseModelOptions } from './base.js'
 */
