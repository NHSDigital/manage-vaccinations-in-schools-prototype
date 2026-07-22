import { fakerEN_GB as faker } from '@faker-js/faker'

import { Patient, Programme } from '../models.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} InstructionOptions
 * @property {string} [uuid] - Instruction UUID
 * @property {InstructionOutcome} [outcome] - Outcome
 */

/**
 * @class Instruction
 */
export class Instruction extends BaseModel {
  static contextKey = 'instructions'
  static identifierKey = 'uuid'
  static ns = 'instruction'

  /**
   * @param {BaseModelOptions & InstructionOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    /** @type {string|undefined} */
    this.programme_id

    /** @type {Programme|undefined} */
    this.programme

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
  }
}

Instruction.relate('patient_uuid', () => Patient, 'patient')
Instruction.relate('programme_id', () => Programme, 'programme')

/**
 * @import { InstructionOutcome } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
