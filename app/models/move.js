import { fakerEN_GB as faker } from '@faker-js/faker'

import schools from '../datasets/schools.js'
import { Patient, Team } from '../models.js'
import { formatDate } from '../utils/date.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} MoveOptions
 * @property {string} [uuid] - Move UUID
 * @property {boolean} [ignored] - Reported move is ignored
 * @property {MoveSource} [source] - Reporting source
 * @property {string} [team_id] - Team ID (moving from)
 * @property {string} [from_urn] - Current school URN (moving from)
 * @property {string} [to_urn] - Proposed school URN (moving to)
 * @property {string} [patient_uuid] - Patient UUID
 */

/**
 * @class Move
 */
export class Move extends BaseModel {
  static contextKey = 'moves'
  static ns = 'move'

  /**
   * @param {MoveOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.ignored = options?.ignored || false
    this.source = options?.source
    this.team_id = options?.team_id
    this.from_urn = options?.from_urn
    this.to_urn = options?.to_urn
    this.patient_uuid = options?.patient_uuid
  }

  /**
   * Get patient
   *
   * @returns {Patient|undefined} Patient
   */
  get patient() {
    try {
      if (this.patient_uuid) {
        return Patient.findOne(this.patient_uuid, this.context)
      }
    } catch (error) {
      console.error('Move.patient', error.message)
    }
  }

  get movement() {
    return `<span><span class="nhsuk-u-secondary-text-colour nhsuk-u-font-size-16">${this.source} updated</span><br>${this.formatted.from_urn}<br><span class="nhsuk-u-secondary-text-colour nhsuk-u-font-size-16">to</span> ${this.formatted.to_urn}</span>`
  }

  get movementForImport() {
    return `<span>${this.formatted.from_urn}<br><span class="nhsuk-u-secondary-text-colour nhsuk-u-font-size-16">to</span> ${this.formatted.to_urn}</span>`
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
          const getTeam = () => Team.findOne(this.team_id, this.context)

          switch (prop) {
            case 'createdAt':
              return formatDate(this.createdAt, { dateStyle: 'long' })
            case 'team_id':
              return this.team_id ? getTeam()?.name : 'Unknown team'
            case 'from_urn':
              return schools[this.from_urn]?.name || 'Unknown school'
            case 'to_urn':
              return schools[this.to_urn]?.name || 'Unknown school'
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
    return `/moves/${this.uuid}`
  }

  /**
   * Ignore move
   *
   * @param {string} uuid - Move UUID
   * @param {object} context - Context
   */
  ignore(uuid, context) {
    Move.update(uuid, { ignored: true }, context)
  }

  /**
   * Switch patient’s school
   *
   * @param {string} uuid - Move UUID
   * @param {object} context - Context
   */
  switch(uuid, context) {
    const move = Move.findOne(uuid, context)

    context.patients[move.patient_uuid].school_id = move.to_urn

    Move.delete(uuid, context)
  }
}

/**
 * @import { MoveSource } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
