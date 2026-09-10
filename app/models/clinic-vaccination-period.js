import { fakerEN_GB as faker } from '@faker-js/faker'
import { addMinutes } from 'date-fns'
import _ from 'lodash'

import {
  convertIsoDateToObject,
  convertObjectToIsoDate
} from '../utils/date.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ClinicVaccinationPeriodOptions
 * @property {string} [uuid] - Vaccination period UUID
 * @property {Date} [startAt] - Start time of first appointment slot
 * @property {Date} [endAt] - End time of final appointment slot
 * @property {number} [vaccinatorCount] - The number of staff vaccinating in parallel during this period
 */

/**
 * @class ClinicVaccinationPeriod
 */
export class ClinicVaccinationPeriod extends BaseModel {
  static ns = 'clinicVaccinationPeriod'

  /**
   * @param {ClinicVaccinationPeriodOptions} options - Options
   */
  constructor(options) {
    super(options)

    this.uuid = options?.uuid || faker.string.uuid()
    this.startAt = options?.startAt && new Date(options.startAt)
    this.endAt = options?.endAt && new Date(options.endAt)
    this.vaccinatorCount = options?.vaccinatorCount
  }

  /**
   * Get the total number of slots in this period
   *
   * @param {number} slotLengthInMinutes - the length of a single slot, in minutes
   * @returns {number} - the number of whole slots in this period
   */
  slotCount(slotLengthInMinutes) {
    if (!this.endAt || !this.startAt) {
      return 0
    }

    const periodLengthInMs = this.endAt.getTime() - this.startAt.getTime()
    if (periodLengthInMs <= 0) {
      return 0
    }

    const periodLengthInMinutes = periodLengthInMs / (1000 * 60)
    return (
      Math.floor(periodLengthInMinutes / slotLengthInMinutes) *
      this.vaccinatorCount
    )
  }

  /**
   * Get start time of first appointment for `dateInput`
   *
   * @returns {object|string} `dateInput` object
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
   * @returns {object|string} `dateInput` object
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
   * Does the given appointment start time fall within this period?
   *
   * @param {Date} slotStartTime - the start time of appointment
   * @param {number} slotLengthInMinutes - the length of slots in minutes
   * @returns {boolean} - true if the slot falls within this period, or false otherwise
   */
  includesSlotStartTime(slotStartTime, slotLengthInMinutes) {
    const firstSlotStartTime = this.startAt.getTime()
    const lastSlotStartTime = addMinutes(
      this.endAt,
      -slotLengthInMinutes
    ).getTime() // bug here? only true if period is exact number of slots long?

    return (
      slotStartTime.getTime() >= firstSlotStartTime &&
      slotStartTime.getTime() <= lastSlotStartTime
    )
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
            case 'startAndEndTimes':
              return `${this.startAt_.hour}:${this.startAt_.minute} to ${this.endAt_.hour}:${this.endAt_.minute}`
            case 'vaccinators':
              return this.vaccinatorCount === 1
                ? '1 vaccinator'
                : `${this.vaccinatorCount} vaccinators`
            default:
              return undefined
          }
        }
      }
    )
  }

  /**
   * Get all appointment slot start times, replicated for the number of vaccinators
   *
   * @param {number} slotLengthInMinutes - the length of a single appointment slot, in minutes
   * @returns {Array<Date>} All appointment slot start times
   */
  allSlotStartTimes(slotLengthInMinutes) {
    const totalMinutesInPeriod =
      (this.endAt.getTime() - this.startAt.getTime()) / 1000 / 60
    if (totalMinutesInPeriod <= 0) {
      throw new Error('Vaccination period end time must be after start time')
    }

    const wholeSlotsInPeriodPerVaccinator = Math.floor(
      totalMinutesInPeriod / slotLengthInMinutes
    )

    const slotStartTimes = _.range(wholeSlotsInPeriodPerVaccinator)
      .flatMap((index) => Array(this.vaccinatorCount).fill(index))
      .map((index) => addMinutes(this.startAt, index * slotLengthInMinutes))
    return slotStartTimes
  }
}

/**
 * @import { BaseModelOptions } from './base.js'
 */
