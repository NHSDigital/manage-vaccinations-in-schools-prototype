import { fakerEN_GB as faker } from '@faker-js/faker'
import filters from '@x-govuk/govuk-prototype-filters'

import activity from '../datasets/activity.js'
import {
  AcademicYear,
  AuditEventType,
  ClinicAttendanceType,
  PatientClinicStatus,
  PatientStatus,
  ReplyRefusal,
  RegistrationStatus,
  SessionType
} from '../enums.js'
import {
  AuditEvent,
  ClinicAppointment,
  ClinicBooking,
  Gillick,
  Patient,
  Programme,
  Session
} from '../models.js'
import {
  formatDate,
  getDateValueDifference,
  getYearGroup
} from '../utils/date.js'
import { getRegistrationStatusProperties } from '../utils/enum-properties.js'
import {
  canRecordSessionOutcome,
  getRegistrationStatus,
  getRegistrationStatusDescription
} from '../utils/patient-session.js'
import { formatLink, formatTag, formatYearGroup } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} PatientSessionOptions
 * @property {string} [uuid] - Patient session UUID
 * @property {Gillick} [gillick] - Gillick assessment
 * @property {Array<AuditEvent>} [notes] - Notes
 * @property {boolean} [hasAlternativeVaccine] - Administer alternative vaccine
 */

/**
 * @class Patient Session
 */
export class PatientSession extends BaseModel {
  static contextKey = 'patientSessions'
  static identifierKey = 'uuid'
  static ns = 'patientSession'

  /**
   * @param {PatientSessionOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    /** @type {string|undefined} */
    this.programme_id

    /** @type {Programme|undefined} */
    this.programme

    /** @type {string|undefined} */
    this.session_id

