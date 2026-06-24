import { fakerEN_GB as faker } from '@faker-js/faker'

import { Patient } from '../models.js'
import { formatDate, getDateValueDifference, today } from '../utils/date.js'

/**
 * @typedef {object} NoticeOptions
 * @property {string} [uuid] - Notice UUID
 * @property {Date} [createdAt] - Created date
 * @property {Date} [archivedAt] - Archived date
 * @property {NoticeType} [type] - Notice type
 * @property {string} [patient_uuid] - Patient notice applies to
 */

/**
 * @class Notice
 */
export class Notice {
  /**
   * @param {NoticeOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.archivedAt = options?.archivedAt && new Date(options.archivedAt)
    this.type = options?.type
    this.patient_uuid = options?.patient_uuid
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
      console.error('Notice.patient', error.message)
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
          switch (prop) {
            case 'createdAt':
              return formatDate(this.createdAt, { dateStyle: 'long' })
            default:
              return undefined
          }
        }
      }
    )
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'notice'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/notices/${this.uuid}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Notice>|undefined} Notices
   * @static
   */
  static findAll(context) {
    return Object.values(context.notices)
      .map((notice) => new Notice(notice, context))
      .sort((a, b) => getDateValueDifference(a.createdAt, b.createdAt))
  }

  /**
   * Find one
   *
   * @param {string} uuid - Notice UUID
   * @param {object} context - Context
   * @returns {Notice|undefined} Notice
   * @static
   */
  static findOne(uuid, context) {
    if (context?.notices?.[uuid]) {
      return new Notice(context.notices[uuid], context)
    }
  }

  /**
   * Archive
   *
   * @param {string} uuid - Notice UUID
   * @param {object} context - Context
   * @returns {Notice} Notice
   * @static
   */
  static archive(uuid, context) {
    const archivedNotice = Notice.findOne(uuid, context)
    archivedNotice.archivedAt = new Date()

    // Remove notice context
    delete archivedNotice.context

    // Update context
    context.notices[uuid] = archivedNotice

    return archivedNotice
  }
}

/**
 * @import { NoticeType } from '../enums.js'
 */
