import { Batch, Session } from '../models.js'

/**
 * @typedef {BatchOptions & object} DefaultBatchOptions
 * @property {string} [session_id] - Session ID
 */

/**
 * @class Default Batch
 * @augments Batch
 */
export class DefaultBatch extends Batch {
  static contextKey = 'defaultBatches'
  static ns = 'defaultBatch'

  /**
   * @param {DefaultBatchOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.session_id = options?.session_id
  }

  /**
   * Get session
   *
   * @returns {Session|undefined} Session
   */
  get session() {
    try {
      return Session.findOne(this.session_id, this.context)
    } catch (error) {
      console.error('DefaultBatch.session', error.message)
    }
  }

  /**
   * Add default batch to session
   *
   * @param {string} id - Batch ID
   * @param {string} session_id - Session ID
   * @param {object} context - Context
   */
  static addToSession(id, session_id, context) {
    const batch = Batch.findOne(id, context)
    delete batch?.context

    const defaultBatch = {
      ...batch,
      session_id
    }

    // Update context
    context.defaultBatches[id] = defaultBatch
  }
}

/**
 * @import { BatchOptions } from './batch.js'
 */
