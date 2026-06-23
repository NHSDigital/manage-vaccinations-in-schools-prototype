import { fakerEN_GB as faker } from '@faker-js/faker'

import { Batch } from '../models.js'
import { getDateValueDifference } from '../utils/date.js'
import {
  formatCode,
  formatHealthQuestions,
  formatList,
  formatMillilitres
} from '../utils/string.js'

/**
 * @typedef {object} VaccineOptions
 * @property {string} [snomed] - SNOMED code
 * @property {string} [type] - Type
 * @property {string} [brand] - Brand
 * @property {string} [manufacturer] - Manufacturer
 * @property {object} [leaflet] - Leaflet
 * @property {number} [dose] - Dosage
 * @property {VaccineCriteria} [criteria] - Criteria
 * @property {VaccineMethod} [method] - Method
 * @property {Array<VaccineSideEffect>} [sideEffects] - Side effects
 * @property {object} [healthQuestions] - Health questions
 * @property {Array<PreScreenQuestion>} [preScreenQuestions] - Pre-screening questions
 */

/**
 * @class Vaccine
 */
export class Vaccine {
  /**
   * @param {VaccineOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    this.context = context
    this.snomed = options?.snomed || faker.string.numeric(14)
    this.type = options?.type
    this.brand = options?.brand
    this.manufacturer = options?.manufacturer
    this.leaflet = options?.leaflet
    this.dose = options?.dose
    this.criteria = options?.criteria
    this.method = options?.method
    this.sideEffects = options?.sideEffects
    this.healthQuestions = options?.healthQuestions
    this.preScreenQuestions = options?.preScreenQuestions
  }

  /**
   * Get brand with vaccine type
   *
   * @returns {string} Brand with vaccine type
   */
  get brandWithType() {
    return `${this.brand} (${this.type})`
  }

  /**
   * Get vaccine batches
   *
   * @returns {Array<Batch>|undefined} Batches
   */
  get batches() {
    try {
      return Object.values(this.context.batches)
        .filter((batch) => batch.vaccine_snomed === this.snomed)
        .map((batch) => new Batch(batch))
        .sort((a, b) => getDateValueDifference(a.expiry, b.expiry))
    } catch (error) {
      console.error('Vaccine.batches', error.message)
    }
  }

  /**
   * Get flattened health questions (moves sub-questions to top-level)
   *
   * @returns {object} Health questions
   */
  get flatHealthQuestions() {
    return Object.fromEntries(
      Object.entries(this.healthQuestions).flatMap(([key, value]) => {
        if (value.conditional) {
          return [[key, {}], ...Object.entries(value.conditional)]
        }

        return [[key, value]]
      })
    )
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
            case 'snomed':
              return formatCode(this.snomed)
            case 'healthQuestions':
              return formatHealthQuestions(this.healthQuestions)
            case 'preScreenQuestions':
              return formatList(this.preScreenQuestions)
            case 'sideEffects':
              return formatList(this.sideEffects)
            case 'dose':
              return formatMillilitres(this.dose)
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
    return 'vaccine'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/vaccines/${this.snomed}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Vaccine>|undefined} Vaccines
   * @static
   */
  static findAll(context) {
    return Object.values(context.vaccines).map(
      (vaccine) => new Vaccine(vaccine, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} snomed - SNOMED code
   * @param {object} context - Context
   * @returns {Vaccine|undefined} Vaccine
   * @static
   */
  static findOne(snomed, context) {
    if (context?.vaccines?.[snomed]) {
      return new Vaccine(context.vaccines[snomed], context)
    }
  }

  /**
   * Delete
   *
   * @param {string} snomed - SNOMED code
   * @param {object} context - Context
   * @static
   */
  static delete(snomed, context) {
    delete context.vaccines[snomed]
  }
}

/**
 * @import { PreScreenQuestion, VaccinationProtocol, VaccineCriteria, VaccineSideEffect, VaccineMethod } from '../enums.js'
 */
