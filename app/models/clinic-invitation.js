import { fakerEN_GB as faker } from '@faker-js/faker'
import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { Programme, Session } from '../models.js'
import { formatList, stringToArray } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ClinicInvitationOptions
 * @property {string} [id] - ClinicInvitation ID
 * @property {Array<string>} [programme_ids] - Programmes being invited for
 * @property {Array<ClinicType>} [clinicTypes] - The types of clinic to offer when booking
 * @property {Array<string>} [restrictedClinic_ids] - IDs of restricted clinic sessions the parent can book
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
    this.clinicTypes = stringToArray(options?.clinicTypes)
    this.restrictedClinic_ids = stringToArray(options?.restrictedClinic_ids)
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
    searchParams.append('invitation_id', this.id)

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
            case 'clinicTypes':
              return this.clinicTypes?.length === 1
                ? `${this.clinicTypes[0]} clinics only`
                : `${prototypeFilters.formatList(
                    this.clinicTypes.map((clinicType, index) =>
                      index === 0 ? clinicType : clinicType.toLowerCase()
                    )
                  )} clinics`
            case 'restrictedClinics':
              return this.restrictedClinic_ids?.length
                ? formatList(
                    this.restrictedClinic_ids.map(
                      (id) => Session.findOne(id, this.context)?.name
                    )
                  )
                : undefined
            default:
              return undefined
          }
        }
      }
    )
  }
}

/**
 * @import { ClinicType } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
