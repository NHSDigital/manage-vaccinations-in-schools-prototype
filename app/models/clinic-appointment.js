import { fakerEN_GB as faker } from '@faker-js/faker'

import { ClinicBooking, Parent, Patient, Programme, Session } from '../models.js'
import { getDateValueDifference } from '../utils/date.js'

/**
 * @class ClinicAppointment
 * 
 * @param {object} options - Options
 * @param {object} [context] - Context
 * 
 * @property {object} [context] - Context
 * @property {string} uuid - Unique ID for this clinic appointment
 * @property {string} booking_uuid - Unique ID for the booking in which this appointment was made
 * 
 * @property {string} [patient_uuid] - Patient UUID (if matched to a patient record)
 * @property {string} [unmatchedFirstName] - Child first name, if not matched to a patient record
 * @property {string} [unmatchedLastName] - Child last name, if not matched to a patient record
 * @property {Date} [unmatchedDob] - Child date of birth, if not matched to a patient record
 * @property {object} [dob_] - Child date of birth (formatted)
 * 
 * @property {Parent} [parent] - The parent/carer who booked this appointment
 * 
 * @property {string} [session_id] - The ID of the clinic session in which the appointment's booked
 * @property {Date} [startAt] - Slot start time
 * @property {Date} [endAt] - Slot end time
 * 
 * @property {Array<string>} [programme_ids] - IDs of programmes signed up for
 */
export class ClinicAppointment {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.booking_uuid = options?.booking_uuid

    this.patient_uuid = options?.patient_uuid
    this.unmatchedFirstName = options?.unmatchedFirstName
    this.unmatchedLastName = options?.unmatchedLastName
    this.unmatchedDob = options?.unmatchedDob && new Date(options.unmatchedDob)
    this.dob_ = options?.dob_

    this.parent = options?.parent && new Parent(options.parent)

    this.session_id = options?.session_id
    this.startAt = options?.startAt ? new Date(options.startAt) : undefined
    this.endAt = options?.endAt ? new Date(options.endAt) : undefined

    this.programme_ids = options?.programme_ids || []
  }
  
  /**
   * Get the booking this appointment belongs to
   *
   * @returns {ClinicBooking|undefined} Clinic booking
   */
  get clinicBooking() {
    try {
      if (this.booking_uuid) {
        return ClinicBooking.findOne(this.booking_uuid, this.context)
      }
    } catch (error) {
      console.error('ClinicAppointment.clinicBooking', error.message)
    }
  }

  /**
   * Get patient
   *
   * @returns {Patient|undefined} Patient
   */
  get patient() {
    try {
      if (this.patient_uuid) {
        return Patient.findOne(this.patient_uuid, this.context)
      }
    } catch (error) {
      console.error('ClinicAppointment.patient', error.message)
    }
  }

  /**
   * Get full name of the child booked into this appointment
   *
   * @returns {string} Child's full name
   */
  get fullName() {
    const patient = this.patient
    if (patient) {
      return `${patient.firstName} ${patient.lastName}`
    } else {
      return 
    }
  }

  /**
   * Get the programmes selected for this appointment
   * 
   * @returns {Array<Programme>} Programmes selected for this appointment
   */
  get programmes() {
    return this.programme_ids.map(id => Programme.findOne(id, this.context))
  }

  /**
   * Get various formatted values for display in the page
   * 
   * @returns {object} Formatted values
   */
  get formatted() {
    const session = Session.findOne(this.session_id, this.context)
    const patient = this.patient

    return {
      fullName: patient ? `${patient.firstName} ${patient.lastName}` : `${this.unmatchedFirstName} ${this.unmatchedLastName}`,
      nameAndAge: [ patient?.fullName, patient?.age ].join('<br>'),
      location: session.clinic.formatted.location,
      dateAndTime: session.formatted.date
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'clinic-appointment'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/clinic-appointments/${this.uuid}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<ClinicAppointment>|undefined} Clinic appointments
   * @static
   */
  static findAll(context) {
    return Object.values(context?.clinicAppointments ?? {})
      .map((appt) => new ClinicAppointment(appt, context))
      .sort((a, b) => getDateValueDifference(a.startAt, b.startAt))
  }

  /**
   * Find one
   *
   * @param {string} uuid - ClinicAppointment UUID
   * @param {object} context - Context
   * @returns {ClinicAppointment|undefined} Clinic appointment
   * @static
   */
  static findOne(uuid, context) {
    if (context?.clinicAppointments?.[uuid]) {
      return new ClinicAppointment(context.clinicAppointments[uuid], context)
    }
  }

  /**
   * Update
   *
   * @param {string} uuid - ClinicAppointment UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {ClinicAppointment} Updated appointment
   * @static
   */
  static update(uuid, updates, context) {
    const updatedAppointment = Object.assign(this, updates)
//    updatedAppointment.updatedAt = today()

    // Remove appointment context
    delete updatedAppointment.context

    // Delete original appointment (with previous UUID)
    delete context.clinicAppointments[uuid]

    // Update context
    context.clinicAppointments[updatedAppointment.uuid] = updatedAppointment

    return updatedAppointment
  }

  /**
   * Delete
   *
   * @param {string} uuid - ClinicAppointment UUID
   * @param {object} context - Context
   * @static
   */
  static delete(uuid, context) {
    delete context.clinicAppointments[uuid]
  }
}
