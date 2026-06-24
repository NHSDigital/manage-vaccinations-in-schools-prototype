import { fakerEN_GB as faker } from '@faker-js/faker'

import programmesData from '../datasets/programmes.js'
import { SessionPresets } from '../enums.js'
import { Programme, Team } from '../models.js'

/**
 * @typedef {object} LocationOptions
 * @property {string} [name] - Name
 * @property {string} [id] - Location ID
 * @property {string} [addressLine1] - Address line 1
 * @property {string} [addressLine2] - Address line 2
 * @property {string} [addressLevel1] - Address level 1
 * @property {string} [postalCode] - Postcode
 * @property {string} [team_id] - Team ID
 * @property {Array<SessionPresetName>} [presetNames] - Session preset names
 */

/**
 * @class Location
 */
export class Location {
  /**
   * @param {LocationOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    this.context = context
    this.id = options?.id || faker.helpers.replaceSymbols('?#####')
    this.name = options?.name
    this.addressLine1 = options?.addressLine1
    this.addressLine2 = options?.addressLine2
    this.addressLevel1 = options?.addressLevel1
    this.postalCode = options?.postalCode
    this.team_id = options?.team_id
    this.presetNames = options?.presetNames || []
  }

  /**
   * Get address
   *
   * @returns {object|undefined} Address
   */
  get address() {
    if (this.addressLine1 || this.addressLevel1 || this.postalCode) {
      return {
        addressLine1: this.addressLine1,
        addressLine2: this.addressLine2,
        addressLevel1: this.addressLevel1,
        postalCode: this.postalCode
      }
    }
  }

  /**
   * Get location (name and address)
   *
   * @returns {object} Location
   */
  get location() {
    return {
      name: this.name,
      ...this.address
    }
  }

  /**
   * Get team
   *
   * @returns {Team|undefined} Team
   */
  get team() {
    try {
      const team = this.context?.teams[this.team_id]
      if (team) {
        return new Team(team)
      }
    } catch (error) {
      console.error('Location.team', error.message)
    }
  }

  /**
   * Get session presets
   *
   * @returns {Array<SessionPreset>} Patient sessions
   */
  get presets() {
    return SessionPresets.filter((sessionPreset) =>
      this.presetNames.includes(sessionPreset.name)
    )
  }

  /**
   * Get programme ids
   *
   * @returns {Array<string>} Programme IDs
   */
  get programme_ids() {
    const programme_ids = new Set()
    for (const preset of this.presets) {
      for (const programmeType of preset.programmeTypes) {
        const programme = programmesData[programmeType]
        programme_ids.add(programme.id)
      }
    }

    return [...programme_ids]
  }

  /**
   * Get session programmes
   *
   * @returns {Array<Programme>} Programmes
   */
  get programmes() {
    return this.programme_ids
      .map((id) => Programme.findOne(id, this.context))
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
          const getAddress = () =>
            this.address &&
            Object.values(this.address).filter(Boolean).join(', ')

          switch (prop) {
            case 'address':
              return getAddress()
            case 'location':
              return Object.values(this.location).filter(Boolean).join(', ')
            case 'nameAndAddress':
              return this.address
                ? `<span>${this.name}</br>
            <span class="nhsuk-u-secondary-text-colour">${getAddress()}</span>
          </span>`
                : this.name
            case 'programmes':
              return this.programmes
                .flatMap((programme) => programme?.nameTag)
                .join(' ')
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
    return 'location'
  }
}

/**
 * @import { SessionPreset, SessionPresetName } from '../enums.js'
 */
