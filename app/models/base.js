import _ from 'lodash'

import { User } from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  today
} from '../utils/date.js'

// Caches the results of findAll() per context object, so repeated calls
// within the same request (e.g. the same req.session.data reference) reuse
// the already-constructed instances instead of rebuilding them from raw
// JSON every time. Entries are invalidated on create/update/delete, and are
// naturally garbage-collected once their context object is no longer
// referenced (e.g. at the end of a request).
const findAllCache = new WeakMap()

/**
 * @class BaseModel
 */
export class BaseModel {
  static contextKey = ''
  static foreignKeys = {}
  static identifierKey = ''
  static ns = ''

  /**
   * @param {object} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    /** @type {string|undefined} */
    this.createdBy_uid

    /** @type {User|undefined} */
    this.createdBy

    /** @type {string|undefined} */
    this.updatedBy_uid

    /** @type {User|undefined} */
    this.updatedBy

    this.context = context
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdAt_ = options?.createdAt_
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.updatedAt_ = options?.updatedAt_

    // Assign foreign key properties from options
    for (const key of Object.keys(
      /** @type {typeof BaseModel} */ (this.constructor).foreignKeys
    )) {
      this[key] = options?.[key]
    }
  }

  get createdAt_() {
    return convertIsoDateToObject(this.createdAt)
  }

  set createdAt_(object) {
    if (object) {
      this.createdAt = convertObjectToIsoDate(object)
    }
  }

  get ns() {
    return /** @type {typeof BaseModel} */ (this.constructor).ns
  }

  static relate(key, getModel, as) {
    this.foreignKeys = { ...this.foreignKeys, [key]: getModel }

    Object.defineProperty(this.prototype, as, {
      get() {
        return getModel().findOne(this[key], this.context)
      },
      set(updates) {
        getModel().update(this[key], updates, this.context)
      },
      configurable: true,
      enumerable: false
    })
  }

  toJSON() {
    const { context, ...rest } = this
    return rest
  }

  static findAll(context) {
    if (!context?.[this.contextKey]) return []

    let contextCache = findAllCache.get(context)
    if (!contextCache) {
      contextCache = new Map()
      findAllCache.set(context, contextCache)
    }

    if (!contextCache.has(this.contextKey)) {
      contextCache.set(
        this.contextKey,
        Object.values(context[this.contextKey]).map(
          (item) => new this(item, context)
        )
      )
    }

    return contextCache.get(this.contextKey)
  }

  static findOne(identifier, context) {
    if (context?.[this.contextKey]?.[identifier]) {
      return new this(context[this.contextKey][identifier], context)
    }
  }

  static create(options, context) {
    const createdItem = new this(options)

    // Update context
    context[this.contextKey] = context[this.contextKey] || {}
    context[this.contextKey][`${createdItem[this.identifierKey]}`] = createdItem

    findAllCache.get(context)?.delete(this.contextKey)

    return createdItem
  }

  static update(identifier, updates, context) {
    if (!context?.[this.contextKey]) return

    // Never merge `updates.context` into the target - it’s model plumbing,
    // not domain data, and `updates` may belong to a model instance built
    // against a different (e.g. much larger) context than `context` here.
    const { context: _updatesContext, ...cleanUpdates } = updates ?? {}

    // Update item
    const updatedItem = _.mergeWith(
      this.findOne(identifier, context),
      cleanUpdates,
      (oldValue, newValue) => {
        // Arrays shouldn’t be merged but replaced entirely
        if (Array.isArray(oldValue)) return newValue
      }
    )
    updatedItem.updatedAt = today()

    // Remove item context
    delete updatedItem.context

    // Delete original item (with previous identifier)
    this.delete(identifier, context)

    // Update context
    context[this.contextKey][identifier] = updatedItem
    findAllCache.get(context)?.delete(this.contextKey)

    return new this(updatedItem, context)
  }

  static delete(identifier, context) {
    delete context?.[this.contextKey]?.[identifier]
    findAllCache.get(context)?.delete(this.contextKey)
  }
}

BaseModel.relate('createdBy_uid', () => User, 'createdBy')
BaseModel.relate('updatedBy_uid', () => User, 'updatedBy')
