import { fakerEN_GB as faker } from '@faker-js/faker'

import { Patient } from '../models.js'
import { getDateValueDifference } from '../utils/date.js'

/**
 * @class ClinicAppointment
 * 
 * @param {object} options - Options
 * @param {object} [context] - Context
 * 
 * @property {object} [context] - Context
 * @property {string} uuid - Clinic appointment UUID
 * @property {string} booking_uuid - Booking UUID
 * 
 * @property {string} [patient_uuid] - Patient UUID (if matched to a patient record)
 * @property {string} [firstName] - Child first name, if not matched to a patient record
 * @property {string} [lastName] - Child last name, if not matched to a patient record
 * @property {Date} [dob] - Child date of birth, if not matched to a patient record
 * @property {object} [dob_] - Child date of birth (formatted)
 * @property {ParentalRelationship} [relationship] - Relationship to child
 * @property {string} [otherRelationship] - Other relationship to child
 * 
 * @property {string} [clinic_id] - Clinic ID
 * @property {Date} [startAt] - Slot start time
 * @property {Date} [endAt] - Slot end time
 * 
 * @property {Array<ProgrammeType>} [programmes] - Programmes signed up for
 */
export class ClinicAppointment {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.booking_uuid = options?.booking_uuid
    this.patient_uuid = options?.patient_uuid
    this.firstName = options?.firstName // ignore if got child ID
    this.lastName = options?.lastName   // ignore if got child ID
    this.dob = options?.dob             // ignore if got child ID
    this.dob_ = options?.dob_
    this.relationship = options?.relationship
    this.otherRelationship = options?.otherRelationship
    this.clinic_id = options?.clinic_id
    this.startAt = options?.slotStart ? new Date(options.slotStart) : undefined
    this.endAt = options?.slotEnd ? new Date(options.slotEnd) : undefined
    this.programmes = options?.programmes || []
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
