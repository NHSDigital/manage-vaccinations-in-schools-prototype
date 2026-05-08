import { fakerEN_GB as faker } from '@faker-js/faker'

import { today } from '../utils/date.js'

/**
 * @class Instruction
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {object} [context] - Global context
 * @property {string} uuid - UUID
 * @property {Date} [createdAt] - Created date
 * @property {string} [createdBy_uid] - User who performed instruction
 * @property {import('../enums.js').InstructionOutcome} [outcome] - Outcome
 * @property {string} [patientSession_uuid] - Patient session UUID
 * @property {string} [programme_id] - Programme ID
 */
export class Instruction {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdBy_uid = options?.createdBy_uid
    this.patientSession_uuid = options?.patientSession_uuid
    this.programme_id = options?.programme_id
  }

  /**
   * Find one
   *
   * @param {string|string[]} uuid - Instruction UUID
   * @param {object} context - Context
   * @returns {Instruction|undefined} Instruction
   * @static
   */
  static findOne(uuid, context) {
    uuid = String(uuid)

    if (context?.instructions?.[uuid]) {
      return new Instruction(context.instructions[uuid], context)
    }
  }

  /**
   * Create
   *
   * @param {object} instruction - Instruction
   * @param {object} context - Context
   * @returns {Instruction} Created instruction
   * @static
   */
  static create(instruction, context) {
    const createdInstruction = new Instruction(instruction)

    // Update context
    context.instructions = context.instructions || {}
    context.instructions[createdInstruction.uuid] = createdInstruction

    return createdInstruction
  }
}
