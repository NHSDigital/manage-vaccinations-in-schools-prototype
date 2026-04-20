import { fakerEN_GB as faker } from '@faker-js/faker'
import { addMinutes } from 'date-fns'
import _ from 'lodash'

import {
  convertIsoDateToObject,
  convertObjectToIsoDate
} from '../utils/date.js'

/**
 * @class ClinicVaccinationPeriod
 * @param {object} options - property values
 * @property {string} uuid - Vaccination period UUID
 * @property {Date} [startAt] - Start time of first appointment slot
 * @property {Date} [startAt_] - Start time of first appointment slot, from dateInput - see getter/setter
 * @property {Date} [endAt] - End time of final appointment slot
 * @property {Date} [endAt_] - End time of final appointment slot, from dateInput - see getter/setter
 * @property {number} [vaccinatorCount] - The number of staff vaccinating in parallel during this period
 */
export class ClinicVaccinationPeriod {
  constructor(options) {
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
   * Get all appointment slot start times grouped by the hour in which they start
   *
   * @param {number} appointmentLengthInMinutes - the length of a single appointment slot, in minutes
   * @returns {Array<object>} - appointment start times grouped by the hour in which they start
   */
  appointmentsByHour(appointmentLengthInMinutes) {
    const totalMinutesInPeriod =
      (this.endAt.getTime() - this.startAt.getTime()) / 1000 / 60
    if (totalMinutesInPeriod <= 0) {
      throw new Error('Vaccination period end time must be after start time')
    }

    const wholeAppointmentsInPeriodPerVaccinator = Math.floor(
      totalMinutesInPeriod / appointmentLengthInMinutes
    )

    const appointmentStartTimes = _.range(
      wholeAppointmentsInPeriodPerVaccinator
    )
      .flatMap((index) => Array(this.vaccinatorCount).fill(index))
      .map((index) =>
        addMinutes(this.startAt, index * appointmentLengthInMinutes)
      )

    return _.groupBy(appointmentStartTimes, (time) => time.getHours())
  }
}
