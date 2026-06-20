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
  static identifierKey = ''
  static ns = ''

  /**
   * @param {object} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    this.context = context
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdAt_ = options?.createdAt_
    this.createdBy_uid = options?.createdBy_uid
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.updatedAt_ = options?.updatedAt_
    this.updatedBy_uid = options?.updatedBy_uid
  }

  get createdBy() {
    return User.findOne(this.createdBy_uid, this.context)
  }

  get createdAt_() {
    return convertIsoDateToObject(this.createdAt)
  }

  set createdAt_(object) {
    if (object) {
      this.createdAt = convertObjectToIsoDate(object)
    }
  }

  get updatedBy() {
    return User.findOne(this.updatedBy_uid, this.context)
  }

  get ns() {
    return /** @type {typeof BaseModel} */ (this.constructor).ns
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
