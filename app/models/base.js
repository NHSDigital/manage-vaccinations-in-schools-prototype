import _ from 'lodash'

import { User } from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  today
} from '../utils/date.js'

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
    return Object.values(context[this.contextKey]).map(
      (item) => new this(item, context)
    )
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

    return createdItem
  }

  static update(identifier, updates, context) {
    if (!context?.[this.contextKey]) return

    // Update item
    const updatedItem = _.mergeWith(
      this.findOne(identifier, context),
      updates,
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

    return new this(updatedItem, context)
  }

  static delete(identifier, context) {
    delete context?.[this.contextKey]?.[identifier]
  }
}

BaseModel.relate('createdBy_uid', () => User, 'createdBy')
BaseModel.relate('updatedBy_uid', () => User, 'updatedBy')
