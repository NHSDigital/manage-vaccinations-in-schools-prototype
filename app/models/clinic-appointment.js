import { fakerEN_GB as faker } from '@faker-js/faker'
import { formatDuration, intervalToDuration } from 'date-fns'

import {
  Adjustment,
  Impairment,
  ParentalRelationship,
  ProgrammeType,
  ReplyDecision,
  VaccineCriteria,
  VaccineMethod
} from '../enums.js'
import {
  Child,
  ClinicBooking,
  Contact,
  Patient,
  Programme,
  Session
} from '../models.js'
import { formatDate } from '../utils/date.js'
import {
  formatLink,
  formatLinkWithSecondaryText,
  formatList,
  formatOther,
  formatSecondaryText,
  stringToArray
} from '../utils/string.js'

/**
 * @class ClinicAppointment
 * @param {object} options - Options
 * @param {object} [context] - Context
 * @property {object} [context] - Context, for access to patients, programmes, etc.
 * @property {string} uuid - Unique ID for this clinic appointment
 * @property {string} booking_uuid - Unique ID for the booking under which this appointment was made
 * @property {string} [patient_uuid] - Patient UUID (if matched to a patient record)
 * @property {import('./child.js').Child} [child] - child details recorded from form input values
 * @property {import('../enums.js').ParentalRelationship} [parentalRelationship] - The relationship of the person booking the appointment to the child
 * @property {string} [parentalRelationshipOther] - User-defined parental relationship to the child for this appointment
 * @property {boolean} [parentHasParentalResponsibility] - Does the contact have legal parental responsibility for the child?
 * @property {string} [session_id] - The ID of the clinic session in which the appointment's booked
 * @property {Date} [startAt] - Slot start time
 * @property {Date} [endAt] - Slot end time
 * @property {Array<string>} [selected_programme_ids] - IDs of programmes signed up for
 * @property {ReplyDecision} fluDecision - whether to use nasal or injected flu vaccine
 * @property {boolean} fluAlternative - accept the alternative flu vaccine if nasal not suitable?
 * @property {boolean} mmrAlternative - want the vaccine that doesn't contain gelatine?
 * @property {object} [healthAnswers] - Answers to health questions
 */
export class ClinicAppointment {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()

