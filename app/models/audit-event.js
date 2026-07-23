import { isBefore } from 'date-fns'

import {
  Child,
  Patient,
  Programme,
  Session,
  Team,
  Vaccination
} from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  today
} from '../utils/date.js'
import { getScreenStatusProperties } from '../utils/enum-properties.js'
import {
  formatTag,
  formatMarkdown,
  formatWithSecondaryText,
  stringToArray
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} AuditEventOptions
 * @property {string} [name] - Name
 * @property {string} [note] - Note
 * @property {AuditEventType} [type] - Audit event type
 * @property {object} [messageRecipient] - Message recipient
 * @property {string} [messageTemplate] - Message template
 * @property {Array} [updatedFields] - Updated fields
 * @property {string} [outcome] - Outcome for activity type
 * @property {Date} [outcomeAt] - Date outcome invalidates
 * @property {object} [outcomeAt_] - Date outcome invalidates (from `dateInput`)
 * @property {Array<string>} [programme_ids] - Programme IDs
 */

/**
 * @class Audit event
 */
export class AuditEvent extends BaseModel {
  static ns = 'event'

  /**
   * @param {AuditEventOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    /** @type {string|undefined} */
    this.session_id

    /** @type {Session|undefined} */
    this.session

    /** @type {string|undefined} */
    this.team_id

    /** @type {Team|undefined} */
    this.team

    /** @type {string|undefined} */
    this.vaccination_uuid

    /** @type {Vaccination|undefined} */
    this.vaccination

    this.context = context
    this.name = options?.name
    this.note = options?.note
    this.type = options?.type
    this.messageRecipient = options?.messageRecipient
    this.messageTemplate = options?.messageTemplate
    this.updatedFields = options?.updatedFields
    this.outcome = options?.outcome
    this.outcomeAt = options?.outcomeAt && new Date(options.outcomeAt)
    this.outcomeAt_ = options?.outcomeAt_
    this.programme_ids = stringToArray(options?.programme_ids)
  }

  /**
   * Get data to pass to message template
   *
   * @returns {object} Message data
   */
  get messageData() {
    return {
      child: new Child(this.patient, this.context),
      session: this.session,
      team: this.team
    }
  }

  /**
   * Get date outcome invalidates for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get outcomeAt_() {
    return convertIsoDateToObject(this.outcomeAt)
  }

  /**
   * Set date outcome invalidates from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set outcomeAt_(object) {
    if (object) {
      this.outcomeAt = convertObjectToIsoDate(object)
    }
  }

  /**
   * Is past event
   *
   * @returns {boolean} Is past event
   */
  get isPastEvent() {
    return isBefore(this.createdAt, today())
  }

  /**
   * Get programmes event relates to
   *
   * @returns {Array<Programme>} Programmes
   */
  get programmes() {
    if (this.context?.programmes && this.programme_ids) {
      return this.programme_ids.map(
        (id) => new Programme(this.context?.programmes[id], this.context)
      )
    }

    return []
  }

  get summary() {
    return {
      createdAtAndBy: this.createdBy
        ? formatWithSecondaryText(
            this.formatted.createdAt,
            this.createdBy.fullName
          )
        : this.formatted.createdAt
    }
  }

  /**
   * Get description - used to show more detailed metadata
   *
   * @returns {string} Description
   */
  get description() {
    if (this.vaccination) {
      return `Vaccination given ${this.vaccination.formatted.administeredAt_date} by ${this.vaccination.formatted.administeredBy}.<br>Record added to Mavis ${this.formatted.datetime} by ${this.formatted.createdBy}.`
    } else if (this.createdBy_uid) {
      return [this.formatted.datetime, this.formatted.createdBy].join(` · `)
    }

    return this.formatted.datetime
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
            case 'createdAt':
              return formatDate(this.createdAt, { dateStyle: 'long' })
            case 'createdBy':
              return this.createdBy_uid && this.createdBy.fullName
            case 'datetime':
              return formatDate(this.createdAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'note':
              return this.note && formatMarkdown(this.note)
            case 'outcome':
              return (
                this.outcome &&
                formatTag(getScreenStatusProperties(this.outcome))
              )
            case 'outcomeAt':
              return (
                this.outcomeAt &&
                formatDate(this.outcomeAt, { dateStyle: 'long' })
              )
            case 'programmes':
              return this.programmes.flatMap(({ nameTag }) => nameTag).join(' ')
            default:
              return undefined
          }
        }
      }
    )
  }
}

AuditEvent.relate('patient_uuid', () => Patient, 'patient')
AuditEvent.relate('session_id', () => Session, 'session')
AuditEvent.relate('team_id', () => Team, 'team')
AuditEvent.relate('vaccination_uuid', () => Vaccination, 'vaccination')

/**
 * @import { AuditEventType } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
