import { fakerEN_GB as faker } from '@faker-js/faker'

import { Batch } from '../models.js'
import { getDateValueDifference } from '../utils/date.js'
import {
  formatCode,
  formatHealthQuestions,
  formatList,
  formatMillilitres
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} VaccineOptions
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
export class Vaccine extends BaseModel {
  static contextKey = 'vaccines'
  static ns = 'vaccine'

  /**
   * @param {VaccineOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

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
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/vaccines/${this.snomed}`
  }
}

/**
 * @import { PreScreenQuestion, VaccinationProtocol, VaccineCriteria, VaccineSideEffect, VaccineMethod } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