    this.booking_uuid = options?.booking_uuid
    this.patient_uuid = options?.patient_uuid
    this.child = (options?.child && new Child(options.child)) || new Child({})

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
    this.fluDecision = options?.fluDecision ?? ReplyDecision.NoResponse
    this.fluAlternative = options?.fluAlternative
    this.mmrAlternative = options?.mmrAlternative
    this.healthAnswers = options?.healthAnswers || {}
  }

  /**
   * Get the booking that this appointment's part of
   *
   * @returns {ClinicBooking|undefined} - the booking that this is part of
   */
  get booking() {
    try {
      if (this.booking_uuid) {
        return ClinicBooking.findOne(this.booking_uuid, this.context)
      }
    } catch (error) {
      console.error('ClinicAppointment.booking', error.message)
    }
  }

  /**
   * Get the session in which this appointment has been (or will be) booked
   *
   * @returns {Session|undefined} - the session in which this appointment is booked
   */
  get session() {
    try {
      if (this.session_id) {
        return Session.findOne(this.session_id, this.context)
      }
    } catch (error) {
      console.error('ClinicAppointment.session', error.message)
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
    const vaccinesForSelectedProgrammes = []
    for (const programme of this.#getSelectedProgrammes(programmeContext)) {
      let agreedProgrammeVaccines = Object.values(
        programmeContext.vaccines
      ).filter((vaccine) => vaccine.type === programme.type)

      if (programme.type === ProgrammeType.Flu) {
        // Get the right vaccine(s) for flu, according to types of flu vaccine agreed to
        if (this.fluDecision === ReplyDecision.OnlyAlternativeInjection) {
          agreedProgrammeVaccines = agreedProgrammeVaccines.filter(
            ({ method }) => method === VaccineMethod.Injection
          )
        } else if (!this.fluAlternative) {
          agreedProgrammeVaccines = agreedProgrammeVaccines.filter(
            ({ method }) => method === VaccineMethod.Intranasal
          )
        }
      } else if (programme.type === ProgrammeType.MMR) {
        // Get the right vaccine for MMR or MMRV, according to gelatine content agreed to
        agreedProgrammeVaccines = agreedProgrammeVaccines.filter(
          ({ criteria }) =>
            criteria ===
            (this.mmrAlternative
              ? VaccineCriteria.AlternativeInjection
              : VaccineCriteria.Injection)
        )
      }

      vaccinesForSelectedProgrammes.push(...agreedProgrammeVaccines)
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
   * Does this appointment cover the slot whose start time is given?
   *
   * @param {Date} slotStartTime - the time of the slot we're comparing to
   * @returns {boolean} True if this appointment covers the slot, or false otherwise
   */
  coversSlot(slotStartTime) {
    return slotStartTime >= this.startAt && slotStartTime < this.endAt
  }

  /**
   * Get any impairments reported for this appointment's child/patient
   *
   * @returns {Array<Impairment>} the child or patient's impairments
   */
  get impairments() {
    const patient = this.patient
    return patient ? patient.impairments : this.child.impairments
  }

  /**
   * Get any impairments reported for this appointment's child/patient
   *
   * @returns {Array<Adjustment>} the child or patient's impairments
   */
  get adjustments() {
    const patient = this.patient
    return patient ? patient.adjustments : this.child.adjustments
  }

  /**
   * Does this child have impairments that could affect their vaccination?
   *
   * @returns {boolean} True if they have any impairments, false otherwise
   */
  get hasImpairments() {
    const impairments = this.impairments
    if (!impairments) {
      return false
    }

    return impairments.length && !impairments.includes(Impairment.None)
  }

  /**
   * Does this child require adjustments when being vaccinated?
   *
   * @returns {boolean} True if adjustments are required, false otherwise
   */
  get requiresAdjustments() {
    const adjustments = this.adjustments
    if (!adjustments) {
      return false
    }

    return adjustments.length && !adjustments.includes(Adjustment.None)
  }

  /**
   * Administer alternative vaccine
   *
   * @returns {boolean} Administer alternative vaccine
   */
  get alternative() {
    return (
      this.fluDecision === ReplyDecision.OnlyAlternativeInjection ||
      this.mmrAlternative
    )
  }

  /**
   * Get duration of appointment
   *
   * @returns {string} Formatted duration
   */
  get duration() {
    return formatDuration(
      intervalToDuration({ start: this.startAt, end: this.endAt })
    )
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

    let fluVaccineType
    switch (this.fluDecision) {
      case ReplyDecision.Given:
        fluVaccineType = this.fluAlternative
          ? 'Nasal or injected vaccine'
          : 'Nasal vaccine only'
        break
      case ReplyDecision.OnlyAlternativeInjection:
        fluVaccineType = 'Injected vaccine only'
        break
    }
    const parentalRelationship =
      this.parentalRelationship === ParentalRelationship.Other
        ? formatOther(
            ParentalRelationship.Other,
            this.parentalRelationshipOther
          )
        : this.parentalRelationship

    return {
      nameAndAge: [
        this.fullName,
        this.patient?.age ? `Age ${this.patient.age}` : null
      ]
        .filter(Boolean)
        .join('<br>'),
      dob: this.child.formatted.dob,
      homeAddress: this.child.formatted.address,
      parentalRelationship,
      ...(fluVaccineType ? { fluVaccineType } : {}),
      ...(this.mmrAlternative !== undefined
        ? {
            mmrVaccineType: this.mmrAlternative
              ? 'Must not contain gelatine'
              : 'No preference'
          }
        : {}),
      location: session?.clinic?.formatted.nameAndAddress,
      locationName: session?.clinic?.name,
      date: session?.formatted.date ?? '',
      dateAndTime: `${session?.formatted.date} at ${formattedStartTime}`,
      timeSlot: `${formattedStartTime} to ${formattedEndTime}`,
      programmeTags: this.#getSelectedProgrammes(this.context)
        .flatMap(({ nameTag }) => nameTag)
        .join(' '),
      vaccinations: formatList(
        this.#getSelectedProgrammes(this.context).map(({ name }) => name)
      ),
      ...(this.requiresAdjustments
        ? {
            adjustmentsCount: formatSecondaryText(
              this.adjustments.length === 1
                ? '1 adjustment required'
                : `${this.adjustments.length} adjustments required`
            )
          }
        : {}),
      ...(this.hasImpairments
        ? {
            impairmentsCount: formatSecondaryText(
              this.impairments.length === 1
                ? '1 impairment noted'
                : `${this.impairments.length} impairments noted`
            )
          }
        : {})
    }
  }

  /**
   * Get the contact for this appointment’s child
   *
   * @returns {Contact} Contact with the correct relationship to this appointment’s child
   */
  get contact() {
    // Take most details from the contact in the booking
    const contact = new Contact(this.booking?.contact ?? {})
    if (contact) {
      contact.relationship = this.parentalRelationship
      contact.relationshipOther = this.parentalRelationshipOther
      contact.hasParentalResponsibility = this.parentHasParentalResponsibility
    }

    return contact
  }

  /**
   * Get formatted links
   *
   * @returns {object} Formatted links
   */
  get link() {
    return {
      unmatched: formatLinkWithSecondaryText(
        this.uri.unmatched,
        this.contact.fullNameAndRelationship,
        `for ${this.child.fullName}`
      ),
      patientSession: formatLink(this.uri.matched, this.fullName)
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
   * Get URI, without the context of the session
   *
   * @returns {object} an object with various URIs for this appointment
   */
  get uri() {
    return {
      matched: `/sessions/${this.session_id}/patients/${this.patient?.nhsn}/${this.selected_programme_ids[0]}`,
      unmatched: `/unmatched-appointments/${this.uuid}`,
      new: `/book-into-a-clinic/${this.booking_uuid}/new/${this.uuid}`
    }
  }

  /**
   * Remove `context` so it’s hidden from JSON.stringify, or we’ll get
   * circular reference issues during saving
   *
   * @returns {object} Clinic appointment ready to be serialized to JSON
   */
  toJSON() {
    const { context, ...rest } = this
    return rest
  }
}
