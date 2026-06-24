import { fakerEN_GB as faker } from '@faker-js/faker'

import { Patient } from '../models.js'
import { formatDate } from '../utils/date.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} NoticeOptions
 * @property {string} [uuid] - Notice UUID
 * @property {Date} [archivedAt] - Archived date
 * @property {NoticeType} [type] - Notice type
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

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.archivedAt = options?.archivedAt && new Date(options.archivedAt)
    this.type = options?.type
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

Notice.relate('patient_uuid', () => Patient, 'patient')

/**
 * @import { NoticeType } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
