import { fakerEN_GB as faker } from '@faker-js/faker'
import { addMinutes, formatDuration, intervalToDuration } from 'date-fns'

import activity from '../datasets/activity.js'
import {
  Adjustment,
  AppointmentAbandonmentReason,
  ClinicAppointmentStatus,
  ConsentVaccineCriteria,
  Impairment,
  ParentalRelationship,
  ProgrammeType,
  RegistrationStatus,
  ReplyDecision,
  SessionStatus,
  VaccineCriteria,
  VaccineMethod
} from '../enums.js'
import {
  Child,
  ClinicBooking,
  Contact,
  Patient,
  PatientSession,
  Programme,
  Session,
  User
} from '../models.js'
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
import {
  formatContact,
  formatFullName,
  formatLink,
  formatLinkWithSecondaryText,
  formatList,
  formatOther,
  formatSecondaryText,
  formatTime,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

/**
 * @typedef {object} ClinicAppointmentOptions
 * @property {string} [uuid] - Clinic appointment UUID
 * @property {string} [booking_uuid] - Unique ID for the booking under which this appointment was made
 * @property {string} [patient_uuid] - Patient UUID (if matched to a patient record)
 * @property {Child} [child] - Child details recorded from form input values
 * @property {ParentalRelationship} [parentalRelationship] - The relationship of the person booking the appointment to the child
 * @property {string} [parentalRelationshipOther] - User-defined parental relationship to the child for this appointment
 * @property {boolean} [parentHasParentalResponsibility] - Does the contact have legal parental responsibility for the child?
 * @property {string} [session_id] - The ID of the clinic session in which the appointment's booked
 * @property {Date} [startAt] - Slot start time
 * @property {number} [appointmentLength] - Length of the appointment, in minutes
 * @property {Array<string>} [selected_programme_ids] - IDs of programmes signed up for
 * @property {ReplyDecision} [fluDecision] - Whether to use nasal or injected flu vaccine
 * @property {boolean} [fluAlternative] - Accept alternative flu vaccine if nasal not suitable?
 * @property {boolean} [mmrAlternative] - Wants vaccine that doesn’t contain gelatine?
 * @property {object} [healthAnswers] - Answers to health questions
 * @property {ClinicAppointmentStatus} [status] - Has this appointment been archived?
 * @property {string} [note] - Note about this clinic appointment
 * @property {Array<AppointmentAbandonmentReason>} [abandonmentReasons] - Reasons for abandoning this appointment
 * @property {string} [abandonmentReasonOther] - Details of the custom reason for abandonment
 * @property {AppointmentAbandonmentReason} [abandonmentPrimaryReason] - The main reason for abandonment
 * @property {string} [preferredPostcode] - the postcode of the parent's ideal clinic location
 * @property {number} [convenientDistance] - Miles the parent is willing to travel
 * @property {Array<DayOfTheWeek>} [convenientDays] - Days of the week that are convenient for the parent
 * @property {Array<PartOfTheDay>} [convenientTimes] - The relationship of the person booking the appointment to the child
 */

/**
 * @class ClinicAppointment
 */
// TODO: Extend BaseModel (findOne and findAll currently deviate from pattern)
export class ClinicAppointment {
  /**
   * @param {ClinicAppointmentOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()

    this.booking_uuid = options?.booking_uuid
    this.patient_uuid = options?.patient_uuid
    this.child = (options?.child && new Child(options.child)) || new Child({})

    this.parentalRelationship = options?.parentalRelationship
    this.parentalRelationshipOther = options?.parentalRelationshipOther
    this.parentHasParentalResponsibility = stringToBoolean(
      options?.parentHasParentalResponsibility
    )

    this.session_id = options?.session_id
    this.startAt = options?.startAt ? new Date(options.startAt) : undefined
    this.appointmentLength = options?.appointmentLength

    this.selected_programme_ids = stringToArray(options?.selected_programme_ids)
    this.fluDecision = options?.fluDecision ?? ReplyDecision.NoResponse
    this.fluAlternative = stringToBoolean(options?.fluAlternative)
    this.mmrAlternative = stringToBoolean(options?.mmrAlternative)
    this.healthAnswers = options?.healthAnswers || {}

    this.status = options?.status ?? ClinicAppointmentStatus.Booked
    this.note = options?.note

    this.abandonmentReasons = stringToArray(options?.abandonmentReasons)
    this.abandonmentReasonOther = options?.abandonmentReasonOther
    this.abandonmentPrimaryReason =
      this.abandonmentReasons?.length > 1
        ? options?.abandonmentPrimaryReason
        : this.abandonmentReasons?.length === 1
          ? this.abandonmentReasons[0]
          : undefined
    this.preferredPostcode = options?.preferredPostcode
    this.convenientDistance = this.abandonmentReasons.includes(
      AppointmentAbandonmentReason.Distance
    )
      ? options?.convenientDistance
      : undefined
    this.convenientDays = this.abandonmentReasons.includes(
      AppointmentAbandonmentReason.DayOfWeek
    )
      ? stringToArray(options?.convenientDays)
      : undefined
    this.convenientTimes = this.abandonmentReasons.includes(
      AppointmentAbandonmentReason.TimeOfDay
    )
      ? stringToArray(options?.convenientTimes)
      : undefined
  }

  /**
   * Get the booking that this appointment’s part of
   *
   * @returns {ClinicBooking|undefined} Booking that this is part of
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
   * @returns {Session|undefined} Session in which this appointment is booked
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
   * Get all patient sessions associated with this appointment
   *
   * @returns {Array<PatientSession>} Patient sessions for the programmes booked in for
   */
  get patientSessions() {
    if (!this.patient_uuid) {
      return []
    }

    return PatientSession.findAll(this.context).filter(
      (patientSession) =>
        patientSession.patient_uuid === this.patient_uuid &&
        patientSession.session_id === this.session_id
    )
  }

  /**
   * Create patient-session records for all booked vaccinations
   */
  addToSession() {
    if (!this.patient_uuid || !this.session_id) {
      throw new Error(
        'Unable to create patient sessions for the clinic appointment'
      )
    }

    // Create and add patient session for each programme they've signed up for
    const patient = this.patient
    for (const programme_id of this.selected_programme_ids) {
      const patientSession = PatientSession.create(
        {
          patient_uuid: patient.uuid,
          programme_id: programme_id,
          session_id: this.session_id
        },
        this.context
      )

      // Add to session
      patient.addToSession(patientSession)
    }

    Patient.update(patient.uuid, patient, patient.context)
  }

  /**
   * Cancel the appointment, logging the event and removing associated patient sessions
   *
   * @param {User} account - the user carrying out the removal
   * @param {boolean} shouldOfferRebooking - true if the parent will be offered immediate rebooking, or false if they'll be invited again later
   */
  cancelAppointment(account, shouldOfferRebooking) {
    const session = this.session
    if (
      ![SessionStatus.Active, SessionStatus.Planned].includes(session?.status)
    ) {
      throw new Error(
        'Session must be scheduled or in progress to cancel an appointment'
      )
    }

    // Flag as cancelled
    this.status = ClinicAppointmentStatus.Cancelled
    if (!this.patient_uuid) return

    // Strip the relevant patient sessions from the patient record
    const patient = this.patient
    const patientSessions = this.patientSessions
    const patientSessionUuids = patientSessions.map(({ uuid }) => uuid)
    patient.patientSession_uuids = patient.patientSession_uuids.filter(
      (uuid) => !patientSessionUuids.includes(uuid)
    )

    // Record the cancellation in the patient's activity
    patient.addEvent({
      name: activity.session.cancelAppointment(session),
      createdBy_uid: account.uid,
      programme_ids: this.selected_programme_ids
    })

    // Re-invite? If so, record that too
    if (shouldOfferRebooking) {
      patient.inviteToClinic(this.selected_programme_ids)
    }
  }

  /**
   * Has the parent given up on trying to find a suitable appointment?
   *
   * @returns {boolean} - true if abandoned, false otherwise
   */
  get isAbandoned() {
    return this.abandonmentReasons?.length > 0
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
   * Get full name of the child booked into this appointment, formatted for SAIS teams
   *
   * @returns {string} Child's full name
   */
  get fullName() {
    return formatFullName(this.firstName, this.lastName, false)
  }

  /**
   * Get full name of the child booked into this appointment, formatted for parents
   *
   * @returns {string} Child's full name
   */
  get fullFriendlyName() {
    return formatFullName(this.firstName, this.lastName, true)
  }

  /**
   * Has this clinic appointment been archived (was unmatched and archived when reviewed)?
   *
   * @returns {boolean} - true if the appointment's been archived, or false otherwise
   */
  get isArchived() {
    return this.status === ClinicAppointmentStatus.Archived
  }

  /**
   * Has this clinic appointment been cancelled?
   *
   * @returns {boolean} - true if the appointment's cancelled, or false otherwise
   */
  get isCancelled() {
    return this.status === ClinicAppointmentStatus.Cancelled
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
   * What is the end time of this appointment, precisely (ignoring slot boundaries)
   *
   * @returns {Date} - the end time of the appointment
   */
  get endAt() {
    return addMinutes(this.startAt, this.appointmentLength)
  }

  /**
   * Does this appointment overlap the slot whose start and end times are given?
   *
   * @param {Date} slotStartTime - the start time of the slot we're comparing to
   * @param {Date} slotEndTime - the end time of the slot we're comparing to
   * @returns {boolean} True if this appointment overlaps the slot, or false otherwise
   */
  coversSlot(slotStartTime, slotEndTime) {
    return slotEndTime > this.startAt && slotStartTime < this.endAt
  }

  /**
   * Get the start times of slots that this appointment occupies
   *
   * @param {number} slotLength - the length of a slot, in minutes
   * @yields {Date} - the start times of the slots that this appointment occupies
   */
  *coveredSlotStartTimes(slotLength) {
    let slotStartTime = this.startAt
    while (slotStartTime < this.endAt) {
      yield slotStartTime
      slotStartTime = addMinutes(slotStartTime, slotLength)
    }
  }

  /**
   * Get the registration status for this appointment's child i.e. have they turned up?
   *
   * @returns {RegistrationStatus|undefined} the registration status if a matched child, or undefined if not yet matched
   */
  get register() {
    // Return undefined if not yet matched as registration is tied to a patient record
    return this.patientSessions.at(0)?.register
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
  get hasConsentForAlternativeVaccine() {
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
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          // Shared dynamic helpers (evaluated lazily inside the property checks)
          const getParentFacingTimes = () => ({
            start: formatTime(this.startAt),
            end: formatTime(this.endAt)
          })

          const getSession = () =>
            Session.findOne(this.session_id, this.context)

          const getProgrammeNames = () => {
            const canBeOfferedMmrv = this.patient_uuid
              ? this.patient?.canBeOfferedMmrv
              : this.child?.canBeOfferedMmrv
            return programmeNamesListForSentence(
              this.selected_programme_ids,
              canBeOfferedMmrv,
              ConjunctionType.and,
              this.context
            )
          }

          switch (prop) {
            case 'nameAndAge':
              return [
                this.fullName,
                this.patient?.age ? `Age ${this.patient.age}` : null
              ]
                .filter(Boolean)
                .join('<br>')

            case 'dob':
              return this.child.formatted.dob

            case 'homeAddress':
              return this.child.formatted.address

            case 'parentalRelationship':
              return this.parentalRelationship === ParentalRelationship.Other
                ? formatOther(
                    ParentalRelationship.Other,
                    this.parentalRelationshipOther
                  )
                : this.parentalRelationship

            case 'contactDetails':
              return formatContact(this.contact, true)

            case 'fluVaccineType':
              switch (this.fluDecision) {
                case ReplyDecision.Given:
                  return this.fluAlternative
                    ? ConsentVaccineCriteria.IntranasalPreferred
                    : ConsentVaccineCriteria.IntranasalOnly
                case ReplyDecision.OnlyAlternativeInjection:
                  return ConsentVaccineCriteria.AlternativeFluInjectionOnly
                default:
                  return undefined
              }

            case 'mmrVaccineType':
              if (this.mmrAlternative === undefined) return undefined
              return this.mmrAlternative
                ? 'Must not contain gelatine'
                : 'No preference'

            case 'location':
              return getSession()?.clinic?.formatted.nameAndAddress

            case 'locationName':
              return getSession()?.clinic?.name

            case 'date':
              return getSession()?.formatted.date ?? ''

            case 'dateAndTime':
              return `${getSession()?.formatted.date} at ${getParentFacingTimes().start}`

            case 'timeSlot':
              return `${getParentFacingTimes().start} to ${getParentFacingTimes().end}`

            case 'programmeNames':
              return getProgrammeNames()

            case 'programmeTags':
              return this.#getSelectedProgrammes(this.context)
                .flatMap(({ nameTag }) => nameTag)
                .join(' ')

            case 'vaccinations':
              return formatList(
                this.#getSelectedProgrammes(this.context).map(
                  ({ name }) => name
                )
              )

            case 'appointmentLength':
              return this.duration

            case 'adjustmentsCount':
              if (!this.requiresAdjustments) return undefined
              return formatSecondaryText(
                this.adjustments.length === 1
                  ? '1 adjustment required'
                  : `${this.adjustments.length} adjustments required`
              )

            case 'impairmentsCount':
              if (!this.hasImpairments) return undefined
              return formatSecondaryText(
                this.impairments.length === 1
                  ? '1 impairment noted'
                  : `${this.impairments.length} impairments noted`
              )

            case 'adjustmentsUnlessNone': {
              const adjustments = this.adjustments
              if (!adjustments) return undefined
              return formatList(
                adjustments.filter(
                  (adjustment) => adjustment !== Adjustment.None
                )
              )
            }

            case 'impairmentsUnlessNone': {
              const impairments = this.impairments
              if (!impairments) return undefined
              return formatList(
                impairments.filter(
                  (impairment) => impairment !== Impairment.None
                )
              )
            }

            case 'summary': {
              const teamFacingStartTime = formatTime(this.startAt, false)
              return `${teamFacingStartTime} ${this.fullName} (${getProgrammeNames()})`
            }

            case 'register':
              return this.patientSessions.at(0)?.formatted?.register

            case 'abandonmentReasons':
              return formatList(
                this.abandonmentReasons.map((reason) =>
                  reason === AppointmentAbandonmentReason.Other
                    ? formatOther(
                        AppointmentAbandonmentReason.Other,
                        this.abandonmentReasonOther
                      )
                    : reason
                )
              )

            case 'primaryAbandonmentReason':
              return this.abandonmentReasons?.length === 1
                ? undefined
                : this.abandonmentPrimaryReason ==
                    AppointmentAbandonmentReason.Other
                  ? formatOther(
                      AppointmentAbandonmentReason.Other,
                      this.abandonmentReasonOther
                    )
                  : this.abandonmentPrimaryReason

            case 'convenientDistance':
              return this.convenientDistance
                ? `${this.convenientDistance} miles`
                : undefined

            case 'convenientDays':
              return this.convenientDays?.length
                ? formatList(this.convenientDays)
                : undefined

            case 'convenientTimes':
              return this.convenientTimes?.length
                ? formatList(this.convenientTimes)
                : undefined

            default:
              return undefined
          }
        }
      }
    )
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
      unmatched: {
        withParent: formatLinkWithSecondaryText(
          this.uri.unmatched,
          this.child.fullName,
          `by ${this.contact.fullNameAndRelationship}`
        ),
        withoutParent: formatLink(this.uri.unmatched, this.child.fullName)
      },
      matched: formatLink(this.uri.matched, this.patient?.fullName),
      extend: formatLink(this.uri.extend, 'Extend'),
      summary: this.patient_uuid
        ? formatLink(this.uri.matched, this.formatted.summary)
        : formatLinkWithSecondaryText(
            this.uri.unmatched,
            this.formatted.summary,
            '(unmatched)'
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
   * Get URI, without the context of the session
   *
   * @returns {object} Object with various URIs for this appointment
   */
  get uri() {
    return {
      matched: `/sessions/${this.session_id}/patients/${this.patient?.nhsn}/${this.selected_programme_ids[0]}/appointment`,
      unmatched: `/unmatched-appointments/${this.uuid}`,
      new: `/book-into-a-clinic/${this.booking_uuid}/new/${this.uuid}`,
      edit: `/book-into-a-clinic/${this.booking_uuid}/edit/${this.uuid}`,
      cancel: `/sessions/${this.session_id}/patients/${this.patient?.nhsn}/${this.selected_programme_ids[0]}/cancel`,
      extend: `/book-into-a-clinic/${this.booking_uuid}/edit/${this.uuid}/length`,
      addProgramme: `/sessions/${this.session_id}/patients/${this.patient?.nhsn}/${this.selected_programme_ids[0]}/add-programme/`
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

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<ClinicAppointment>|undefined} Clinic appointments
   * @static
   */
  static findAll(context) {
    return ClinicBooking.findAll(context).flatMap(
      ({ appointments }) => appointments
    )
  }

  /**
   * Find one
   *
   * @param {string} appointment_uuid - Appointment UUID
   * @param {object} context - Context
   * @returns {ClinicAppointment|undefined} Clinic appointment
   * @static
   */
  static findOne(appointment_uuid, context) {
    return ClinicAppointment.findAll(context).find(
      ({ uuid }) => uuid === appointment_uuid
    )
  }
}

/**
 * @import { DayOfTheWeek, PartOfTheDay } from '../enums.js'
 */
