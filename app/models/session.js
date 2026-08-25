import { fakerEN_GB as faker } from '@faker-js/faker'
import { default as filters } from '@x-govuk/govuk-prototype-filters'
import { isAfter, isSameDay } from 'date-fns'
import _ from 'lodash'

import programmesData from '../datasets/programmes.js'
import {
  ConsentStatus,
  ConsentWindow,
  InstructionStatus,
  PatientStatus,
  ProgrammeType,
  RecordVaccineCriteria,
  SessionPresets,
  SessionPresetName,
  SessionStatus,
  SessionType,
  TeamDefaults,
  VaccineCriteria,
  ClinicAppointmentStatus,
  VaccinationProtocol
} from '../enums.js'
import {
  Clinic,
  ClinicAppointment,
  ClinicBooking,
  ClinicVaccinationPeriod,
  Consent,
  PatientSession,
  Programme,
  School,
  Vaccine
} from '../models.js'
import {
  addDays,
  removeDays,
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  getCurrentAcademicYear,
  setMidday,
  today
} from '../utils/date.js'
import { tokenize } from '../utils/object.js'
import {
  getConsentWindow,
  getSessionActivityCount,
  removeSlots
} from '../utils/session.js'
import {
  formatLink,
  formatList,
  formatMarkdown,
  formatWithSecondaryText,
  formatYearGroups,
  sentenceCaseProgrammeName,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} SessionOptions
 * @property {string} [id] - School ID
 * @property {SessionType} [type] - Session type
 * @property {Date} [date] - Dates
 * @property {object} [date_] - Dates (from `dateInput`s)
 * @property {number} [academicYear] - Programme year
 * @property {Array<SessionPresetName>} [presetNames] - Session preset names
 * @property {SessionMMRConsent} [mmrConsent] - Does session use MMR outbreak comms?
 * @property {boolean} [hasRegistration] - Session has registration?
 *
 *   Clinics only
 * @property {Array<ClinicVaccinationPeriod>} [vaccinationPeriods] - Vaccination periods
 * @property {number} [slotLength] - Length of a single clinic appointment slot, in minutes
 * @property {string} [venueInformation] - Venue information e.g. entrance to use, room to find, etc.
 *
 *   Schools only
 * @property {Array<number>} [yearGroups] - Year groups
 * @property {Date} [consentOpenAt] - Date consent window opens
 * @property {object} [consentOpenAt_] - Date consent window opens (from `dateInput`)
 * @property {Date} [closeAt] - Date session closed
 * @property {Date} [cancelledAt] - Date session cancelled
 * @property {number} [reminderWeeks] - Weeks before session to send reminders
 * @property {object} [register] - Patient register
 * @property {VaccinationProtocol} [protocolNurse] - Default protocol for nurse
 * @property {VaccinationProtocol} [protocolHCA] - Default protocol for HCA
 */

/**
 * @class Session
 */
export class Session extends BaseModel {
  static contextKey = 'sessions'
  static identifierKey = 'id'
  static ns = 'session'

  /**
   * @param {SessionOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.clinic_id

    /** @type {Clinic|undefined} */
    this.clinic

    /** @type {string|undefined} */
    this.school_id

    /** @type {School|undefined} */
    this.school

    this.context = context
    this.id = options?.id || faker.helpers.replaceSymbols('###')
    this.type = options?.type || SessionType.School
    this.date = options?.date && new Date(options.date)
    this.date_ = options?.date_
    this.academicYear = options?.academicYear || getCurrentAcademicYear()
    this.presetNames = stringToArray(options?.presetNames)
    this.cancelledAt = options?.cancelledAt && new Date(options.cancelledAt)
    this.hasRegistration = stringToBoolean(options?.hasRegistration)
    this.register = options?.register || {}

    if (this.type === SessionType.Clinic) {
      this.vaccinationPeriods = options?.vaccinationPeriods
        ? options.vaccinationPeriods.map(
            (period) => new ClinicVaccinationPeriod(period)
          )
        : []
      this.slotLength = options?.slotLength
      this.venueInformation = options?.venueInformation
    }

