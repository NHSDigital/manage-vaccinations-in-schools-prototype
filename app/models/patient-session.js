import { fakerEN_GB as faker } from '@faker-js/faker'
import filters from '@x-govuk/govuk-prototype-filters'

import activity from '../datasets/activity.js'
import {
  AcademicYear,
  AuditEventType,
  ClinicAttendanceType,
  ConsentOutcome,
  PatientStatus,
  PatientConsentStatus,
  PatientDeferredStatus,
  PatientRefusedStatus,
  PatientVaccinatedStatus,
  RecordVaccineCriteria,
  ReplyDecision,
  ReplyRefusal,
  RegistrationOutcome,
  ScreenOutcome,
  VaccinationOutcome,
  ProgrammeType,
  PatientClinicStatus,
  SessionType,
  PatientTriageStatus
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
import {
  getConsentOutcomeProperties,
  getInstructionOutcomeProperties,
  getRegistrationOutcomeProperties,
  getScreenOutcomeProperties,
  getVaccinationOutcomeProperties
} from '../utils/enum-properties.js'
import {
  canRecordOutcome,
  getConsentOutcomeDescription,
  getInstructionOutcome,
  getPatientConsentStatus,
  getPatientDeferredDescription,
  getPatientDeferredStatus,
  getPatientRefusedStatus,
  getPatientStatusDescription,
  getPatientTriageStatus,
  getPatientVaccinatedStatus,
  getRegistrationOutcome,
  getRegistrationOutcomeDescription,
  getScreenOutcomeDescription,
  getVaccinationOutcome
} from '../utils/patient-session.js'
import {
  countAnswersNeedingTriage,
  getConsentOutcome,
  getConsentHealthAnswers,
  getConsentRefusalReasons
} from '../utils/reply.js'
import {
  formatLink,
  formatTag,
  formatProgrammeStatus,
  formatVaccineCriteria,
  formatYearGroup
} from '../utils/string.js'
import {
  getScreenOutcome,
  getScreenOutcomesForConsentMethod,
  getScreenVaccineCriteria
} from '../utils/triage.js'

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
   * Get triage notes
   *
   * @returns {Array<AuditEvent>} Audit events
   */
  get triageNotes() {
    return this.auditEvents
      .filter(({ type }) => type === AuditEventType.ProgrammeNote)
      .filter(({ programme_ids }) => programme_ids.includes(this.programme_id))
      .filter(({ outcome }) => outcome)
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
   * Get replies for patient session
   *
   * @returns {Array<Reply>|undefined} Replies
   */
  get replies() {
    return this.patient?.replies
      .filter(({ programme_id }) => programme_id === this.programme_id)
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
  }

  /**
   * Get parental relationships from valid replies
   *
   * @returns {Array<string>|undefined} Parental relationships
   */
  get parentalRelationships() {
    if (this.responses) {
      return this.responses
        .filter((reply) => !reply.isInvalidated)
        .flatMap((reply) => reply.relationship || 'Parent or guardian')
    }
  }

  /**
   * Get names of contacts who have requested a follow up
   *
   * @returns {Array<string>|undefined} Contact names and relationships
   */
  get contactsRequestingFollowUp() {
    if (this.responses) {
      return this.responses
        .filter((reply) => !reply.isInvalidated)
        .filter((reply) => reply.hasDeclinedConsent)
        .flatMap((reply) => reply.contact.fullNameAndRelationship)
    }
  }

  /**
   * Get responses (consent requests that were delivered)
   *
   * @returns {Array<Reply>|undefined} Responses
   */
  get responses() {
    return this.replies?.filter((reply) => reply.delivered)
  }

  /**
   * Has every contact given consent for an injected vaccine?
   *
   * Some contacts may give consent for the nasal spray, but also given consent
   * for the injection as an alternative
   *
   * @returns {boolean|undefined} Consent given for an injected vaccine
   */
  get hasConsentForInjection() {
    return this.responses?.every(
      ({ hasConsentForInjection }) => hasConsentForInjection
    )
  }

  /**
   * Has every contact given consent only for an injected vaccine?
   *
   * We need this so that we don’t offer multiple triage outcomes if consent has
   * only been given for the injected vaccine
   *
   * @returns {boolean|undefined} Consent given for an injected vaccine
   */
  get hasConsentForAlternativeInjectionOnly() {
    return this.responses?.every(
      ({ decision }) => decision === ReplyDecision.OnlyAlternativeInjection
    )
  }

  /**
   * Get screen outcomes for vaccination method(s) consented to
   *
   * @returns {Array<ScreenOutcome>|undefined} Screen outcomes
   */
  get screenOutcomesForConsentMethod() {
    if (this.programme && this.responses) {
      return getScreenOutcomesForConsentMethod(this.programme, this.responses)
    }
  }

  /**
   * Get vaccination criteria consented to use if safe to vaccinate
   *
   * @returns {ScreenVaccineCriteria|boolean|undefined} Criteria
   */
  get screenVaccineCriteria() {
    if (this.programme && this.responses) {
      return getScreenVaccineCriteria(this.programme, this.responses)
    }
  }

  /**
   * Get clinic readiness status
   *
   * @returns {PatientClinicStatus|undefined} clinic status for our programme
   */
  get clinicStatus() {
    return this.patientProgramme?.clinicStatus || undefined
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
   * Get vaccine to administer (or was administered) in this patient session
   *
   * For all programmes besides flu, this will be an injection.
   * For the flu programme, this depends on consent responses
   *
   * @returns {Vaccine|undefined} Vaccine method
   */
  get vaccine() {
    const standardVaccine = this.programme?.vaccines.find((vaccine) => vaccine)
    const alternativeVaccine = this.programme?.alternativeVaccine

    // Need consent response (or a clinic appointment) before we can determine
    // the chosen method.
    // We only want to instruct on patients being vaccinated using nasal spray
    if (!this.consentGiven) {
      return
    }

    // If no alternative, can only have been the standard vaccine
    if (!this.programme?.alternativeVaccine) {
      return standardVaccine
    }

    // Administered vaccine was the alternative
    if (
      this.clinicAppointment?.hasConsentForAlternativeVaccine ||
      this.hasAlternativeVaccine
    ) {
      return alternativeVaccine
    }

    // Return vaccine based on consent (and triage) outcomes
    const hasScreenedForInjection =
      this.screen &&
      [
        ScreenOutcome.VaccinateAlternativeFluInjectionOnly,
        ScreenOutcome.VaccinateAlternativeMMRInjectionOnly
      ].includes(String(this.screen))

    return this.hasConsentForAlternativeInjectionOnly || hasScreenedForInjection
      ? alternativeVaccine // Injection
      : standardVaccine // Nasal
  }

  /**
   * Get vaccine to administer (or was administered) in this patient session
   *
   * For all programmes besides flu, this will be an injection.
   * For the flu programme, this depends on consent responses
   *
   * @returns {RecordVaccineCriteria|undefined} Vaccination method
   */
  get vaccineCriteria() {
    // If no programme does not offer alternatives, don’t return a method
    if (!this.programme?.alternativeVaccine) {
      return
    }

    // Need consent response(s) before we can determine the chosen method
    if (!this.consentGiven) {
      return
    }

    if (this.programme.type === ProgrammeType.Flu) {
      if (
        this.consent === ConsentOutcome.GivenForIntranasal ||
        this.screen === ScreenOutcome.VaccinateIntranasalOnly
      ) {
        return RecordVaccineCriteria.IntranasalOnly
      }

      if (
        this.consent === ConsentOutcome.GivenForAlternativeInjection ||
        this.screen === ScreenOutcome.VaccinateAlternativeFluInjectionOnly
      ) {
        return RecordVaccineCriteria.AlternativeFluInjectionOnly
      }

      return RecordVaccineCriteria.IntranasalPreferred
    }

    if (this.programme.type === ProgrammeType.MMR) {
      if (
        this.consent === ConsentOutcome.GivenForAlternativeInjection ||
        this.screen === ScreenOutcome.VaccinateAlternativeMMRInjectionOnly
      ) {
        return RecordVaccineCriteria.AlternativeMMRInjectionOnly
      }

      return RecordVaccineCriteria.NoMMRPreference
    }
  }

  /**
   * Can either vaccine be administered
   *
   * @returns {boolean|undefined} Either vaccine be administered
   */
  get canRecordAlternativeVaccine() {
    const hasScreenedForNasal =
      this.screen === ScreenOutcome.VaccinateIntranasalOnly

    return (
      this.hasConsentForInjection &&
      !this.hasConsentForAlternativeInjectionOnly &&
      !hasScreenedForNasal
    )
  }

  /**
   * Get vaccinations for patient session
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get vaccinationOutcomes() {
    return this.patientProgramme.vaccinationOutcomes
  }

  /**
   * Get last recorded vaccination
   *
   * @returns {Vaccination|undefined} Vaccination
   */
  get lastVaccinationOutcome() {
    return this.patientProgramme.lastVaccinationOutcome
  }

  /**
   * Get next activity, per programme
   *
   * @returns {Array<PatientSession>|undefined} Patient sessions per programme
   */
  get outstandingVaccinations() {
    return this.siblingPatientSessions?.filter(
      ({ status }) => status === PatientStatus.Due
    )
  }

  /**
   * Get patient consent status
   *
   * @returns {PatientConsentStatus|undefined} Patient consent status
   */
  get patientConsent() {
    return getPatientConsentStatus(this)
  }

  /**
   * Get patient triage status
   *
   * @returns {PatientTriageStatus|undefined} Patient triage status
   */
  get patientTriage() {
    return getPatientTriageStatus(this)
  }

  /**
   * Get patient deferred status
   *
   * @returns {PatientDeferredStatus|undefined} Patient deferred status
   */
  get patientDeferred() {
    return getPatientDeferredStatus(this)
  }

  /**
   * Get patient refused status
   *
   * @returns {PatientRefusedStatus|undefined} Patient refused status
   */
  get patientRefused() {
    return getPatientRefusedStatus(this)
  }

  /**
   * Get patient vaccinated status
   *
   * @returns {PatientVaccinatedStatus|undefined} Patient vaccinated status
   */
  get patientVaccinated() {
    return getPatientVaccinatedStatus(this)
  }

  /**
   * At least one answer in consent health answers needs triage
   *
   * @returns {number} Number of answers needing triage
   */
  get answersNeedingTriageCount() {
    return countAnswersNeedingTriage(this.consentHealthAnswers)
  }

  /**
   * Get responses with triage notes for consent health answers
   *
   * @returns {Array<Reply>|undefined} Responses with triage notes
   */
  get responsesWithTriageNotes() {
    return this.responses?.filter((response) => response.triageNote)
  }

  /**
   * Get consent outcome
   *
   * @returns {ConsentOutcome} Consent outcome
   */
  get consent() {
    return getConsentOutcome(this)
  }

  /**
   * Get expanded description about consent outcome
   *
   * @returns {string} Consent description
   */
  get consentDescription() {
    return getConsentOutcomeDescription(this)
  }

  /**
   * Consent has been given
   *
   * @returns {boolean} Consent has been given
   */
  get consentGiven() {
    if (this.consent && !this.clinicAppointment) {
      return [
        ConsentOutcome.Given,
        ConsentOutcome.GivenForAlternativeInjection,
        ConsentOutcome.GivenForIntranasal
      ].includes(this.consent)
    } else if (this.clinicAppointment) {
      return true
    }

    return false
  }

  /**
   * Get consent health answers
   *
   * @returns {object|undefined} Consent health answers
   */
  get consentHealthAnswers() {
    return getConsentHealthAnswers(this)
  }

  /**
   * Get consent refusal reasons (from replies)
   *
   * @returns {object|boolean} Consent refusal reasons
   */
  get consentRefusalReasons() {
    return getConsentRefusalReasons(this)
  }

  /**
   * Were all consent refusal reasons down to not wanting vaccination in school?
   *
   * @returns {boolean} True if all refusals were on grounds of not wanting vaccination in school, or false otherwise
   */
  get isVaccinationWantedOutsideSchool() {
    const refusalReasons = this.consentRefusalReasons
    return (
      refusalReasons.length &&
      refusalReasons.every((reason) => reason === ReplyRefusal.OutsideSchool)
    )
  }

  /**
   * Get screening outcome
   *
   * @returns {ScreenOutcome|boolean} Screening outcome
   */
  get screen() {
    return getScreenOutcome(this)
  }

  /**
   * Get expanded description about screening outcome
   *
   * @returns {string} Screen description
   */
  get screenDescription() {
    return getScreenOutcomeDescription(this)
  }

  /**
   * Get expanded description about deferred status
   *
   * @returns {string|undefined} Deferred description
   */
  get deferredDescription() {
    return getPatientDeferredDescription(this)
  }

  /**
   * Get instruction outcome
   *
   * @returns {InstructionOutcome|boolean} Instruction outcome
   */
  get instruct() {
    return getInstructionOutcome(this)
  }

  /**
   * Get registration outcome
   *
   * @returns {RegistrationOutcome} Registration outcome
   */
  get register() {
    return getRegistrationOutcome(this)
  }

  /**
   * Get expanded description about registration outcome
   *
   * @returns {string} Registration description
   */
  get registerDescription() {
    return getRegistrationOutcomeDescription(this)
  }

  /**
   * Get ready to record outcome
   *
   * @returns {boolean} Ready to record outcome
   */
  get canRecordOutcome() {
    return canRecordOutcome(this)
  }

  /**
   * Get vaccination (session) outcome
   *
   * @returns {VaccinationOutcome|undefined} Vaccination (session) outcome
   */
  get outcome() {
    return getVaccinationOutcome(this)
  }

  /**
   * Get patient status
   *
   * @returns {PatientStatus|undefined} Patient status
   */
  get status() {
    return this.patientProgramme?.status
  }

  /**
   * Get expanded description about patient status
   *
   * @returns {string|undefined} Status description
   */
  get statusDescription() {
    return getPatientStatusDescription(this)
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
   * Get status properties per activity
   *
   * @returns {object} Status properties
   */
  get statusProperties() {
    // Use lazy evaluation so we call only those functions needed by the client
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          switch (prop) {
            case 'consent':
              return getConsentOutcomeProperties(this.consent)
            case 'screen':
              return getScreenOutcomeProperties(this.screen)
            case 'instruct':
              return getInstructionOutcomeProperties(this.instruct)
            case 'register':
              return getRegistrationOutcomeProperties(this.register)
            case 'outcome':
              return getVaccinationOutcomeProperties(this.outcome)
            case 'status':
              return this.patientProgramme?.status
            default:
              return undefined
          }
        }
      }
    )
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
            case 'consent':
              return this.consent && formatTag(this.statusProperties.consent)
            case 'programmeConsent':
              return (
                this.consent &&
                formatProgrammeStatus(
                  this.programme,
                  this.statusProperties.consent
                )
              )
            case 'screen':
              return this.screen && formatTag(this.statusProperties.screen)
            case 'instruct':
              return (
                this.session?.hasPsdProtocol &&
                formatTag(this.statusProperties.instruct)
              )
            case 'register':
              return formatTag(this.statusProperties.register)
            case 'outcome':
              return this.outcome && formatTag(this.statusProperties.outcome)
            case 'status':
              return this.patientProgramme?.formatted.programmeStatus
            case 'outstandingVaccinations': {
              const outstanding = this.outstandingVaccinations?.map(
                (vaccination) => vaccination.programme?.name
              )
              return filters.formatList(outstanding)
            }
            case 'vaccineCriteria':
              return formatVaccineCriteria(this.vaccineCriteria)
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
   * @param {RegistrationOutcome} register - Registration
   */
  registerAttendance(event, register) {
    this.session?.updateRegister(this.patient?.uuid, register)

    this.patient?.addEvent({
      name:
        register === RegistrationOutcome.Present
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
 * @import { InstructionOutcome, ScreenVaccineCriteria } from '../enums.js'
 * @import { Contact, PatientProgramme, Reply, Vaccination, Vaccine } from '../models.js'
 * @import { BaseModelOptions } from './base.js'
 */
