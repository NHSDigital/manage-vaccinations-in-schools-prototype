import { fakerEN_GB as faker } from '@faker-js/faker'

import { Clinic, School, Team } from '../models.js'
import { formatWithSecondaryText } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} SubteamOptions
 * @property {string} [id] - Subteam ID
 * @property {string} [team_id] - Parent team ID
 * @property {string} [name] - Name
 * @property {string} [email] - Email address (else uses parent team’s)
 * @property {string} [tel] - Phone number (else uses parent team’s)
 */

/**
 * A subteam is a second level of hierarchy within a SAIS team.
 *
 * Clinics and schools can be assigned to a subteam, otherwise they remain
 * assigned to the parent team. Users always belong to the parent team.
 *
 * @class Subteam
 */
export class Subteam extends BaseModel {
  static contextKey = 'subteams'
  static identifierKey = 'id'
  static ns = 'subteam'

  /**
   * @param {SubteamOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.team_id

    /** @type {Team|undefined} */
    this.team

    this.context = context
    this.id = options?.id || faker.helpers.replaceSymbols('S###')
    this.name = options?.name
    // Keep empty strings, so that clearing a value in the edit wizard is
    // merged into the saved subteam (`BaseModel.update` ignores `undefined`)
    this.email = options?.email
    this.tel = options?.tel
  }

  /**
   * Uses parent team’s contact details for both email and phone
   *
   * @returns {boolean} Uses parent team’s contact details
   */
  get hasTeamContactDetails() {
    return !this.email && !this.tel
  }

  /**
   * Contact details choice, used to prefill the contact details form
   *
   * @returns {'team'|'subteam'} Contact details choice
   */
  get contactDetails() {
    return this.hasTeamContactDetails ? 'team' : 'subteam'
  }

  /**
   * Contact details used in communications with parents
   *
   * Uses the parent team’s name and privacy policy, and the subteam’s email
   * address and phone number, falling back to the parent team’s. Has the same
   * shape as `Team`, so can be used wherever templates expect `team`.
   *
   * @returns {{name: string, email: string, tel: string, privacyPolicyUrl: string}} Contact details
   */
  get contact() {
    return {
      name: this.team?.name,
      email: this.email || this.team?.email,
      tel: this.tel || this.team?.tel,
      privacyPolicyUrl: this.team?.privacyPolicyUrl
    }
  }

  /**
   * Get clinics assigned to subteam
   *
   * @returns {Array<Clinic>} Clinics
   */
  get clinics() {
    return Clinic.findAll(this.context)
      .filter((clinic) => clinic.subteam_id === this.id)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get schools assigned to subteam
   *
   * @returns {Array<School>} Schools
   */
  get schools() {
    return School.findAll(this.context)
      .filter((school) => school.subteam_id === this.id)
      .sort((a, b) => a.name.localeCompare(b.name))
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
            case 'email':
              return this.email
                ? this.email
                : formatWithSecondaryText(
                    this.team?.email,
                    `Same as ${this.team?.name}`
                  )
            case 'tel':
              return this.tel
                ? this.tel
                : formatWithSecondaryText(
                    this.team?.tel,
                    `Same as ${this.team?.name}`
                  )
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
    return `/teams/${this.team_id}/subteams/${this.id}`
  }
}

Subteam.relate('team_id', () => Team, 'team')

/**
 * @import { BaseModelOptions } from './base.js'
 */
