import { fakerEN_GB as faker } from '@faker-js/faker'
import { ClinicAppointment } from './clinic-appointment.js'

/**
 * @class ClinicBooking
 * 
 * @param {object} options - Options
 * @param {object} [context] - Context
 * 
 * @property {object} [context] - Context
 * @property {string} uuid - Clinic booking UUID
 * @property {string} bookingReference - Booking reference number 
 * 
 * @property {Array<string>} [appointments_ids] - Unique IDs of children's appointments (one parent may book in multiple children under one booking)
 */
export class ClinicBooking {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.bookingReference = options?.bookingReference || ClinicBooking.generateReference()

    this.appointments_ids = options?.appointments_ids || []
  }

  /**
   * 
   * @returns Generate a new, random booking reference
   */
  static generateReference() {
    return faker.helpers.replaceSymbols('CLN-####-####')
  }

  /**
   * Add a child's appointment to this booking, setting up parent details and relationship in the process
   * 
   * @param {ClinicAppointment} appointment An appointment to make part of this booking
   */
  addAppointment(appointment) {
    this.appointments_ids.push(appointment.uuid)
  }
  
  /**
   * Get appointments
   * 
   * @returns {Array<ClinicAppointment>} Appointments that are part of this booking
   */
  get appointments() {
    return this.appointments_ids.map(id => ClinicAppointment.findOne(id, this.context))
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'clinicbooking'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/clinic-bookings/${this.uuid}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<ClinicBooking>|undefined} Clinic bookings
   * @static
   */
  static findAll(context) {
    return Object.values(context?.clinicBookings ?? {})
      .map((booking) => new ClinicBooking(booking, context))
  }

  /**
   * Find one
   *
   * @param {string} uuid - ClinicBooking UUID
   * @param {object} context - Context
   * @returns {ClinicBooking|undefined} Clinic booking
   * @static
   */
  static findOne(uuid, context) {
    if (context?.clinicBookings?.[uuid]) {
      return new ClinicBooking(context.clinicBookings[uuid], context)
    }
  }

  /**
   * Update
   *
   * @param {string} uuid - ClinicBooking UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {ClinicBooking} Updated booking
   * @static
   */
  static update(uuid, updates, context) {
    const updatedBooking = Object.assign(this, updates)
//    updatedBooking.updatedAt = today()

    // Remove booking context
    delete updatedBooking.context


    // Delete original booking (with previous UUID)
    delete context.clinicBookings[uuid]
    // Update context
    context.clinicBookings[updatedBooking.uuid] = updatedBooking

    return updatedBooking
  }

  /**
   * Delete
   *
   * @param {string} uuid - ClinicBooking UUID
   * @param {object} context - Context
   * @static
   */
  static delete(uuid, context) {
    delete context.clinicBookings[uuid]
  }
}
