import { fakerEN_GB as faker } from '@faker-js/faker'

import { Child, Patient, Programme, Session } from '../models.js'
import { formatDate } from '../utils/date.js'
import {
  formatLinkWithSecondaryText,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

/**
 * @class ClinicAppointment
 * @param {object} options - Options
 * @param {object} [context] - Context
 * @property {object} [context] - Context, for access to patients, programmes, etc.
 * @property {string} uuid - Unique ID for this clinic appointment
 * @property {string} [patient_uuid] - Patient UUID (if matched to a patient record)
 * @property {import('./child.js').Child} [child] - child details recorded from form input values
 * @property {boolean} needsExtraTime - Does the child need extra time for their vaccinations?
 * @property {string} [extraTimeReason] - The reason why the child needs extra time for their appointment
 * @property {import('../enums.js').ParentalRelationship} [parentalRelationship] - The relationship of the person booking the appointment to the child
 * @property {string} [parentalRelationshipOther] - User-defined parental relationship to the child for this appointment
 * @property {boolean} [parentHasParentalResponsibility] - Does the parent/carer have legal parental responsibility for the child?
 * @property {string} [session_id] - The ID of the clinic session in which the appointment's booked
 * @property {Date} [startAt] - Slot start time
 * @property {Date} [endAt] - Slot end time
 * @property {Array<string>} [primary_programme_ids] - IDs of primary programmes for this clinic booking
 * @property {Array<string>} [selected_programme_ids] - IDs of programmes signed up for
 * @property {object} [healthAnswers] - Answers to health questions
 */
export class ClinicAppointment {
  constructor(options, context) {
    // Define 'context' so it's hidden from JSON.stringify, or we'll get
    // circular reference issues during saving
    Object.defineProperty(this, 'context', {
      value: context,
      enumerable: false
    })

    this.uuid = options?.uuid || faker.string.uuid()

    this.patient_uuid = options?.patient_uuid
    this.child = (options?.child && new Child(options.child)) || new Child({})

    this.needsExtraTime = stringToBoolean(options?.needsExtraTime)
    this.extraTimeReason = options?.extraTimeReason

    this.parentalRelationship = options?.parentalRelationship
    this.parentalRelationshipOther = options?.parentalRelationshipOther
    this.parentHasParentalResponsibility =
      options?.parentHasParentalResponsibility

    this.session_id = options?.session_id
    this.startAt = options?.startAt ? new Date(options.startAt) : undefined
    this.endAt = options?.endAt ? new Date(options.endAt) : undefined

    this.selected_programme_ids =
      (options?.selected_programme_ids &&
        stringToArray(options.selected_programme_ids)) ||
      []
    this.primary_programme_ids =
      (options?.primary_programme_ids &&
        stringToArray(options.primary_programme_ids)) ||
      []
    this.healthAnswers = options?.healthAnswers || {}
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
   * Get first name of the child booked into this appointment
   *
   * @returns {string} Child's first name
   */
  get firstName() {
    return this.patient ? this.patient.firstName : this.child.firstName
  }

  /**
   * Get last name of the child booked into this appointment
   *
   * @returns {string} Child's last name
   */
  get lastName() {
    return this.patient ? this.patient.lastName : this.child.lastName
  }

  /**
   * Get full name of the child booked into this appointment
   *
   * @returns {string} Child's full name
   */
  get fullName() {
    return `${this.firstName} ${this.lastName}`
  }

  /**
   * Get the programmes selected for this appointment
   *
   * @param {object} programmeContext - the context in which we'll find the programmes
   * @returns {Array<Programme>} Programmes selected for this appointment
   */
  #getSelectedProgrammes(programmeContext) {
    return ClinicAppointment.#getProgrammesFromIDs(
      this.selected_programme_ids,
      programmeContext ?? this.context
    )
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
    const catchup_programme_ids = []

    let eligible_programme_ids = new Set(this.primary_programme_ids)
    eligible_programme_ids = eligible_programme_ids.union(
      new Set(catchup_programme_ids)
    )

    return ClinicAppointment.#getProgrammesFromIDs(
      [...eligible_programme_ids],
      this.context
    )
  }

  /**
   * Convert an array of programme IDs to actual programme objects
   *
   * @param {Array<string>} programmeIDs
   * @param {object} context
   * @returns {Array<Programme>} Programme objects matching the given IDs
   */
  static #getProgrammesFromIDs(programmeIDs, context) {
    return programmeIDs
      .map((id) => {
        const programme = Programme.findOne(id, context)
        if (!programme) {
          console.log(`Null programme for ID: ${id}`)
        }
        return programme
      })
      .filter(Boolean) // TODO: shouldn't need this filter and it will mask issues; remove when the checkboxes binding is fixed
  }

  /**
   * Get health questions to show based on the selected programme(s)
   *
   * Note: this method requires this instance to have a full context
   *
   * @param {object} programmeContext - the context in which we'll find the programmes
   * @returns {Array} Health questions
   */
  getHealthQuestionsForSelectedProgrammes(programmeContext) {
    // Logic is: programme -> vaccine (matched on programme type) -> health questions

    // NB: given we don't have information about consent for nasal vs. injection, or for
    //     gelatine, we can end up asking more questions here than we might need to. :/
    const vaccinesForSelectedProgrammes = []
    for (const programme of this.#getSelectedProgrammes(programmeContext)) {
      vaccinesForSelectedProgrammes.push(
        ...Object.values(programmeContext.vaccines).filter(
          (v) => v.type === programme.type
        )
      )
    }

    // Collate the questions from the vaccines, making sure we don't duplicate them
    const questions = new Map()
    for (const vaccine of vaccinesForSelectedProgrammes) {
      for (const [key, value] of Object.entries(vaccine.healthQuestions)) {
        questions.set(key, value)
      }
    }

    return Object.fromEntries(questions)
  }

  /**
   * Get various formatted values for display in the page
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const formattedStartTime = formatDate(this.startAt, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })
    const formattedEndTime = formatDate(this.endAt, {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    })

    const session = Session.findOne(this.session_id, this.context)

    return {
      nameAndAge: [
        this.fullName,
        this.patient?.age ? `Age ${this.patient.age}` : null
      ]
        .filter(Boolean)
        .join('<br>'),
      location: Object.values(session?.clinic?.location ?? {})
        .filter(Boolean)
        .join(', '),
      date: session?.formatted.date ?? '',
      dateAndTime: `${session?.formatted.date} at ${formattedStartTime}`,
      timeSlot: `${formattedStartTime} to ${formattedEndTime}`,
      vaccinations: this.#getSelectedProgrammes(this.context)
        .map((programme) => programme.name)
        .join(', ')
    }
  }

  /**
   * Get formatted links
   *
   * @returns {object} Formatted links
   */
  get link() {
    return {
      summary: formatLinkWithSecondaryText(
        this.uri,
        this.parentalRelationship, // TODO: look up name of parent in booking
        `for ${this.child.fullName}`
      )
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
    return `/appointments/${this.uuid}`
  }
}
