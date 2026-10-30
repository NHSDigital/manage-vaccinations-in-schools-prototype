import { fakerEN_GB as faker } from '@faker-js/faker'

import { Programme } from '../models.js'
import { stringToArray } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ClinicInvitationOptions
 * @property {string} [id] - ClinicInvitation ID
 * @property {Array<string>} [programme_ids] - Programmes being invited for
 */

/**
 * @class ClinicInvitation
 */
export class ClinicInvitation extends BaseModel {
  static contextKey = 'clinicInvitations'
  static identifierKey = 'id'
  static ns = 'clinicInvitation'

  /**
   * @param {ClinicInvitationOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.id = options?.id ?? faker.helpers.replaceSymbols('********')

    this.programme_ids = stringToArray(options?.programme_ids)
  }

  /**
   * Get the programmes targeted by this invitation
   *
   * @returns {Array<Programme>} Programmes
   */
  get programmes() {
    return this.programme_ids
      .map((id) => Programme.findOne(id, this.context))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Generate a site-relative booking URL for a child with the given eligibility
   *
   * @param {Array<string>} eligibleProgramme_ids - Programmes the child is eligible for at clinic
   * @returns {string} Path to start of clinic booking journey for given programme
   */
  generateUriForEligibleProgrammes(eligibleProgramme_ids = this.programme_ids) {
    const searchParams = new URLSearchParams()

    const inviteProgramme_ids = eligibleProgramme_ids.filter((id) =>
      this.programme_ids.includes(id)
    )
    for (const inviteProgramme_id of inviteProgramme_ids) {
      searchParams.append('programme_id', inviteProgramme_id)
    }

    return `/book-into-a-clinic/?${searchParams.toString()}`
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
            case 'programmes':
              return this.programmes.map(({ nameTag }) => nameTag).join(' ')
            default:
              return undefined
          }
        }
      }
    )
  }
}

/**
 * @import { BaseModelOptions } from './base.js'
 */
