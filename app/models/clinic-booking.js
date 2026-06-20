import { fakerEN_GB as faker } from '@faker-js/faker'

import { ClinicAppointment, Contact } from '../models.js'
import { formatCode, stringToArray } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ClinicBookingOptions
 * @property {string} [uuid] - Clinic booking UUID
 * @property {string} [bookingReference] - Booking reference number
 * @property {Array<string>} [invited_programme_ids] - IDs of programmes for which child was invited
 * @property {Contact} [contact] - Contact details for the booking; see appointments for parental relationship details
 * @property {Array<ClinicAppointment>} [appointments] - Appointments in this booking (one per child)
 */

/**
 * @class ClinicBooking
 */
export class ClinicBooking extends BaseModel {
  static contextKey = 'clinicBookings'
  static identifierKey = 'uuid'
  static ns = 'clinicBooking'

  /**
   * @param {ClinicBookingOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()

    this.bookingReference =
      options?.bookingReference || ClinicBooking.generateReference()
    this.invited_programme_ids = stringToArray(options?.invited_programme_ids)

    this.contact =
      (options?.contact && new Contact(options.contact)) ?? new Contact({})

    this.appointments =
      options?.appointments?.map(
        (appointment) => new ClinicAppointment(appointment, context)
      ) ?? []
  }

  /**
   *
   * @returns {string} Generate a new, random booking reference
   */
  static generateReference() {
    return faker.helpers.replaceSymbols('CLN-####-####')
  }

  /**
   * Add a new appointment to this clinic booking
   *
   * @param {object} options - Any specific values to give the new period
   * @returns {ClinicAppointment} New clinic appointment
   */
  addAppointment(options) {
    const appointment = new ClinicAppointment(options, this.context)
    appointment.booking_uuid = this.uuid

    this.appointments = this.appointments || []
    this.appointments.push(appointment)

    return this.appointments.at(-1)
  }

  /**
   * Remove a clinic appointment from this clinic booking
   *
   * @param {string} appointment_uuid - Appointment UUID to remove
   */
  removeAppointment(appointment_uuid) {
    const index = this.appointments.findIndex(
      (appointment) => appointment.uuid == appointment_uuid
    )
    if (index === -1) {
      throw new Error(
        `Unable to find clinic appointment with uuid of ${appointment_uuid}`
      )
    }

    this.appointments.splice(index, 1)
  }

  /**
   * Remove the last appointment added to this booking
   *
   * @returns {ClinicAppointment} the removed appointment
   */
  removeLastAppointment() {
    return this.appointments.pop()
  }

  /**
   * Get the appointment with the given unique ID
   *
   * @param {string} appointment_uuid - Appointment UUID
   * @returns {ClinicAppointment} Requested clinic appointment
   */
  findAppointment(appointment_uuid) {
    return this.appointments.find(({ uuid }) => uuid === appointment_uuid)
  }

  /**
   * Get various formatted values for display in the page
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          switch (prop) {
            case 'bookingReference':
              return formatCode(this.bookingReference, true)
            default:
              return undefined
          }
        }
      }
    )
  }

  /**
   * Get URI
   *
   * @returns {object} An object containing different URLs for this booking
   */
  get uri() {
    return {
      new: `/book-into-a-clinic/${this.uuid}/new`,
      debug: `/clinic-bookings/${this.uuid}`
    }
  }
}

/**
 * @import { BaseModelOptions } from './base.js'
 */
