import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  ConsentRequestStatus,
  NotifyEmailStatus,
  NotifySmsStatus
} from '../enums.js'
import { Contact, Patient, Programme, Session } from '../models.js'
import { formatDate } from '../utils/date.js'
import { getConsentRequestStatusProperties } from '../utils/enum-properties.js'
import { formatTag } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ConsentRequestOptions
 * @property {string} [uuid] - Consent request UUID
 * @property {string} [programme_ids] - Programme IDs
 * @property {string} [reply_uuids] - Consent response UUIDs
 */

/**
 * @class ConsentRequest
 */
export class ConsentRequest extends BaseModel {
  static contextKey = 'consentRequests'
  static identifierKey = 'uuid'
  static ns = 'consentRequest'

  /**
   * @param {ConsentRequestOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.contact_uuid

    /** @type {Contact|undefined} */
    this.contact

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    /** @type {string|undefined} */
    this.session_id

    /** @type {Session|undefined} */
    this.session

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.programme_ids = options?.programme_ids || []
  }

  /**
   * Get the programmes targeted by this request
   *
   * @returns {Array<Programme>} Programmes
   */
  get programmes() {
    return this.programme_ids
      .map((id) => Programme.findOne(id, this.context))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Can this consent request be delivered?
   *
   * @returns {boolean} Request can be delivered
   */
  get canDeliver() {
    const hasEmailGotEmail =
      !!this.contact?.email &&
      this.contact?.emailStatus === NotifyEmailStatus.Delivered
    const hasTelSmsGotSms =
      !!this.contact?.tel &&
      this.contact?.smsStatus === NotifySmsStatus.Delivered

    return hasEmailGotEmail || hasTelSmsGotSms
  }

  /**
   * Get status
   *
   * @returns {ConsentRequestStatus} Consent request status
   */
  get status() {
    return this.canDeliver
      ? ConsentRequestStatus.NoResponse
      : ConsentRequestStatus.NotDelivered
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
              return formatDate(this.createdAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'status':
              return formatTag(getConsentRequestStatusProperties(this.status))
            default:
              return undefined
          }
        }
      }
    )
  }
}

ConsentRequest.relate('contact_uuid', () => Contact, 'contact')
ConsentRequest.relate('patient_uuid', () => Patient, 'patient')
ConsentRequest.relate('session_id', () => Session, 'session')

/**
 * @import { BaseModelOptions } from './base.js'
 */
