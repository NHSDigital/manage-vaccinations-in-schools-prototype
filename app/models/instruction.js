import { fakerEN_GB as faker } from '@faker-js/faker'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} InstructionOptions
 * @property {string} [uuid] - Instruction UUID
 * @property {InstructionOutcome} [outcome] - Outcome
 * @property {string} [patientSession_uuid] - Patient session UUID
 * @property {string} [programme_id] - Programme ID
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

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.patientSession_uuid = options?.patientSession_uuid
    this.programme_id = options?.programme_id
  }
}

/**
 * @import { InstructionOutcome } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