    /** @type {Session|undefined} */
    this.session

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.gillick = options?.gillick && new Gillick(options.gillick)
    this.notes = options?.notes || []
    this.hasAlternativeVaccine = options?.hasAlternativeVaccine || false
  }

  /**
   * Get patient programme
   *
   * @returns {PatientProgramme|undefined} Patient programme
   */
  get patientProgramme() {
    return Object.values(this.patient?.programmes).find(
      (patientProgramme) =>
        patientProgramme.programme_id === this.programme_id &&
        patientProgramme.academicYear === this.session.academicYear
    )
  }

  /**
   * Get year group, within context of patient session’s academic year
   *
   * @returns {number} Year group in patient session’s academic year
   */
  get yearGroup() {
    return getYearGroup(this.patient?.dob, this.session?.academicYear)
  }

  /**
   * Get audit events for patient session
   *
   * @returns {Array<AuditEvent>} Audit events
   */
  get auditEvents() {
    return this.patient?.events
      .map((auditEvent) => new AuditEvent(auditEvent, this.context))
      .filter(
        ({ programme_ids, session_id }) =>
          (programme_ids &&
            programme_ids.some((id) =>
              this.session?.programme_ids.includes(id)
            )) ||
          session_id === this.session_id
      )
  }

  /**
   * Get audit events grouped by date
   *
   * @returns {object} Events grouped by date
   */
  get auditEventLog() {
    return this.auditEvents.sort((a, b) => {
      return getDateValueDifference(b.createdAt, a.createdAt)
    })
  }

  /**
   * Get session notes
   *
   * @returns {Array<AuditEvent>} Audit event
   */
  get sessionNotes() {
    return this.auditEvents
      .filter(({ type }) => type === AuditEventType.SessionNote)
      .filter(({ session_id }) => session_id === this.session_id)
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
  }

  /**
   * Get the clinic appointment associated with this patient session
   *
   * @returns {ClinicAppointment|undefined} Appointment if found, or undefined otherwise
   */
  get clinicAppointment() {
    if (this.session.type !== SessionType.Clinic) {
      return
    }

    return ClinicBooking.findAll(this.context)
      ?.flatMap(({ appointments }) => appointments)
      ?.filter(
        (appointment) =>
          appointment.session_id === this.session_id &&
          appointment.selected_programme_ids.includes(this.programme_id)
      )
      ?.find(({ patient_uuid }) => patient_uuid === this.patient_uuid)
  }

  /**
   * Is this patient-session for a booked clinic appointment, or for a drop-in?
   *
   * @returns {ClinicAttendanceType|undefined} Attendance type if this is for a clinic session, or undefined otherwise
   */
  get clinicAttendanceType() {
    if (this.session.type !== SessionType.Clinic) {
      return
    }

    return this.clinicAppointment
      ? ClinicAttendanceType.Appointment
      : ClinicAttendanceType.DropIn
  }

  /**
   * Is the patient booked into clinic for only a subset of the programmes they can be vaccinated for at clinic?
   *
   * @returns {boolean} true if can be offered other vaccinations, or false otherwise
   */
  get canBeOfferedCatchUps() {
    return this.additionalProgrammesToOffer.length > 0
  }

  /**
   * Get any extra programmes that can be offered at clinic beyond what's already planned
   *
   * @returns {Array<PatientProgramme>} the additional programmes that can be offered
   */
  get additionalProgrammesToOffer() {
    if (this.session.type !== SessionType.Clinic) {
      return []
    }

    const bookedProgramme_ids = this.siblingPatientSessions.map(
      (sibling) => sibling.programme_id
    )
    const programmesToOffer = Object.values(
      this.patient.activeProgrammes
    ).filter(
      (patientProgramme) =>
        [PatientClinicStatus.Ready, PatientClinicStatus.Invited].includes(
          String(patientProgramme.clinicStatus)
        ) && !bookedProgramme_ids.includes(patientProgramme.programme_id)
    )

    return programmesToOffer
  }

  /**
   * Get related patient sessions
   *
   * @returns {Array<PatientSession>|undefined} Patient sessions
   */
  get siblingPatientSessions() {
    try {
      return PatientSession.findAll(this.context)
        .filter(({ patient_uuid }) => patient_uuid === this.patient_uuid)
        .filter(({ session_id }) => session_id === this.session_id)
        .sort((a, b) => a.programme?.name.localeCompare(b.programme?.name))
    } catch (error) {
      console.error('PatientSession.siblingPatientSessions', error.message)
    }
  }

  /**
   * Get next activity, per programme
   *
   * @returns {Array<PatientSession>|undefined} Patient sessions per programme
   */
  get outstandingVaccinations() {
    return this.siblingPatientSessions?.filter(
      ({ patientProgramme }) => patientProgramme.status === PatientStatus.Due
    )
  }

  /**
   * Were all consent refusal reasons down to not wanting vaccination in school?
   *
   * @returns {boolean} True if all refusals were on grounds of not wanting vaccination in school, or false otherwise
   */
  get isVaccinationWantedOutsideSchool() {
    const refusalReasons = this.patientProgramme?.consentRefusalReasons
    return (
      refusalReasons.length &&
      refusalReasons.every((reason) => reason === ReplyRefusal.OutsideSchool)
    )
  }

  /**
   * Get registration status
   *
   * @returns {RegistrationStatus} Registration status
   */
  get register() {
    return getRegistrationStatus(this)
  }

  /**
   * Get expanded description about registration status
   *
   * @returns {string} Registration description
   */
  get registerDescription() {
    return getRegistrationStatusDescription(this)
  }

  /**
   * Get ready to record outcome
   *
   * @returns {boolean} Ready to record outcome
   */
  get canRecordSessionOutcome() {
    return canRecordSessionOutcome(this)
  }

  /**
   * Get formatted links
   *
   * @returns {object} Formatted links
   */
  get link() {
    return {
      fullName: formatLink(this.uri, this.patient?.fullName || '')
    }
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
          switch (prop) {
            case 'programme':
              return this.programme?.nameTag
            case 'register':
              return formatTag(getRegistrationStatusProperties(this.register))
            case 'outstandingVaccinations': {
              const outstanding = this.outstandingVaccinations?.map(
                (vaccination) => vaccination.programme?.name
              )
              return filters.formatList(outstanding)
            }
            case 'additionalProgrammesToOffer': {
              const additionalProgrammesToOffer =
                this.additionalProgrammesToOffer
              return additionalProgrammesToOffer.length
                ? additionalProgrammesToOffer
                    .map(
                      (patientProgramme) =>
                        patientProgramme.formatted.programmeStatus
                    )
                    .join('<br>')
                : undefined
            }
            case 'yearGroup': {
              let formattedYearGroup = formatYearGroup(this.yearGroup)
              formattedYearGroup += this.patient?.registrationGroup
                ? `, ${this.patient?.registrationGroup}`
                : ''
              formattedYearGroup += ` (${AcademicYear[this.session.academicYear]} academic year)`
              return formattedYearGroup
            }
            case 'creationTime':
              return formatDate(this.createdAt, {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true
              })
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
    return `/sessions/${this.session_id}/patients/${this.patient?.nhsn}/${this.programme_id}`
  }

  /**
   * Remove patient from session
   *
   * @param {Pick<AuditEvent, 'createdBy_uid'>} event - Event
   */
  removeFromSession(event) {
    this.patient.patientSession_uuids =
      this.patient?.patientSession_uuids.filter((uuid) => uuid !== this.uuid)

    this.patient?.addEvent({
      name: activity.session.removed(this.session),
      createdBy_uid: event.createdBy_uid,
      programme_ids: this.session?.programme_ids
    })
  }

  /**
   * Assess Gillick competence
   *
   * @param {Partial<Gillick>} gillick - gillick
   */
  assessGillick(gillick) {
    this.patient?.addEvent({
      name: gillick.updatedAt
        ? activity.gillick.updated(gillick)
        : activity.gillick.created(gillick),
      note: gillick.note,
      createdAt: gillick.createdAt,
      createdBy_uid: gillick.createdBy_uid,
      programme_ids: this.session?.programme_ids
    })

    PatientSession.update(this.uuid, { gillick }, this.context)
  }

  /**
   * Register attendance
   *
   * @param {Partial<AuditEvent>} event - Event
   * @param {RegistrationStatus} register - Registration
   */
  registerAttendance(event, register) {
    this.session?.updateRegister(this.patient?.uuid, register)

    this.patient?.addEvent({
      name:
        register === RegistrationStatus.Present
          ? activity.attendance.present(this.session)
          : activity.attendance.absent(this.session),
      createdAt: event.createdAt,
      createdBy_uid: event.createdBy_uid,
      programme_ids: this.session?.programme_ids
    })
  }

  /**
   * Record pre-screening interview
   *
   * @param {Partial<AuditEvent>} event - Event
   */
  preScreen(event) {
    this.patient?.addEvent({
      name: activity.preScreen.created,
      note: event.note,
      createdAt: event.createdAt,
      createdBy_uid: event.createdBy_uid,
      programme_ids: this.session?.programme_ids
    })
  }

  /**
   * Save note
   *
   * @param {Partial<AuditEvent>} event - Event
   */
  saveNote(event) {
    this.patient?.addEvent({
      name: activity.note.created(event.type),
      note: event.note,
      type: event.type || AuditEventType.SessionNote,
      createdBy_uid: event.createdBy_uid,
      programme_ids: event.programme_ids,
      session_id: event.session_id
    })
  }

  /**
   * Send reminder
   *
   * @param {Partial<AuditEvent>} event - Event
   * @param {Contact} contact - Contact
   */
  sendReminder(event, contact) {
    this.patient?.addEvent({
      name: activity.notify['vaccination-reminder'](contact),
      messageRecipient: contact,
      messageTemplate: 'vaccination-reminder',
      type: AuditEventType.Reminder,
      createdBy_uid: event.createdBy_uid,
      patient_uuid: this.patient_uuid,
      programme_ids: this.session?.programme_ids,
      session_id: this.session?.id
    })
  }
}

PatientSession.relate('patient_uuid', () => Patient, 'patient')
PatientSession.relate('programme_id', () => Programme, 'programme')
PatientSession.relate('session_id', () => Session, 'session')

/**
 * @import { Contact, PatientProgramme } from '../models.js'
 * @import { BaseModelOptions } from './base.js'
 */
