import { Batch, Session } from '../models.js'

/**
 * @typedef {object} DefaultBatchOptions
 * @property {string} [session_id] - Session ID
 */

/**
 * @class Default Batch
 * @augments Batch
 */
export class DefaultBatch extends Batch {
  /**
   * @param {DefaultBatchOptions & BatchOptions} options - Options
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
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'defaultBatch'
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<DefaultBatch>|undefined} Default batches
   * @static
   */
  static findAll(context) {
    return Object.values(context.defaultBatches).map(
      (batch) => new DefaultBatch(batch, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} id - Default batch ID
   * @param {object} context - Context
   * @returns {DefaultBatch|undefined} Default batch
   * @static
   */
  static findOne(id, context) {
    if (context?.defaultBatches?.[id]) {
      return new DefaultBatch(context.defaultBatches[id], context)
    }
  }

  /**
   * Delete
   *
   * @param {string} id - Default batch ID
   * @param {object} context - Context
   * @static
   */
  static delete(id, context) {
    delete context.defaultBatches[id]
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
