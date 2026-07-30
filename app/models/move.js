import { fakerEN_GB as faker } from '@faker-js/faker'

import { Patient, School, Team } from '../models.js'
import { formatDate } from '../utils/date.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} MoveOptions
 * @property {string} [uuid] - Move UUID
 * @property {boolean} [isIgnored] - Reported move is ignored
 * @property {MoveSource} [source] - Reporting source
 */

/**
 * @class Move
 */
export class Move extends BaseModel {
  static contextKey = 'moves'
  static identifierKey = 'uuid'
  static ns = 'move'

  /**
   * @param {MoveOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.from_urn

    /** @type {School|undefined} */
    this.from

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    /** @type {string|undefined} */
    this.team_id

    /** @type {Team|undefined} */
    this.team

    /** @type {string|undefined} */
    this.to_urn

    /** @type {School|undefined} */
    this.to

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.isIgnored = options?.isIgnored || false
    this.source = options?.source
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
          switch (prop) {
            case 'createdAt':
              return formatDate(this.createdAt, { dateStyle: 'long' })
            case 'team_id':
              return this.team?.name || 'Unknown team'
            case 'from_urn':
              return this.from?.name || 'Unknown school'
            case 'to_urn':
              return this.to?.name || 'Unknown school'
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
    Move.update(uuid, { isIgnored: true }, context)
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

Move.relate('from_urn', () => School, 'from')
Move.relate('patient_uuid', () => Patient, 'patient')
Move.relate('team_id', () => Team, 'team')
Move.relate('to_urn', () => School, 'to')

/**
 * @import { MoveSource } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
