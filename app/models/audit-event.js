import { isBefore } from 'date-fns'

import { Programme, User } from '../models.js'
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
 * @property {boolean} [pinned] - Pinned
 * @property {AuditEventType} [type] - Audit event type
 * @property {string} [outcome] - Outcome for activity type
 * @property {Date} [outcomeAt] - Date outcome invalidates
 * @property {object} [outcomeAt_] - Date outcome invalidates (from `dateInput`)
 * @property {Array<string>} [programme_ids] - Programme IDs
 */
export class AuditEvent {
  constructor(options, context) {
    this.context = context
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdBy_uid = options?.createdBy_uid
    this.name = options.name
    this.note = options.note
    this.pinned = stringToBoolean(options?.pinned)
    this.type = options?.type
    this.outcome = options?.outcome
    this.outcomeAt = options?.outcomeAt && new Date(options.outcomeAt)
    this.outcomeAt_ = options?.outcomeAt_
    this.programme_ids = options?.programme_ids
  }

  /**
   * Get user who created event
   *
   * @returns {User} User
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
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const datetime = formatDate(this.createdAt, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    return {
      createdAt: formatDate(this.createdAt, { dateStyle: 'long' }),
      createdAtAndBy: this.createdBy
        ? [datetime, this.createdBy.fullName].join(` · `)
        : datetime,
      datetime,
      note:
        this.note && `<blockquote>${formatMarkdown(this.note)}</blockquote>`,
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
