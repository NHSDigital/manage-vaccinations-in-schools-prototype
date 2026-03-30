import { isBefore } from 'date-fns'

import {
  Child,
  Patient,
  Programme,
  Session,
  Team,
  User,
  Vaccination
} from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  today
} from '../utils/date.js'
import { getScreenOutcomeStatus } from '../utils/status.js'
import {
  formatTag,
  formatMarkdown,
  formatWithSecondaryText,
  stringToBoolean
} from '../utils/string.js'

/**
 * @class Audit event
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {object} [context] - Global context
 * @property {Date} [createdAt] - Created date
 * @property {string} [createdBy_uid] - User who created event
 * @property {string} name - Name
 * @property {string} [note] - Note
 * @property {import('../enums.js').AuditEventType} [type] - Audit event type
 * @property {boolean} [pinned] - Pinned
 * @property {object} [messageRecipient] - Message recipient
 * @property {string} [messageTemplate] - Message template
 * @property {Array} [updatedFields] - Updated fields
 * @property {string} [outcome] - Outcome for activity type
 * @property {Date} [outcomeAt] - Date outcome invalidates
 * @property {object} [outcomeAt_] - Date outcome invalidates (from `dateInput`)
 * @property {string} [patient_uuid] - Patient UUID
 * @property {Array<string>} [programme_ids] - Programme IDs
 * @property {string} [session_id] - Session ID
 * @property {string} [vaccination_uuid] - Vaccination UUID
 */
export class AuditEvent {
  constructor(options, context) {
    this.context = context
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdBy_uid = options?.createdBy_uid
    this.name = options.name
    this.note = options.note
    this.type = options?.type
    this.pinned = stringToBoolean(options?.pinned)
    this.messageRecipient = options?.messageRecipient
    this.messageTemplate = options?.messageTemplate
    this.updatedFields = options?.updatedFields
    this.outcome = options?.outcome
    this.outcomeAt = options?.outcomeAt && new Date(options.outcomeAt)
    this.outcomeAt_ = options?.outcomeAt_
    this.patient_uuid = options?.patient_uuid
    this.programme_ids = options?.programme_ids
    this.session_id = options?.session_id
    this.team_id = options?.team_id || '001'
    this.vaccination_uuid = options?.vaccination_uuid
  }

  /**
   * Get user who created event
   *
   * @returns {User|undefined} User
   */
  get createdBy() {
    try {
      if (this.createdBy_uid) {
        return User.findOne(this.createdBy_uid, this.context)
      }
    } catch (error) {
      console.error('Upload.createdBy', error.message)
    }
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
   * @returns {object|undefined} `dateInput` object
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
      console.error('AuditEvent.patient', error.message)
    }
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

  /**
   * Get session
   *
   * @returns {Session|undefined} Session
   */
  get session() {
    try {
      return Session.findOne(this.session_id, this.context)
    } catch (error) {
      console.error('AuditEvent.session', error.message)
    }
  }

  /**
   * Get team
   *
   * @returns {Team|undefined} Team
   */
  get team() {
    try {
      return Team.findOne(this.team_id, this.context)
    } catch (error) {
      console.error('AuditEvent.team', error.message)
    }
  }

  /**
   * Get vaccination
   *
   * @returns {Vaccination|undefined} Vaccination
   */
  get vaccination() {
    try {
      if (this.vaccination_uuid) {
        return Vaccination.findOne(this.vaccination_uuid, this.context)
      }
    } catch (error) {
      console.error('AuditEvent.vaccination', error.message)
    }
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
      return `Vaccination given ${this.vaccination.formatted.createdAt_date} by ${this.vaccination.formatted.createdBy}.<br>Record added to Mavis ${this.formatted.createdAt} by ${this.formatted.createdBy}.`
    } else if (this.createdBy_uid) {
      return [this.formatted.createdAt, this.formatted.createdBy].join(` · `)
    }

    return this.formatted.createdAt
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return {
      createdAt: formatDate(this.createdAt, { dateStyle: 'long' }),
      createdBy: this.createdBy_uid && this.createdBy.fullName,
      datetime: formatDate(this.createdAt, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      note: this.note && formatMarkdown(this.note),
      outcome: this.outcome && formatTag(getScreenOutcomeStatus(this.outcome)),
      outcomeAt:
        this.outcomeAt && formatDate(this.outcomeAt, { dateStyle: 'long' }),
      programmes: this.programmes.flatMap(({ nameTag }) => nameTag).join(' ')
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'event'
  }
}
