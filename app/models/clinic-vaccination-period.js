import { fakerEN_GB as faker } from '@faker-js/faker'
import _ from 'lodash'

import { Session } from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate
} from '../utils/date.js'

/**
 * @class ClinicVaccinationPeriod
 * @param {object} options - property values
 * @param {object} [context] - data context
 * @property {object} [context] - data context
 * @property {string} uuid - Vaccination period UUID
 * @property {string} session_id - ID of the clinic session to which this belongs
 * @property {Date} [startAt] - Start time of first appointment slot
 * @property {Date} [startAt_] - Start time of first appointment slot, from dateInput - see getter/setter
 * @property {Date} [endAt] - End time of final appointment slot
 * @property {Date} [endAt_] - End time of final appointment slot, from dateInput - see getter/setter
 * @property {number} [vaccinatorCount] - The number of staff vaccinating in parallel during this period
 */
export class ClinicVaccinationPeriod {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.session_id = options?.session_id

    this.startAt = options?.startAt && new Date(options.startAt)
    this.startAt_ = options?.startAt_
    this.endAt = options?.endAt && new Date(options.endAt)
    this.endAt_ = options?.endAt_

    this.vaccinatorCount = options?.vaccinatorCount
  }

  /**
   * Get the total number of appointments that can be booked in this period
   *
   * @param {number} appointmentLengthInMinutes - the length of a single appointment, in minutes
   * @returns {number} - the number of whole appointments that can fitted into this period
   */
  appointmentCount(appointmentLengthInMinutes) {
    const periodLengthInMs = Math.abs(
      this.endAt.getTime() - this.startAt.getTime()
    )
    if (periodLengthInMs <= 0) {
      return 0
    }

    const periodLengthInMinutes = periodLengthInMs / (1000 * 60)
    return (
      Math.floor(periodLengthInMinutes / appointmentLengthInMinutes) *
      this.vaccinatorCount
    )
  }

  /**
   * Get the clinic session this vaccination period is part of
   *
   * @returns {Session|undefined} Clinic session
   */
  get clinicSession() {
    try {
      if (this.session_id) {
        return Session.findOne(this.session_id, this.context)
      }
    } catch (error) {
      console.error('ClinicVaccinationPeriod.clinicSession', error.message)
    }
  }

  /**
   * Get start time of first appointment for `dateInput`
   *
   * @returns {object|undefined} `dateInput` object
   */
  get startAt_() {
    return convertIsoDateToObject(this.startAt)
  }

  /**
   * Set start time of first appointment from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set startAt_(object) {
    if (object) {
      this.startAt = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get end time of final appointment for `dateInput`
   *
   * @returns {object|undefined} `dateInput` object
   */
  get endAt_() {
    return convertIsoDateToObject(this.endAt)
  }

  /**
   * Set end time of final appointment from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set endAt_(object) {
    if (object) {
      this.endAt = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get various formatted values for display in the page (esp. in summaryRows)
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return {}
  }

  /**
   * Get namespace (top-level property in locale string lookup)
   *
   * @returns {string} namespace
   */
  get ns() {
    return 'clinicVaccinationPeriod'
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<ClinicVaccinationPeriod>|undefined} Clinic vaccination periods
   * @static
   */
  static findAll(context) {
    return Object.values(context?.clinicVaccinationPeriods ?? {}).map(
      (period) => new ClinicVaccinationPeriod(period, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} uuid - Clinic vaccination period UUID
   * @param {object} context - Context
   * @returns {ClinicVaccinationPeriod|undefined} Clinic vaccination period
   * @static
   */
  static findOne(uuid, context) {
    if (context?.clinicVaccinationPeriods?.[uuid]) {
      return new ClinicVaccinationPeriod(
        context.clinicVaccinationPeriods[uuid],
        context
      )
    }
  }

  /**
   * Create a new vaccination period, adding it to the context
   *
   * @param {object} period - properties for the new vaccination period
   * @param {object} context - the context to which the new period will be added
   * @returns {ClinicVaccinationPeriod} A new vaccination period, added to the context
   */
  static create(period, context) {
    const newPeriod = new ClinicVaccinationPeriod(period)

    // Add the new period to the context
    context.clinicVaccinationPeriods = context.clinicVaccinationPeriods || {}
    context.clinicVaccinationPeriods[newPeriod.uuid] = newPeriod

    return newPeriod
  }

  /**
   * Update
   *
   * @param {string} uuid - UUID of the vaccination period to update
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {ClinicVaccinationPeriod} Updated vaccination period
   * @static
   */
  static update(uuid, updates, context) {
    // Copy updates into the relevant vaccination period
    const existingPeriod = ClinicVaccinationPeriod.findOne(uuid, context)
    const updatedPeriod = _.merge(existingPeriod, updates)

    // Remove the context
    delete updatedPeriod.context

    // Delete original vaccination period (with previous UUID)
    delete context.clinicVaccinationPeriods[uuid]

    // Update context
    context.clinicVaccinationPeriods[updatedPeriod.uuid] = updatedPeriod

    return updatedPeriod
  }

  /**
   * Delete
   *
   * @param {string} uuid - UUID of the vaccination period to delete
   * @param {object} context - Context to remove the period from
   * @static
   */
  static delete(uuid, context) {
    delete context.clinicVaccinationPeriods[uuid]
  }
}
