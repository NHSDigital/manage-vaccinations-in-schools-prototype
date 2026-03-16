import { fakerEN_GB as faker } from '@faker-js/faker'
import _ from 'lodash'

import allProgrammesData from '../datasets/programmes.js'

import { ClinicAppointment, Parent, Programme } from '../models.js'
import { SessionPresets } from '../enums.js'

/**
 * @class ClinicBooking
 * 
 * @param {object} options - Options
 * @param {object} [context] - Context
 * 
 * @property {object} [context] - Context
 * @property {string} uuid - Clinic booking UUID
 * @property {string} bookingReference - Booking reference number
 * @property {SessionPreset} sessionPreset - the primary programme for which the parent was invited to book e.g. doubles
 * 
 * @property {number} childCount - the number of children that the parent wants to book in in one go
 * @property {Array<string>} [appointments_ids] - Unique IDs of children's appointments (one parent may book in multiple children under one booking)
 */
export class ClinicBooking {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.bookingReference = options?.bookingReference || ClinicBooking.generateReference()
    this.sessionPreset = options?.sessionPreset ?? SessionPresets[0];

    this.childCount = options?.childCount
    this.appointments_ids = options?.appointments_ids ?? []
  }

  /**
   * Create a new clinic booking, adding it to the context
   * 
   * @param {object} booking 
   * @param {object} context 
   * @returns {ClinicBooking} A new clinic booking, added to the context, and possibly with a new UUID
   */
  static createInContext(booking, context) {
    const createdBooking = new ClinicBooking(booking)

    // Update context
    context.clinicBookings = context.clinicBookings || {}
    context.clinicBookings[createdBooking.uuid] = createdBooking

    return createdBooking
  }

  /**
   * 
   * @returns Generate a new, random booking reference
   */
  static generateReference() {
    return faker.helpers.replaceSymbols('CLN-####-####')
  }

  /**
   * Get URI of the booking journey
   *
   * @returns {string} Booking journey URI
   */
  get bookingUri() {
    return `${this.sessionPreset.slug}/${this.uuid}`
  }

  /**
   * Get the IDs of the set of programmes that this clinic was set up to serve
   * 
   * @returns {Array<string>} the set of Programme objects represented by the session preset
   */
  get primaryProgrammeIDs() {
    return this.sessionPreset.programmeTypes.map(type => allProgrammesData[type].id)
  }

  /**
   * Get the set of programmes that this clinic was set up to serve
   * 
   * @returns {Array<Programme>} the set of Programme objects represented by the session preset
   */
  get primaryProgrammes() {
    // MAL: is this gonna trip me up, relying on the global context if called from the booking journey?
    return this.primaryProgrammeIDs.map(id => Programme.findOne(id, this.context))
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
   * Get the parent details from the first appointment
   * 
   * This is only intended to allow us to present the parent's name, email and so on, but not to
   * represent the parent's relationship to all the children in this booking, as the relationship
   * may vary by chiuld.
   * 
   * @returns {Parent|undefined} Parent details from the first appointment
   */
  get firstParent() {
    return this.appointments?.[0]?.parent
  }

  /**
   * 
   */
  set parentTel(value) {
    if (value) {
      this.appointments.forEach(appt => appt.parent.tel = value)
    }
  }

  /**
   * 
   */
  get parentTel() {
    return this.firstParent?.tel
  }

  /**
   * Get various formatted values for display in the page
   * 
   * @returns {object} Formatted values
   */
  get formatted() {
    return {
      // TODO: make this work using commas for more than 2 programmes
      primaryProgramme: this.primaryProgrammes.map(p => p.name).join(' and ')
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
    const existingBooking = ClinicBooking.findOne(uuid, context)
    const updatedBooking = _.merge(existingBooking, updates)

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
