import { fakerEN_GB as faker } from '@faker-js/faker'
import _ from 'lodash'

import { ClinicBooking, Parent, Patient, Programme, Session } from '../models.js'
import { convertIsoDateToObject, convertObjectToIsoDate, formatDate, getDateValueDifference } from '../utils/date.js'

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
 * @property {object} [unmatchedDob_] - Child date of birth, if not matched to a patient record (for use with decorate)
 * @property {Boolean} needsExtraTime - Does the child need extra time for their vaccinations?
 * @property {string} [extraTimeReason] - The reason why the child needs extra time for their appointment
 * @property {Parent} [parent] - The parent/carer who booked this appointment
 * 
 * @property {string} [session_id] - The ID of the clinic session in which the appointment's booked
 * @property {Date} [startAt] - Slot start time
 * @property {Date} [endAt] - Slot end time
 * 
 * @property {Array<string>} [primary_programme_ids] - IDs of programmes signed up for
 * @property {Array<string>} [selected_programme_ids] - IDs of programmes signed up for
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
    this.unmatchedDob_ = options?.unmatchedDob_

    this.needsExtraTime = options?.needsExtraTime
    this.extraTimeReason = options?.extraTimeReason

    this.parent = options?.parent && new Parent(options.parent)

    this.session_id = options?.session_id
    this.startAt = options?.startAt ? new Date(options.startAt) : undefined
    this.endAt = options?.endAt ? new Date(options.endAt) : undefined

    this.selected_programme_ids = options?.selected_programme_ids || []
    this.primary_programme_ids = options?.primary_programme_ids || []
  }
  
  /**
   * Create a new clinic appointment, adding it to the context
   * 
   * @param {object} appointment - an appointment to copy or an object with any subset of its properties
   * @param {object} context - the context into which we'll add the new appointment
   * @returns {ClinicAppointment} A new clinic booking, added to the context, and possibly with a new UUID
   */
  static createInContext(appointment, context) {
    const createdAppointment = new ClinicAppointment(appointment)

    // Update context
    context.clinicAppointments = context.clinicAppointments || {}
    context.clinicAppointments[createdAppointment.uuid] = createdAppointment

    return createdAppointment
  }

  /**
   * Get URI of the booking journey
   *
   * @returns {string} Appointment URI
   */
  get appointmentUri() {
    return `${this.uuid}`
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
      return `${this.unmatchedFirstName} ${this.unmatchedLastName}`
    }
  }

  /**
   * Get date of birth for `dateInput`
   *
   * @returns {object|undefined} `dateInput` object
   */
  get unmatchedDob_() {
    return convertIsoDateToObject(this.unmatchedDob)
  }

  /**
   * Set date of birth from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set unmatchedDob_(object) {
    if (object) {
      this.unmatchedDob = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get the programmes selected for this appointment
   * 
   * @returns {Array<Programme>} Programmes selected for this appointment
   */
  get selectedProgrammes() {
    return ClinicAppointment.#getProgrammesFromIDs(this.selected_programme_ids, this.context)
  }

  /**
   * Get the programmes for which this child is eligible
   * 
   * @returns {Array<Programme>} The programmes from which the parent is able to choose
   */
  get eligibleProgrammes() {
    const patient = this.patient
    if (!patient) {
      return this.clinicBooking?.primaryProgrammes
    }

    // TODO: work out which vaccinations the matched child is eligible for
    let catchup_programme_ids = []

    let eligible_programme_ids = new Set(this.primary_programme_ids)
    eligible_programme_ids = eligible_programme_ids.union(new Set(catchup_programme_ids))

    return ClinicAppointment.#getProgrammesFromIDs([...eligible_programme_ids], this.context)
  }

  /**
   * Convert an array of programme IDs to actual programme objects
   * 
   * @param {Array<string>} programmeIDs 
   * @param {object} context 
   * @returns 
   */
  static #getProgrammesFromIDs(programmeIDs, context) {
    return programmeIDs.map(id => Programme.findOne(id, context))
  }

  /**
   * Get various formatted values for display in the page
   * 
   * @returns {object} Formatted values
   */
  get formatted() {
    const formattedStartTime = formatDate(this.startAt, { hour: "numeric", minute: "numeric", hour12: true })
    const formattedEndTime = formatDate(this.endAt, { hour: "numeric", minute: "numeric", hour12: true })

    const session = Session.findOne(this.session_id, this.context)
  
    return {
      nameAndAge: [ this.fullName, this.patient?.age ? `Age ${this.patient.age}` : null].filter(Boolean).join('<br>'),
      location: Object.values(session?.clinic?.location ?? {}).filter(Boolean).join(', '),
      date: session?.formatted.date ?? '',
      dateAndTime: `${session?.formatted.date} at ${formattedStartTime}`,
      timeSlot:  `${formattedStartTime} to ${formattedEndTime}`,
      vaccinations: this.selectedProgrammes.map(programme => programme.name).join(', '),
    }
  }

  /**
   * Get the prefix used for looking up localised strings for this model
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'clinicAppointment'
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
    const updatedAppointment = _.merge(ClinicAppointment.findOne(uuid, context), updates)
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
