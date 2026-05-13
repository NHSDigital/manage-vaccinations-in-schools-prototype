import { fakerEN_GB as faker } from '@faker-js/faker'
import _ from 'lodash'

import { ClinicAppointment, Parent } from '../models.js'
import {
  formatMonospace,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

/**
 * @class ClinicBooking
 * @param {object} options - Options
 * @param {object} [context] - Context
 * @property {object} [context] - Context
 * @property {string} uuid - Clinic booking UUID
 * @property {string} bookingReference - Booking reference number
 * @property {Parent} parent - contact details for the parent making the booking; see appointments for parental relationship details
 * @property {Array<ClinicAppointment>} appointments - the appointments created in this booking (one per child)
 */
export class ClinicBooking {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.bookingReference =
      options?.bookingReference || ClinicBooking.generateReference()
    this.parent =
      (options?.parent && new Parent(options.parent)) ?? new Parent({})

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
   * @param {object} options - any specific values to give the new period
   * @returns {ClinicAppointment} - the new clinic appointment
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
   * @param {string} appointment_uuid - the unique ID of the clinic appointment to remove
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
   * @param {string|string[]} appointment_uuid - the unique ID of the appointment to get
   * @returns {ClinicAppointment} - the requested clinic appointment
   */
  findAppointment(appointment_uuid) {
    return this.appointments.find(
      ({ uuid }) => uuid === String(appointment_uuid)
    )
  }

  /**
   * Get various formatted values for display in the page
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return {
      bookingReference: formatMonospace(this.bookingReference, true)
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'clinicBooking'
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

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<ClinicBooking>|undefined} Clinic bookings
   * @static
   */
  static findAll(context) {
    return Object.values(context?.clinicBookings ?? {}).map(
      (booking) => new ClinicBooking(booking, context)
    )
  }

  /**
   * Find one
   *
   * @param {string|string[]} uuid - ClinicBooking UUID
   * @param {object} context - Context
   * @returns {ClinicBooking|undefined} Clinic booking
   * @static
   */
  static findOne(uuid, context) {
    uuid = String(uuid)

    if (context?.clinicBookings?.[uuid]) {
      return new ClinicBooking(context.clinicBookings[uuid], context)
    }
  }

  /**
   * Create a new clinic booking, adding it to the context
   *
   * @param {object} booking
   * @param {object} context
   * @returns {ClinicBooking} A new clinic booking, added to the context, and possibly with a new UUID
   */
  static create(booking, context) {
    const createdBooking = new ClinicBooking(booking)

    // Update context
    context.clinicBookings = context.clinicBookings || {}
    context.clinicBookings[createdBooking.uuid] = createdBooking

    return createdBooking
  }

  /**
   * Update
   *
   * @param {string|string[]} uuid - ClinicBooking UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {ClinicBooking} Updated booking
   * @static
   */
  static update(uuid, updates, context) {
    uuid = String(uuid)

    // Sanitise any _unchecked checkbox values
    ClinicBooking.#sanitiseCheckboxUpdates(updates)

    // Copy updates into the relevant booking
    const existingBooking = ClinicBooking.findOne(uuid, context)
    const updatedBooking = _.mergeWith(
      existingBooking,
      updates,
      (oldValue, newValue) => {
        // The appointments array shouldn’t be merged but replaced entirely, or updates following
        // the removal of a non-last appointment will result in appointment duplication
        if (Array.isArray(oldValue)) {
          return newValue
        }
      }
    )

    // Remove booking context
    delete updatedBooking.context

    // Delete original booking (with previous UUID)
    delete context.clinicBookings[uuid]

    // Update context
    context.clinicBookings[updatedBooking.uuid] = updatedBooking

    return updatedBooking
  }

  /**
   * Get rid of _unchecked values from checkboxes in the booking journey
   *
   * @param {object} updates - new values posted from the booking jounrey
   */
  static #sanitiseCheckboxUpdates(updates) {
    // Receive updates by SMS option
    if (updates?.parent?.sms) {
      updates.parent.sms = stringToBoolean(updates.parent.sms) || false
    }

    if (updates?.appointments) {
      for (const appointment of updates.appointments) {
        // Vaccinations selected
        if (appointment?.selected_programme_ids) {
          appointment.selected_programme_ids = stringToArray(
            appointment.selected_programme_ids
          )
        }

        // Impairments
        if (appointment?.child?.impairments) {
          appointment.child.impairments = stringToArray(
            appointment.child.impairments
          )
        }

        // Adjustments
        if (appointment?.child?.adjustments) {
          appointment.child.adjustments = stringToArray(
            appointment.child.adjustments
          )
        }
      }
    }
  }

  /**
   * Delete
   *
   * @param {string|string[]} uuid - Clinic booking UUID
   * @param {object} context - Context
   * @static
   */
  static delete(uuid, context) {
    delete context.clinicBookings[String(uuid)]
  }
}
