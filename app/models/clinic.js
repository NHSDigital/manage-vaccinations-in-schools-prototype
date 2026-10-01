import { Location } from '../models.js'

/**
 * @typedef {LocationOptions & object} ClinicOptions
 * @property {string} [odsCode] - ODS venue code
 * @property {string} [carePlusCode] - CarePlus venue code
 */

/**
 * @class Clinic
 * @augments Location
 */
export class Clinic extends Location {
  static contextKey = 'clinics'
  static ns = 'clinic'

  /**
   * @param {ClinicOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.odsCode = options?.odsCode
    this.carePlusCode = options?.carePlusCode
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/teams/${this.team_id}/clinics/${this.id}`
  }
}

/**
 * @import { LocationOptions } from './location.js'
 */