    if (this.type === SessionType.School) {
      this.yearGroups = stringToArray(options?.yearGroups).map(Number)
      this.consentOpenAt = options?.consentOpenAt
        ? new Date(options.consentOpenAt)
        : this.date
          ? removeDays(this.date, TeamDefaults.SessionOpenWeeks * 7)
          : undefined
      this.consentOpenAt_ = options?.consentOpenAt_
      this.closeAt = options?.closeAt && new Date(options.closeAt)
      this.reminderWeeks =
        options?.reminderWeeks || TeamDefaults.SessionReminderWeeks
      this.mmrConsent = this.presetNames?.includes(SessionPresetName.MMR)
        ? options?.mmrConsent
        : undefined
    }

    // Sessions administering the flu programme can use PGD or VGD protocol
    if (this.programme_ids.includes('flu')) {
      this.protocolNurse = options?.protocolNurse || VaccinationProtocol.PGD
      this.protocolHCA = options?.protocolHCA || ''
      this.hasPsdProtocol = stringToBoolean(options?.hasPsdProtocol) || false
    }
  }

  /**
   * Get session date for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get date_() {
    return convertIsoDateToObject(this.date)
  }

  /**
   * Set session date from `dateInput`s
   *
   * @param {object} object - dateInput object
   */
  set date_(object) {
    if (object) {
      this.date = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get date consent window opens for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get consentOpenAt_() {
    return convertIsoDateToObject(this.consentOpenAt)
  }

  /**
   * Set date consent window opens from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set consentOpenAt_(object) {
    if (object) {
      this.consentOpenAt = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get date reminders to give consent are sent
   *
   * @returns {Date|undefined} Reminder dates
   */
  get reminderDate() {
    if (this.date) {
      return removeDays(this.date, 7)
    }
  }

  /**
   * Get date next automated reminder will be sent
   *
   * @returns {Date|undefined} Next reminder date
   */
  get nextReminderDate() {
    if (this.date) {
      return removeDays(this.date, this.reminderWeeks * 7)
    }
  }

  /**
   * Get consent close date
   *
   * @returns {Date|undefined} Consent close date
   */
  get consentCloseAt() {
    // Always close consent for school sessions one day before final session
    if (this.date) {
      return removeDays(this.date, 1)
    }
  }

  /**
   * Get consents (unmatched consent responses)
   *
   * @returns {Array<Consent>} Consent
   */
  get consents() {
    if (this.context.replies) {
      return Consent.findAll(this.context).filter(
        ({ session_id }) => session_id === this.id
      )
    }

    return []
  }

  /**
   * Get consent form URL
   *
   * @returns {string} Consent form URL
   */
  get consentUrl() {
    return `/give-or-refuse-consent/${this.id}`
  }

  /**
   * Get consent form HTML list
   *
   * @returns {string} Consent form HTML list
   */
  get consentForms() {
    if (!this.isCompleted) {
      let forms = [this.formatted.consentUrl]

      for (const programme of this.programmes) {
        forms = [...forms, programme.formatted.consentPdf]
      }

      return formatList(forms).replace(' nhsuk-list--bullet', '')
    }

    return ''
  }

  /**
   * Get consent window
   *
   * @returns {string} Consent window
   */
  get consentWindow() {
    return getConsentWindow(this)
  }

  /**
   * Is unplanned session
   *
   * @returns {boolean} Is unplanned session
   */
  get isUnplanned() {
    return this.status === SessionStatus.Unplanned
  }

  /**
   * Is planned session
   *
   * @returns {boolean} Is planned session
   */
  get isPlanned() {
    return this.status === SessionStatus.Planned
  }

  /**
   * Is active session
   *
   * @returns {boolean} Is active session
   */
  get isActive() {
    return this.status === SessionStatus.Active
  }

  /**
   * Is completed session
   *
   * @returns {boolean} Is completed session
   */
  get isCompleted() {
    return this.status === SessionStatus.Completed
  }

  /**
   * Is closed session
   *
   * @returns {boolean} Is closed session
   */
  get isClosed() {
    return this.status === SessionStatus.Closed
  }

  /**
   * Is the session cancelled?
   *
   * @returns {boolean} True if cancelled, or false otherwise
   */
  get isCancelled() {
    return this.status === SessionStatus.Cancelled
  }

  /**
   * Does session occur in the current academic year?
   *
   * @returns {boolean} Session occurs in current academic year
   */
  get isPastSession() {
    return this.academicYear < getCurrentAcademicYear()
  }

  /**
   * Does session need to support the VGD protocol?
   *
   * @returns {boolean} Session need to support the VGD protocol?
   */
  get hasVgdProtocol() {
    return (
      this.protocolNurse === VaccinationProtocol.VGD ||
      this.protocolHCA === VaccinationProtocol.VGD
    )
  }

  /**
   * Get status
   *
   * @returns {SessionStatus} Status
   */
  get status() {
    switch (true) {
      case !!this.closeAt:
        return SessionStatus.Closed
      case !!this.cancelledAt:
        return SessionStatus.Cancelled
      case !this.date:
        return SessionStatus.Unplanned
      case isSameDay(this.date, setMidday(today())):
        return SessionStatus.Active
      case isAfter(setMidday(today()), this.date):
        return SessionStatus.Completed
      default:
        return SessionStatus.Planned
    }
  }

  /**
   * Get the vaccination period with the given UUID in this clinic session
   *
   * @param {string} period_uuid - Unique ID of the vaccination period to return
   * @returns {ClinicVaccinationPeriod} Vaccination period matching given UUID
   */
  getVaccinationPeriod(period_uuid) {
    if (this.type !== SessionType.Clinic) {
      throw new Error('Session must be a clinic to get vaccination periods')
    }

    return this.vaccinationPeriods?.find(
      (period) => period.uuid === period_uuid
    )
  }

  /**
   * Add a new vaccination period to this clinic session
   *
   * @param {object} options - Any specific values to give the new period
   * @returns {ClinicVaccinationPeriod} New vaccination period
   */
  addVaccinationPeriod(options) {
    if (this.type !== SessionType.Clinic) {
      throw new Error('Session must be a clinic to add vaccination periods')
    }

    this.vaccinationPeriods = this.vaccinationPeriods || []
    this.vaccinationPeriods.push(new ClinicVaccinationPeriod(options || {}))

    const newPeriod = this.vaccinationPeriods.at(-1)
    if (this.vaccinationPeriods.length >= 2) {
      newPeriod.vaccinatorCount = this.vaccinationPeriods.at(-2).vaccinatorCount
    }

    return newPeriod
  }

  /**
   * Remove a vaccination period from this clinic session
   *
   * @param {string} period_uuid - the unique ID of the vaccination period to remove
   */
  removeVaccinationPeriod(period_uuid) {
    if (this.type !== SessionType.Clinic) {
      throw new Error('Session must be a clinic to remove vaccination periods')
    }

    const index = this.vaccinationPeriods.findIndex(
      (period) => period.uuid == period_uuid
    )
    if (index === -1) {
      throw new Error(
        `Unable to find vaccination period with uuid of ${period_uuid}`
      )
    }

    this.vaccinationPeriods.splice(index, 1)
  }

  /**
   * How many appointments in total are possible in this clinic session?
   *
   * The returned value assumes that not of the appointments is an extended
   * appointment, so we're really returning the session's maximum possible
   * appointment count.
   *
   * @returns {number} Total number of appointment slots in this clinic session
   */
  get totalAppointmentCount() {
    return this.allAppointmentTimes.length
  }

  /**
   * How many appointment slots remain unbooked in this clinic session?
   *
   * @returns {number} Number of appointment slots remaining in this clinic session
   */
  get availableAppointmentCount() {
    return this.availableAppointmentTimes.length
  }

  /**
   * Get the number of days contacts have left to book their child into this clinic
   *
   * @returns {number} Number of days before appointment booking closes
   */
  get daysLeftToBook() {
    if (this.status !== SessionStatus.Planned) {
      return 0
    }

    // TODO: encode this assumption of closing booking 24 hours before the clinic into the booking process
    const cutOffValue = addDays(this.date, -1).valueOf()
    const todayValue = today().valueOf()

    const millisecondsPerDay = 1000 * 60 * 60 * 24
    const daysLeftToBook = (cutOffValue - todayValue) / millisecondsPerDay

    return Math.max(0, Math.floor(daysLeftToBook))
  }

  /**
   * Does the clinic have staffing levels that vary across the session?
   *
   * @returns {boolean} Staffing levels vary (`true`), or otherwise (`false`)
   */
  get hasVariableVaccinatorCounts() {
    if (this.type !== SessionType.Clinic) {
      return false
    }

    const vaccinatorCounts = new Set(
      this.vaccinationPeriods.map((period) => period.vaccinatorCount)
    )
    return vaccinatorCounts.size > 1
  }

  /**
   * Get the maximum number of vaccinators working in this clinic
   *
   * @returns {number} Maximum number of nurses vaccinating at any point in this clinic
   */
  get maximumVaccinatorCount() {
    if (this.type !== SessionType.Clinic) {
      return 0
    }

    const vaccinatorCounts = new Set(
      this.vaccinationPeriods.map((period) => period.vaccinatorCount)
    )
    return Math.max(...vaccinatorCounts)
  }

  /**
   * Get a list of all available appointment slot times, including parallel appointments
   *
   * @returns {Array<Date>} List of appointment times available to book
   */
  get availableAppointmentTimes() {
    return removeSlots(this.allAppointmentTimes, this.bookedAppointmentTimes)
  }

  /**
   * Get a list of all appointment slot times, booked or otherwise, including parallel appointments
   *
   * @returns {Array<Date>} Start times of all possible appointments in this clinic
   */
  get allAppointmentTimes() {
    const sortedPeriods = _.sortBy(this.vaccinationPeriods, 'startAt')
    return sortedPeriods
      .map((period) => period.allAppointmentTimes(this.slotLength))
      .flat()
  }

  /**
   * Get a list of all booked appointment time slots, including parallel appointments
   *
   * @returns {Array<Date>} List of appointment times booked so far
   */
  get bookedAppointmentTimes() {
    const appointments = this.appointments
    return appointments.map(({ startAt }) => startAt)

    // TODO: expand on this when we can have appointments that cover multiple slots
  }

  /**
   * For a clinic session, get the percentage of slots already booked
   *
   * @returns {number} (Rounded) percentage of slots booked
   */
  get percentBooked() {
    if (this.type !== SessionType.Clinic) {
      throw new Error(
        'Booking percentages are only relevant to clinic sessions'
      )
    }

    if (!this.allAppointmentTimes.length) {
      return 100
    }

    return Math.round(
      (this.bookedAppointmentTimes.length / this.allAppointmentTimes.length) *
        100
    )
  }

  /**
   * Does the clinic have any active (non-archived, non-cancelled) appointments booked?
   *
   * @returns {boolean} Active appointments (`true`), or otherwise (`false`)
   */
  get hasAppointments() {
    if (this.type !== SessionType.Clinic) {
      throw new Error(
        'Clinic appointments are only relevant to clinic sessions'
      )
    }

    // Same logic as in this.appointments but quicker to return
    return ClinicBooking.findAll(this.context)
      ?.flatMap(({ appointments }) => appointments)
      .some(
        (appointment) =>
          appointment.session_id === this.id &&
          appointment.status === ClinicAppointmentStatus.Booked
      )
  }

  /**
   * Get all appointments for this clinic
   *
   * @returns {Array<ClinicAppointment>} Appointments made for this session
   */
  get appointments() {
    if (this.type !== SessionType.Clinic) {
      throw new Error(
        'Clinic appointments are only relevant to clinic sessions'
      )
    }

    // Same logic as in this.hasAppointments but gets the full list
    const appointments = ClinicBooking.findAll(this.context)
      ?.flatMap(({ appointments }) => appointments)
      .filter(
        (appointment) =>
          appointment.session_id === this.id &&
          appointment.status === ClinicAppointmentStatus.Booked
      )

    return appointments
  }

  /**
   * Get the clinic appointments that will involve vaccination to the given programme
   *
   * @param {string} programme_id - ID of programme whose appointments we’re interested in
   * @returns {Array<ClinicAppointment>} Clinic appointments that include vaccination for the given programme
   */
  programmeAppointments(programme_id) {
    return this.appointments.filter((appointment) =>
      appointment.selected_programme_ids.includes(programme_id)
    )
  }

  /**
   * Get all appointments for this clinic with unmatched child details
   *
   * @returns {Array<ClinicAppointment>} Appointments made for unmatched children
   */
  get unmatchedAppointments() {
    const appointments = this.appointments
    return appointments.filter(({ patient_uuid }) => !patient_uuid)
  }

  /**
   * Get a list of the appointments already made but for which we don't have capacity
   *
   * @returns {Array<ClinicAppointment>} - the appointments we'll need to cancel
   */
  get appointmentsToCancel() {
    const allAppointmentsByTime = _.groupBy(this.appointments, (appointment) =>
      appointment.startAt.getTime()
    )

    const appointmentsWithoutVaccinators = []
    Object.entries(allAppointmentsByTime).forEach(([key, appointments]) => {
      const startAt = new Date()
      startAt.setTime(Number(key))
      const vaccinationPeriod = this.vaccinationPeriods.find((period) =>
        period.includesAppointmentTime(startAt, this.slotLength)
      )
      if (!vaccinationPeriod) {
        // No longer part of a vaccination period, so cancel all appointments at this time
        appointmentsWithoutVaccinators.push(...appointments)
      } else if (vaccinationPeriod.vaccinatorCount < appointments.length) {
        // Not enough vaccinators at this time, so those who booked first get to keep their appointments
        appointments = _.sortBy(appointments, 'booking.createdAt')
        appointmentsWithoutVaccinators.push(
          ...appointments.slice(vaccinationPeriod.vaccinatorCount)
        )
      }
    })

    return appointmentsWithoutVaccinators
  }

  /**
   * Get patient sessions
   *
   * @returns {Array<PatientSession>} Patient sessions
   */
  get patientSessions() {
    if (this.context?.patients && this.id) {
      return PatientSession.findAll(this.context)
        .filter(({ session }) => session.id === this.id)
        .filter(({ patient }) => !patient?.pendingChanges?.school_id)
    }

    return []
  }

  /**
   * Get patients
   *
   * @returns {Array<PatientSession>} Patient sessions
   */
  get patients() {
    return _.uniqBy(this.patientSessions, 'patient.nhsn')
  }

  /**
   * Get session presets
   *
   * @returns {Array<SessionPreset>} Patient sessions
   */
  get presets() {
    return SessionPresets.filter((sessionPreset) =>
      this.presetNames?.includes(sessionPreset.name)
    )
  }

  /**
   * Get primary programme ids
   *
   * @returns {Array<string>} Programme IDs
   */
  get programme_ids() {
    const programme_ids = new Set()
    for (const preset of this.presets) {
      for (const programmeType of preset.programmeTypes) {
        const programme = programmesData[programmeType]
        programme_ids.add(programme.id)
      }
    }

    return [...programme_ids]
  }

  /**
   * Get the programmes targeted by this session
   *
   * @returns {Array<Programme>} Programmes
   */
  get programmes() {
    return this.programme_ids
      .map((id) => Programme.findOne(id, this.context))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  /**
   * Get the programmes with clinic appointments booked for them
   *
   * @returns {Array<Programme>} Programmes
   */
  get bookedProgrammes() {
    if (this.type !== SessionType.Clinic) {
      throw new Error('Session must be a clinic to get booked programmes')
    }

    return [
      ...new Set(
        this.appointments.flatMap(
          (appointment) => appointment.selected_programme_ids
        )
      )
    ].map((id) => Programme.findOne(id, this.context))
  }

  /**
   * Get session vaccines
   *
   * @returns {Array<Vaccine>} Vaccines
   */
  get vaccines() {
    if (this.context?.vaccines && this.programmes) {
      const snomedCodes = new Set()

      for (const programme of this.programmes) {
        for (const vaccine_snomed of programme.vaccine_snomeds) {
          snomedCodes.add(vaccine_snomed)
        }
      }

      return [...snomedCodes].map(
        (snomed) => new Vaccine(this.context?.vaccines[snomed])
      )
    }

    return []
  }

  /**
   * Get all vaccine criteria used in session (if more than one)
   *
   * @returns {Array<RecordVaccineCriteria>|undefined} Vaccine criteria
   */
  get vaccineCriteria() {
    const programmeTypes = this.programmes.map((programme) => programme.type)
    const vaccineCriteria = []

    if (programmeTypes.includes(ProgrammeType.Flu)) {
      return [
        ...vaccineCriteria,
        RecordVaccineCriteria.AlternativeFluInjectionOnly,
        RecordVaccineCriteria.IntranasalOnly,
        RecordVaccineCriteria.IntranasalPreferred
      ]
    }

    if (programmeTypes.includes(ProgrammeType.MMR)) {
      return [
        ...vaccineCriteria,
        RecordVaccineCriteria.AlternativeMMRInjectionOnly
      ]
    }
  }

  /**
   * Check if session offers an alternative vaccine
   * For example, the flu programme offer both nasal and injection vaccines
   *
   * @returns {boolean} Has alternative vaccines
   */
  get canOfferAlternativeVaccine() {
    const programmesWithAlternativeVaccine = this.programmes.filter(
      ({ alternativeVaccine }) => alternativeVaccine
    )

    return programmesWithAlternativeVaccine.length > 0
  }

  /**
   * Check if session offers an intranasal vaccine
   * For example, the standard vaccine for the flu programme is a nasal spray
   *
   * @returns {boolean} Has alternative vaccines
   */
  get canOfferIntranasalVaccine() {
    const programmesWithIntranasalVaccine = this.programmes.filter(
      ({ standardVaccine }) =>
        standardVaccine.criteria === VaccineCriteria.Intranasal
    )

    return programmesWithIntranasalVaccine.length > 0
  }

  /**
   * Get programme name(s)
   *
   * @returns {object} Programme name(s)
   * @example Flu
   * @example Td/IPV and MenACWY
   */
  get programmeNames() {
    return {
      sentenceCase: filters.formatList(
        this.programmes.map(({ name }) => sentenceCaseProgrammeName(name))
      ),
      titleCase: filters.formatList(this.programmes.map(({ name }) => name))
    }
  }

  /**
   * Get primary vaccination name(s)
   *
   * @returns {object} Vaccination name(s)
   * @example Flu vaccination
   * @example Td/IPV and MenACWY vaccinations
   */
  get vaccinationNames() {
    const pluralisation =
      this.programmes.length === 1 ? 'vaccination' : 'vaccinations'

    return {
      sentenceCase: `${filters.formatList(
        this.programmes.map((programme) =>
          sentenceCaseProgrammeName(programme.emailName())
        )
      )} ${pluralisation}`,
      titleCase: `${filters.formatList(this.programmes.map((programme) => programme.emailName()))} ${pluralisation}`
    }
  }

  /**
   * Get vaccination name to use in subject for email invitation
   *
   * @returns {string} Vaccination name(s)
   * @example ‘MMR catch-up’ or ‘MMR (measles, mumps and rubella) catch-up’
   */
  get vaccinationInviteNames() {
    if (this.programmes[0].type === ProgrammeType.MMR) {
      return this.programmes[0].emailName('invite')
    }
    return this.vaccinationNames.titleCase
  }

  /**
   * Get name
   *
   * @returns {string|undefined} Name
   */
  get name() {
    if (this.clinic) {
      return `${this.programmeNames.titleCase} clinic at ${this.location.name} on ${this.formatted.dateShort}`
    }

    if (this.location) {
      return `${this.programmeNames.titleCase} session at ${this.location.name} on ${this.formatted.dateShort}`
    }
  }

  /**
   * Get short name (without dates)
   *
   * @returns {string|undefined} Short name
   */
  get shortName() {
    if (this.clinic) {
      return `${this.programmeNames.titleCase} clinic at ${this.location.name}`
    }

    if (this.location) {
      return `${this.programmeNames.titleCase} session at ${this.location.name}`
    }
  }

  /**
   * Get address
   *
   * @returns {object|undefined} Address
   */
  get address() {
    const type = this.type === SessionType.School ? 'school' : 'clinic'

    if (this[type]) {
      return this[type].address
    }
  }

  /**
   * Get location (name and address)
   *
   * @returns {object} Location
   */
  get location() {
    const type = this.type === SessionType.School ? 'school' : 'clinic'

    return this[type]?.location
  }

  /**
   * Get session activity counts
   *
   * @returns {object} Session activity counts
   */
  get activity() {
    return new Proxy(
      {},
      {
        get: (_target, property) => {
          switch (property) {
            case 'getConsent':
              return getSessionActivityCount(this, [
                {
                  consent: ConsentStatus.NoResponse
                }
              ])
            case 'giveInstructions':
              return getSessionActivityCount(this, [
                {
                  status: PatientStatus.Due,
                  instructionStatus: InstructionStatus.Needed
                }
              ])
            default:
              return undefined
          }
        }
      }
    )
  }

  /**
   * Get session tally programme count
   *
   * @param {string} programme_id - Programme ID
   * @param {PatientStatus} status - Programme status
   * @param {VaccineCriteria} vaccineCriteria - Vaccine criteria
   * @returns {number} Session tally count
   */
  tally(programme_id, status, vaccineCriteria) {
    return getSessionActivityCount(this, [
      { programme_id, status, vaccineCriteria }
    ])
  }

  /**
   * Get patient sessions that can be moved to a clinic session
   *
   * @returns {Array<PatientSession>} Patient sessions
   */
  get patientSessionsForClinic() {
    return this.patients.filter(
      ({ patientProgramme }) => patientProgramme.status === PatientStatus.Due
    )
  }

  /**
   * Get next available clinic session
   *
   * @returns {Session} Session
   */
  get nextProgrammeClinic() {
    return Session.findAll(this.context).find(
      (session) => session.type === SessionType.Clinic
    )
  }

  /**
   * Get tokenised values (to use in search queries)
   *
   * @returns {string} Tokens
   */
  get tokenized() {
    const tokens = tokenize(this, ['location.postalCode', 'location.name'])

    return [tokens].join(' ')
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          // Shared configuration
          const consentDateStyle = { day: 'numeric', month: 'long' }

          // Lazily format consent window values
          const getConsentWindowData = () => {
            let consentWindow = ''
            let consentWindowSentence = ''

            switch (this.consentWindow) {
              case ConsentWindow.Opening:
                consentWindow = `Opens ${formatDate(this.consentOpenAt, consentDateStyle)}`
                consentWindowSentence = `Consent window opens on ${formatDate(this.consentOpenAt, consentDateStyle)}.`
                break
              case ConsentWindow.Closed:
                consentWindow = `Closed ${formatDate(this.consentCloseAt, consentDateStyle)}`
                consentWindowSentence = `Consent window closed on ${formatDate(this.consentCloseAt, consentDateStyle)}.`
                break
              case ConsentWindow.Open:
                consentWindow = `Open from ${formatDate(this.consentOpenAt, consentDateStyle)} until ${formatDate(this.consentCloseAt, consentDateStyle)}`
                consentWindowSentence = `Consent window is open from ${formatDate(this.consentOpenAt, consentDateStyle)} until ${formatDate(this.consentCloseAt, consentDateStyle)}.`
                break
            }
            return { consentWindow, consentWindowSentence }
          }

          // Lazily harvest various things from the vaccination periods
          const getVaccinationPeriodData = () => {
            let startAndEndTimes = ''
            let vaccinatorCounts = ''
            let totalAppointments = 0

            if (this.type === SessionType.Clinic) {
              let lastVaccinatorCount = -1
              let hasVariableVaccinatorCounts = false

              this.vaccinationPeriods.forEach(
                (vaccinationPeriod, periodIndex) => {
                  const thisPeriod =
                    vaccinationPeriod.formatted.startAndEndTimes
                  const thisVaccinatorCount =
                    vaccinationPeriod.vaccinatorCount || 0

                  startAndEndTimes += thisPeriod
                  vaccinatorCounts += `${thisVaccinatorCount} from ${thisPeriod}`
                  if (periodIndex < this.vaccinationPeriods.length - 1) {
                    startAndEndTimes += '<br>'
                    vaccinatorCounts += '<br>'
                  }

                  hasVariableVaccinatorCounts =
                    hasVariableVaccinatorCounts ||
                    (lastVaccinatorCount !== -1 &&
                      lastVaccinatorCount !== thisVaccinatorCount)
                  lastVaccinatorCount = thisVaccinatorCount

                  totalAppointments += vaccinationPeriod.appointmentCount(
                    this.slotLength
                  )
                }
              )

              if (!hasVariableVaccinatorCounts) {
                vaccinatorCounts = lastVaccinatorCount.toString()
              }
            }

            return { startAndEndTimes, vaccinatorCounts, totalAppointments }
          }

          switch (prop) {
            case 'address':
              return (
                this.address &&
                Object.values(this.address).filter(Boolean).join('<br>')
              )
            case 'dateShort':
              return formatDate(this.date, { dateStyle: 'long' })
            case 'date':
              return formatDate(this.date, { dateStyle: 'full' }).replace(
                ',',
                ''
              )
            case 'nextDate':
              return formatDate(this.date, {
                weekday: 'long',
                month: 'long',
                day: 'numeric'
              })
            case 'consentOpenAt':
              return formatDate(this.consentOpenAt, { dateStyle: 'full' })
            case 'reminderDate':
              return formatDate(this.reminderDate, { dateStyle: 'full' })
            case 'nextReminderDate':
              return formatDate(this.nextReminderDate, { dateStyle: 'full' })
            case 'reminderWeeks': {
              const nextReminder = formatDate(this.nextReminderDate, {
                dateStyle: 'full'
              })
              const reminderWeeksText = filters.plural(
                this.reminderWeeks,
                'week'
              )
              return nextReminder
                ? formatWithSecondaryText(
                    `Send ${reminderWeeksText} before each session`,
                    `First: ${nextReminder}`
                  )
                : `Send ${reminderWeeksText} before each session`
            }
            case 'consentCloseAt':
              return formatDate(this.consentCloseAt, { dateStyle: 'full' })
            case 'patients':
              return filters.plural(this.patients.length, 'child')
            case 'consents':
              return this.consents.length > 0
                ? filters.plural(this.consents.length, 'child')
                : undefined
            case 'programmes':
              return this.programmes.flatMap(({ nameTag }) => nameTag).join(' ')
            case 'consentUrl':
              return (
                this.consentUrl &&
                formatLink(
                  this.consentUrl,
                  'View the online consent form (opens in new tab)',
                  { target: '_blank' }
                )
              )
            case 'consentWindow':
              return getConsentWindowData().consentWindow
            case 'consentWindowSentence':
              return getConsentWindowData().consentWindowSentence
            case 'location':
              return Object.values(this.location).filter(Boolean).join(', ')
            case 'clinic':
              return this.clinic && this.clinic.name
            case 'venueInformation':
              return this.venueInformation
                ? formatMarkdown(this.venueInformation, { inline: true })
                : 'None given'
            case 'school':
              return this.school && this.school.name
            case 'school_id':
              return this.school && this.school.formatted.id
            case 'yearGroups':
              return this.yearGroups && formatYearGroups(this.yearGroups)
            case 'vaccinationPeriods':
              return getVaccinationPeriodData().startAndEndTimes
            case 'vaccinators':
              return getVaccinationPeriodData().vaccinatorCounts
            case 'totalAppointments':
              return getVaccinationPeriodData().totalAppointments
            case 'slotLength':
              return `${this.slotLength} minutes`
            default:
              return undefined
          }
        }
      }
    )
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/sessions/${this.id}`
  }

  /**
   * Update register
   *
   * @param {string} patient_uuid
   * @param {RegistrationStatus} registration
   */
  updateRegister(patient_uuid, registration) {
    this.register[patient_uuid] = registration
  }
}

Session.relate('clinic_id', () => Clinic, 'clinic')
Session.relate('school_id', () => School, 'school')

/**
 * @import { RegistrationStatus, SessionMMRConsent, SessionPreset } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
