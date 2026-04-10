import { fakerEN_GB as faker } from '@faker-js/faker'

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
    if (!this.endAt || !this.startAt) {
      return 0
    }

    const periodLengthInMs = this.endAt.getTime() - this.startAt.getTime()
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
}
