import { fakerEN_GB as faker } from '@faker-js/faker'

import { Patient } from '../models.js'
import { formatDate } from '../utils/date.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} NoticeOptions
 * @property {string} [uuid] - Notice UUID
 * @property {Date} [archivedAt] - Archived date
 * @property {NoticeType} [type] - Notice type
 * @property {string} [patient_uuid] - Patient notice applies to
 */

/**
 * @class Notice
 */
export class Notice extends BaseModel {
  static contextKey = 'notices'
  static ns = 'notice'

  /**
   * @param {BaseModelOptions & NoticeOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
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
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/notices/${this.uuid}`
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
 * @import { BaseModelOptions } from './base.js'
 */
