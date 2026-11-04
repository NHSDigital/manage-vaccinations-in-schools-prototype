import { Location } from '../models.js'
import { formatMarkdown } from '../utils/string.js'

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

  /**
   * Get formatted values
   *
   * Returns `null` for missing codes and clinic information so that summary rows still show,
   * with a link to add a value.
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const formatted = super.formatted

    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          switch (prop) {
            case 'odsCode':
              return this.odsCode || null
            case 'carePlusCode':
              return this.carePlusCode || null
            case 'venueInformation':
              return this.venueInformation
                ? formatMarkdown(this.venueInformation, { inline: true })
                : null
            default:
              return formatted[prop]
          }
        }
      }
    )
  }
}

/**
 * @import { LocationOptions } from './location.js'
 */
