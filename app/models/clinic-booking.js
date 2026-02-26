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
 * @property {string} [parentFullName] - Parent full name
 * @property {string} [parentEmail] - Parent email
 * @property {string} [parentPhone] - Parent phone number
 * @property {boolean} [sms] - Get updates via SMS
  * 
 * @property {Array<ClinicAppointment>} [appointments] - Individual patients' appointments (one parent may book in multiple children under one booking)
 */
export class ClinicBooking {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.bookingReference = options?.bookingReference || `CLN-${faker.string.alphanumeric(8).toUpperCase()}`  // must be a better way to do this

    this.parentFullName = options?.parentFullName
    this.parentEmail = options?.parentEmail
    this.parentPhone = options?.parentPhone
    this.sms = options?.sms || false

    this.appointments = options?.appointments || []
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
