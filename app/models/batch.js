import { fakerEN_GB as faker } from '@faker-js/faker'
import { isBefore } from 'date-fns'

import { Vaccine } from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  today
} from '../utils/date.js'
import { formatCode } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} BatchOptions
 * @property {string} [id] - Batch ID
 * @property {Date} [archivedAt] - Archived date
 * @property {Date} [expiry] - Expiry date
 * @property {object} [expiry_] - Expiry date (from `dateInput`)
 * @property {string} [vaccine_snomed] - Vaccine SNOMED code
 */

/**
 * @class Batch
 * @augments BaseModel
 */
export class Batch extends BaseModel {
  static contextKey = 'batches'
  static identifierKey = 'id'
  static ns = 'batch'

  /**
   * @param {BatchOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.context = context
    this.id = options?.id || faker.helpers.replaceSymbols('??####')
    this.archivedAt = options?.archivedAt && new Date(options.archivedAt)
    this.expiry = options?.expiry ? new Date(options.expiry) : undefined
    this.expiry_ = options?.expiry_
    this.vaccine_snomed = options?.vaccine_snomed
  }

  /**
   * Get expiry date for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get expiry_() {
    return convertIsoDateToObject(this.expiry)
  }

  /**
   * Set expiry date from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set expiry_(object) {
    if (object) {
      this.expiry = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get name
   *
   * @returns {string} Name
   */
  get name() {
    return `${this.formatted.id} (${this.formatted.expiry})`
  }

  /**
   * Get summary (name and expiry)
   *
   * @returns {string} Name
   */
  get summary() {
    const prefix = isBefore(this.archivedAt, today()) ? 'Expired' : 'Expires'

    return `${this.formatted.id}<br>\n<span class="nhsuk-u-secondary-text-colour">${prefix} ${this.formatted.expiry}</span>`
  }

  /**
   * Get vaccine this batch belongs to
   *
   * @returns {Vaccine|undefined} Vaccine
   */
  get vaccine() {
    try {
      const vaccine = this.context?.vaccines[this.vaccine_snomed]
      if (vaccine) {
        return new Vaccine(vaccine)
      }
    } catch (error) {
      console.error('Batch.vaccine', error.message)
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
            case 'updatedAt':
              return formatDate(this.updatedAt, { dateStyle: 'long' })
            case 'expiry':
              return formatDate(this.expiry, { dateStyle: 'long' })
            case 'id':
              return formatCode(this.id)
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
    return `/vaccines/${this.vaccine_snomed}/batches/${this.id}`
  }

  /**
   * Archive
   *
   * @param {string} id - Batch ID
   * @param {object} context - Context
   * @returns {Batch} Batch
   * @static
   */
  static archive(id, context) {
    const archivedBatch = Batch.findOne(id, context)
    archivedBatch.archivedAt = new Date()

    // Remove batch context
    delete archivedBatch.context

    // Update context
    context.batches[id] = archivedBatch

    return archivedBatch
  }
}

/**
 * @import { BaseModelOptions } from './base.js'
 */
