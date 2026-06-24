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

    /** @type {string|undefined} */
    this.session_id

    /** @type {Session|undefined} */
    this.session
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

DefaultBatch.relate('session_id', () => Session, 'session')

/**
 * @import { BatchOptions } from './batch.js'
 */
