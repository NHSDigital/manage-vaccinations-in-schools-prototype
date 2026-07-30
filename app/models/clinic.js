import { Location } from '../models.js'

/**
 * @class Clinic
 * @augments Location
 */
export class Clinic extends Location {
  static contextKey = 'clinics'
  static ns = 'clinic'

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/teams/${this.team_id}/clinics/${this.id}`
  }
}
