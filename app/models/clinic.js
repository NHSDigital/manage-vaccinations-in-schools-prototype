import { Location } from '../models.js'

/**
 * @class Clinic
 * @augments Location
 */
export class Clinic extends Location {
  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'clinic'
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
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Clinic>|undefined} All clinics on the context
   * @static
   */
  static findAll(context) {
    return Object.values(context.clinics).map(
      (clinic) => new Clinic(clinic, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} id - Clinic ID
   * @param {object} context - Context
   * @returns {Clinic|undefined} Clinic
   * @static
   */
  static findOne(id, context) {
    if (context?.clinics?.[id]) {
      return new Clinic(context.clinics[id], context)
    }
  }

  /**
   * Create
   *
   * @param {Clinic} clinic - Clinic
   * @param {object} context - Context
   * @returns {Clinic} Created clinic
   * @static
   */
  static create(clinic, context) {
    const createdClinic = new Clinic(clinic)

    // Add to team
    context.teams[createdClinic.team_id].clinic_ids.push(createdClinic.id)

    // Update context
    context.clinics = context.clinics || {}
    context.clinics[createdClinic.id] = createdClinic

    return createdClinic
  }

  /**
   * Update
   *
   * @param {string} id - Clinic ID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Clinic} Updated clinic
   * @static
   */
  static update(id, updates, context) {
    const updatedClinic = Object.assign(Clinic.findOne(id, context), updates)

    // Remove clinic context
    delete updatedClinic.context

    // Delete original clinic (with previous ID)
    delete context.clinics[id]

    // Update context
    context.clinics[updatedClinic.id] = updatedClinic

    return updatedClinic
  }

  /**
   * Delete
   *
   * @param {string} id - Clinic ID
   * @param {object} context - Context
   * @static
   */
  static delete(id, context) {
    const clinic = Clinic.findOne(id, context)

    // Remove from team
    context.teams[clinic.team_id].clinic_ids = context.teams[
      clinic.team_id
    ].clinic_ids.filter((item) => item !== id)

    delete context.clinics[id]
  }
}
