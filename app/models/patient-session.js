import { fakerEN_GB as faker } from '@faker-js/faker'
import filters from '@x-govuk/govuk-prototype-filters'

import activity from '../datasets/activity.js'
import {
  AcademicYear,
  AuditEventType,
  ConsentOutcome,
  ConsentWindow,
  PatientStatus,
  PatientConsentStatus,
  PatientDeferredStatus,
  PatientRefusedStatus,
  PatientVaccinatedStatus,
  RecordVaccineCriteria,
  ReplyDecision,
  RegistrationOutcome,
  ScreenOutcome,
  VaccinationOutcome,
  ProgrammeType,
  PatientClinicStatus,
  SessionType
} from '../enums.js'
import {
  AuditEvent,
  ClinicAppointment,
  ClinicBooking,
  Gillick,
  Instruction,
  Patient,
  Programme,
  Session
} from '../models.js'
import { getDateValueDifference, getYearGroup, today } from '../utils/date.js'
import {
  getInstructionOutcome,
  getRegistrationOutcome,
  getRecordOutcome,
  getSessionOutcome
} from '../utils/patient-session.js'
import {
  getConsentOutcome,
  getConsentHealthAnswers,
  getConsentRefusalReasons,
  countAnswersNeedingTriage
} from '../utils/reply.js'
import {
  getConsentOutcomeStatus,
  getInstructionOutcomeStatus,
  getRegistrationStatus,
  getScreenOutcomeStatus,
  getVaccinationOutcomeStatus
} from '../utils/status.js'
import {
  formatLink,
  formatTag,
  formatVaccineCriteria,
  formatYearGroup
} from '../utils/string.js'
import {
  getScreenOutcome,
  getScreenOutcomesForConsentMethod,
  getScreenVaccineCriteria
} from '../utils/triage.js'

/**
 * @class Patient Session
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {object} [context] - Global context
 * @property {string} uuid - UUID
 * @property {Date} [createdAt] - Created date
 * @property {string} [createdBy_uid] - User who created patient session
 * @property {Date} [updatedAt] - Updated date
 * @property {Gillick} [gillick] - Gillick assessment
 * @property {Array<AuditEvent>} [notes] - Notes
 * @property {boolean} alternative - Administer alternative vaccine
 * @property {string} patient_uuid - Patient UUID
 * @property {string} instruction_uuid - Instruction UUID
 * @property {string} programme_id - Programme ID
 * @property {string} session_id - Session ID
 */
export class PatientSession {
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdBy_uid = options?.createdBy_uid
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.gillick = options?.gillick && new Gillick(options.gillick)
    this.notes = options?.notes || []
    this.alternative = options?.alternative || false
    this.patient_uuid = options?.patient_uuid
    this.instruction_uuid = options?.instruction_uuid
    this.programme_id = options?.programme_id
    this.session_id = options?.session_id
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
      console.error('PatientSession.patient', error.message)
    }
  }

  /**
   * Get patient programme
   *
   * @returns {import('./patient-programme.js').PatientProgramme|undefined} Patient programme
   */
  get patientProgramme() {
    return this.patient?.programmes[this.programme_id]
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
   * Get instruction
   *
   * @returns {Instruction|undefined} Instruction
   */
  get instruction() {
    try {
      return Instruction.findOne(this.instruction_uuid, this.context)
    } catch (error) {
      console.error('PatientSession.instruction', error.message)
    }
  }

  /**
   * Get audit events for patient session
   *
   * @returns {Array<import('./audit-event.js').AuditEvent>} Audit events
   */
  get auditEvents() {
    return this.patient?.events
      .map((auditEvent) => new AuditEvent(auditEvent, this.context))
      .filter(({ programme_ids }) =>
        programme_ids?.some((id) => this.session?.programme_ids.includes(id))
      )
  }

  /**
   * Get audit events grouped by date
   *
   * @returns {object} Events grouped by date
   */
  get auditEventLog() {
    return this.auditEvents
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
      .reverse()
  }

  /**
   * Get triage notes
   *
   * @returns {Array<import('./audit-event.js').AuditEvent>} Audit events
   */
  get triageNotes() {
    return this.auditEvents
      .filter(({ programme_ids }) => programme_ids.includes(this.programme_id))
      .filter(({ outcome }) => outcome)
  }

  /**
   * Get pinned session notes
   *
   * @returns {Array<import('./audit-event.js').AuditEvent>} Audit event
   */
  get pinnedNotes() {
    return this.auditEvents
      .filter(({ programme_ids }) => programme_ids.includes(this.programme_id))
      .filter(({ pinned }) => pinned)
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
  }

  /**
   * Get replies for patient session
   *
   * @returns {Array<import('./reply.js').Reply>|undefined} Replies
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
        .filter((reply) => !reply.invalid)
        .flatMap((reply) => reply.relationship || 'Parent or guardian')
    }
  }

  /**
   * Get names of parents who have requested a follow up
   *
   * @returns {Array<string>|undefined} Parent names and relationships
   */
  get parentsRequestingFollowUp() {
    if (this.responses) {
      return this.responses
        .filter((reply) => !reply.invalid)
        .filter((reply) => reply.declined)
        .flatMap((reply) => reply.parent.fullNameAndRelationship)
    }
  }

  /**
   * Get responses (consent requests that were delivered)
   *
   * @returns {Array<import('./reply.js').Reply>|undefined} Responses
   */
  get responses() {
    return this.replies?.filter((reply) => reply.delivered)
  }

  /**
   * Has every parent given consent for an injected vaccine?
   *
   * Some parents may give consent for the nasal spray, but also given consent
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
   * Has every parent given consent only for an injected vaccine?
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
   * @returns {import('../enums.js').ScreenVaccineCriteria|boolean|undefined} Criteria
   */
  get screenVaccineCriteria() {
    if (this.programme && this.responses) {
      return getScreenVaccineCriteria(this.programme, this.responses)
    }
  }

  /**
   * Get programme
   *
   * @returns {Programme|undefined} Programme
   */
  get programme() {
    try {
      return Programme.findOne(this.programme_id, this.context)
    } catch (error) {
      console.error('PatientSession.programme', error.message)
    }
  }

  /**
   * Get session
   *
   * @returns {Session|undefined} Session
   */
  get session() {
    try {
      return Session.findOne(this.session_id, this.context)
    } catch (error) {
      console.error('PatientSession.session', error.message)
    }
  }

  /**
   * Get clinic readiness status
   *
   * @returns {PatientClinicStatus|undefined} clinic status for our programme
   */
  get clinicStatus() {
    return this.patientProgramme?.clinicStatus
  }

  /**
   * Get the clinic appointment associated with this patient session
   *
   * @returns {ClinicAppointment|undefined} - the appointment if found, or undefined otherwise
   */
  get clinicAppointment() {
    if (this.session.type !== SessionType.Clinic) {
      throw new Error(
        'Clinic appointments are only relevant to clinic sessions'
      )
    }

    return ClinicBooking.findAll(this.context)
      ?.flatMap(({ appointments }) => appointments)
      ?.filter(({ session_id }) => session_id === this.session_id)
      ?.find(({ patient_uuid }) => patient_uuid === this.patient_uuid)
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
   * @returns {import('./vaccine.js').Vaccine|undefined} Vaccine method
   */
  get vaccine() {
    const standardVaccine = this.programme?.vaccines.find((vaccine) => vaccine)
    const alternativeVaccine = this.programme?.alternativeVaccine

    // Need consent response(s) before we can determine the chosen method
    // We only want to instruct on patients being vaccinated using nasal spray
    if (!this.consentGiven) {
      return
    }

    // If no alternative, can only have been the standard vaccine
    if (!this.programme?.alternativeVaccine) {
      return standardVaccine
    }

    // Administered vaccine was the alternative
    if (this.alternative) {
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
   * @returns {import('../enums.js').RecordVaccineCriteria|undefined} Vaccination method
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
   * @returns {Array<import('./vaccination.js').Vaccination>|undefined} Vaccinations
   */
  get vaccinationOutcomes() {
    try {
      if (this.patient?.vaccinations && this.programme_id) {
        return this.patient.vaccinations.filter(
          ({ programme }) => programme?.id === this.programme_id
        )
      }
    } catch (error) {
      console.error('PatientSession.vaccinations', error.message)
    }
  }

  /**
   * Get last recorded vaccination
   *
   * @returns {import('./vaccination.js').Vaccination|undefined} Vaccination
   */
  get lastVaccinationOutcome() {
    if (this.vaccinationOutcomes && this.vaccinationOutcomes.length > 0) {
      return this.vaccinationOutcomes.at(-1)
    }
  }

  /**
   * Get next activity, per programme
   *
   * @returns {Array<PatientSession>|undefined} Patient sessions per programme
   */
  get outstandingVaccinations() {
    return this.siblingPatientSessions?.filter(
      ({ report }) => report === PatientStatus.Due
    )
  }

  /**
   * Get patient consent status
   *
   * @returns {PatientConsentStatus|undefined} Patient consent status
   */
  get patientConsent() {
    if (this.patient?.hasNoContactDetails) {
      return PatientConsentStatus.NoDetails
    }

    if (this.session?.consentWindow === ConsentWindow.None) {
      return PatientConsentStatus.NotScheduled
    } else if (this.session?.consentWindow === ConsentWindow.Opening) {
      return PatientConsentStatus.Scheduled
    }

    switch (this.consent) {
      case ConsentOutcome.NotDelivered:
        return PatientConsentStatus.NotDelivered
      case ConsentOutcome.NoResponse:
        return PatientConsentStatus.NoResponse
      case ConsentOutcome.Declined:
        return PatientRefusedStatus.FollowUp
      case ConsentOutcome.Refused:
        return PatientRefusedStatus.Refusal
    }
  }

  /**
   * Get patient deferred status
   *
   * @returns {PatientDeferredStatus|undefined} Patient deferred status
   */
  get patientDeferred() {
    if (this.screen === ScreenOutcome.DoNotVaccinate) {
      return PatientDeferredStatus.DoNotVaccinate
    } else if (this.screen === ScreenOutcome.DelayVaccination) {
      return PatientDeferredStatus.DelayVaccination
    } else if (this.screen === ScreenOutcome.InviteToClinic) {
      return PatientDeferredStatus.InviteToClinic
    }

    switch (this.outcome) {
      case VaccinationOutcome.Absent:
        return PatientDeferredStatus.ChildAbsent
      case VaccinationOutcome.Refused:
        return PatientDeferredStatus.ChildRefused
      case VaccinationOutcome.Unwell:
        return PatientDeferredStatus.ChildUnwell
      case VaccinationOutcome.InviteToClinic:
        return PatientDeferredStatus.InviteToClinic
      case VaccinationOutcome.DelayVaccination:
        return PatientDeferredStatus.DelayVaccination
      case VaccinationOutcome.DoNotVaccinate:
        return PatientDeferredStatus.DoNotVaccinate
    }
  }

  /**
   * Get patient refused status
   *
   * @returns {PatientRefusedStatus|undefined} Patient refused status
   */
  get patientRefused() {
    switch (this.consent) {
      case ConsentOutcome.Inconsistent:
        return PatientRefusedStatus.Conflict
      case ConsentOutcome.Declined:
        return PatientRefusedStatus.FollowUp
      case ConsentOutcome.Refused:
      case ConsentOutcome.FinalRefusal:
        return PatientRefusedStatus.Refusal
    }
  }

  /**
   * Get patient vaccinated status
   *
   * @returns {PatientVaccinatedStatus|undefined} Patient vaccinated status
   */
  get patientVaccinated() {
    switch (this.outcome) {
      case VaccinationOutcome.Vaccinated:
      case VaccinationOutcome.PartVaccinated:
        return PatientVaccinatedStatus.Vaccinated
      case VaccinationOutcome.AlreadyVaccinated:
        return PatientVaccinatedStatus.AlreadyVaccinated
    }
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
   * @returns {Array<import('./reply.js').Reply>|undefined} Responses with triage notes
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
   * @returns {string|undefined} Consent description
   */
  get consentDescription() {
    const relationships = filters.formatList(this.parentalRelationships)
    const parentNames = filters.formatList(this.parentsRequestingFollowUp)

    if (this.patient?.hasNoContactDetails) {
      return 'There are no contact details for this child.'
    }

    if (this.session?.consentWindow === ConsentWindow.Opening) {
      return this.session?.formatted.consentWindowSentence
    }

    switch (this.consent) {
      case ConsentOutcome.NoResponse:
        return 'No-one responded to our requests for consent.'
      case ConsentOutcome.NotDelivered:
        return 'Consent response could not be delivered.'
      case ConsentOutcome.Inconsistent:
        return 'You can only vaccinate if all respondents give consent.'
      case ConsentOutcome.Declined:
        return `${parentNames} would like to speak to a member of the team about other options for their child’s vaccination.`
      case ConsentOutcome.Given:
      case ConsentOutcome.GivenForAlternativeInjection:
      case ConsentOutcome.GivenForIntranasal:
        return `${relationships} gave consent.`
      case ConsentOutcome.Refused:
        return `${relationships} refused consent.`
      case ConsentOutcome.FinalRefusal:
        return `Refusal to give consent confirmed by ${relationships}.`
      default:
    }
  }

  /**
   * Consent has been given
   *
   * @returns {boolean} Consent has been given
   */
  get consentGiven() {
    return [
      ConsentOutcome.Given,
      ConsentOutcome.GivenForAlternativeInjection,
      ConsentOutcome.GivenForIntranasal
    ].includes(this.consent)
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
   * Get screening outcome
   *
   * @returns {ScreenOutcome|boolean} Screening outcome
   */
  get screen() {
    return getScreenOutcome(this)
  }

  /**
   * Get expanded description about consent outcome
   *
   * @returns {string|undefined} Screen description
   */
  get screenDescription() {
    const { patient, triageNotes } = this

    if (!patient) {
      return
    }

    const triageNote = triageNotes.at(-1)
    const user = triageNote?.createdBy || { fullName: 'Jane Joy' }

    switch (this.screen) {
      case ScreenOutcome.NeedsTriage:
        return `You need to decide if it’s safe to vaccinate ${patient.firstName}.`
      case ScreenOutcome.InviteToClinic:
        return `${user.fullName} decided that ${patient.firstName}’s vaccination should take place at a clinic.`
      case ScreenOutcome.DelayVaccination:
        return triageNote?.outcomeAt
          ? `${user.fullName} decided that ${patient.firstName}’s vaccination should be delayed until ${triageNote.formatted.outcomeAt}.`
          : `${user.fullName} decided that ${patient.firstName}’s vaccination should be delayed`
      case ScreenOutcome.DoNotVaccinate:
        return `${user.fullName} decided that ${patient.firstName} should not be vaccinated.`
      case ScreenOutcome.Vaccinate:
        return `${user.fullName} decided that ${patient.firstName} is safe to vaccinate.`
      case ScreenOutcome.VaccinateAlternativeFluInjectionOnly:
        return `${user.fullName} decided that ${patient.firstName} is safe to vaccinate using the injected vaccine only.`
      case ScreenOutcome.VaccinateAlternativeMMRInjectionOnly:
        return `${user.fullName} decided that ${patient.firstName} is safe to vaccinate using the gelatine-free injection only.`
      case ScreenOutcome.VaccinateIntranasalOnly:
        return `${user.fullName} decided that ${patient.firstName} is safe to vaccinate using the nasal spray only.`
      default:
        return `No triage is needed for ${patient.firstName}.`
    }
  }

  /**
   * Get expanded description about deferred status
   *
   * @returns {string|undefined} Deferred description
   */
  get deferredDescription() {
    switch (this.patientDeferred) {
      case PatientDeferredStatus.ChildAbsent:
      case PatientDeferredStatus.ChildRefused:
      case PatientDeferredStatus.ChildUnwell:
        return `${this.patientDeferred} on ${this.lastVaccinationOutcome?.formatted.createdAt}.`
      case PatientDeferredStatus.InviteToClinic:
      case PatientDeferredStatus.DelayVaccination:
      case PatientDeferredStatus.DoNotVaccinate:
        return this.screenDescription
      default:
        return this.patientDeferred
    }
  }

  /**
   * Get instruction outcome
   *
   * @returns {import('../enums.js').InstructionOutcome|boolean} Instruction outcome
   */
  get instruct() {
    return getInstructionOutcome(this)
  }

  /**
   * Get registration outcome
   *
   * @returns {import('../enums.js').RegistrationOutcome} Registration outcome
   */
  get register() {
    return getRegistrationOutcome(this)
  }

  /**
   * Get expanded description about registration outcome
   *
   * @returns {string|undefined} Registration description
   */
  get registerDescription() {
    switch (this.register) {
      case RegistrationOutcome.Present:
        return `${this.patient?.firstName} is attending this session.`
      case RegistrationOutcome.Absent:
        return `${this.patient?.firstName} is absent from this session.`
      case RegistrationOutcome.Pending:
        return `${this.patient?.firstName} has not been registered as attending yet.`
      case RegistrationOutcome.Complete:
        return `${this.patient?.firstName} has completed this session.`
    }
  }

  /**
   * Get ready to record outcome
   *
   * @returns {boolean|undefined} Ready to record outcome
   */
  get record() {
    return getRecordOutcome(this)
  }

  /**
   * Get vaccination (session) outcome
   *
   * @returns {import('../enums.js').VaccinationOutcome|undefined} Vaccination (session) outcome
   */
  get outcome() {
    return getSessionOutcome(this)
  }

  /**
   * Get patient status
   *
   * @returns {PatientStatus|undefined} Patient status
   */
  get report() {
    return this.patientProgramme?.status
  }

  /**
   * Get expanded description about patient status
   *
   * @returns {string|undefined} Report description
   */
  get reportDescription() {
    switch (this.report) {
      case PatientStatus.Vaccinated:
        return `${this.patient?.firstName} was vaccinated by ${this.lastVaccinationOutcome.createdBy.fullName} on ${this.lastVaccinationOutcome.formatted.createdAt}.`
      case PatientStatus.Due:
        return this.vaccineCriteria
          ? `${this.patient?.firstName} is ready to vaccinate (${this.vaccineCriteria.toLowerCase()}).`
          : `${this.patient?.firstName} is ready to vaccinate.`
      case PatientStatus.Deferred:
        return this.deferredDescription
      case PatientStatus.Triage:
        return this.screenDescription
      case PatientStatus.Refused:
      case PatientStatus.Consent:
        // Don’t show full consent description as it’s shown directly below
        return `${this.patientConsent}.`
    }
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
  get status() {
    return {
      consent: getConsentOutcomeStatus(this.consent),
      screen: getScreenOutcomeStatus(this.screen),
      instruct: getInstructionOutcomeStatus(this.instruct),
      register: getRegistrationStatus(this.register),
      outcome: getVaccinationOutcomeStatus(this.outcome),
      report: this.patientProgramme?.status
    }
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const outstandingVaccinations = this.outstandingVaccinations?.map(
      (vaccination) => vaccination.programme?.name
    )

    let formattedYearGroup = formatYearGroup(this.yearGroup)
    formattedYearGroup += this.patient?.registrationGroup
      ? `, ${this.patient?.registrationGroup}`
      : ''
    formattedYearGroup += ` (${AcademicYear[this.session.academicYear]} academic year)`

    return {
      programme: this.programme?.nameTag,
      consent: this.consent && formatTag(this.status.consent),
      screen: this.screen && formatTag(this.status.screen),
      instruct: this.session?.psdProtocol && formatTag(this.status.instruct),
      register: formatTag(this.status.register),
      outcome: this.outcome && formatTag(this.status.outcome),
      report: this.patientProgramme?.formatted.programmeStatus,
      outstandingVaccinations: filters.formatList(outstandingVaccinations),
      vaccineCriteria: formatVaccineCriteria(this.vaccineCriteria),
      yearGroup: formattedYearGroup
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'patientSession'
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
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<PatientSession>|undefined} Patient sessions
   * @static
   */
  static findAll(context) {
    return Object.values(context.patientSessions).map(
      (patientSession) => new PatientSession(patientSession, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} uuid - Patient UUID
   * @param {object} context - Context
   * @returns {PatientSession|undefined} Patient
   * @static
   */
  static findOne(uuid, context) {
    if (context?.patientSessions?.[uuid]) {
      return new PatientSession(context.patientSessions[uuid], context)
    }
  }

  /**
   * Create
   *
   * @param {object} patientSession - Patient session
   * @param {object} context - Context
   * @returns {PatientSession} Created patient session
   * @static
   */
  static create(patientSession, context) {
    const createdPatientSession = new PatientSession(patientSession)

    // Update context
    context.patientSessions = context.patientSessions || {}
    context.patientSessions[createdPatientSession.uuid] = createdPatientSession

    return createdPatientSession
  }

  /**
   * Update
   *
   * @param {string} uuid - Patient UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {PatientSession} Updated patient session
   * @static
   */
  static update(uuid, updates, context) {
    const updatedPatientSession = Object.assign(
      PatientSession.findOne(uuid, context),
      updates
    )
    updatedPatientSession.updatedAt = today()

    // Remove patient context
    delete updatedPatientSession.context

    // Delete original patient session (with previous UUID)
    delete context.patientSessions[uuid]

    // Update context
    context.patientSessions[updatedPatientSession.uuid] = updatedPatientSession

    return updatedPatientSession
  }

  /**
   * Remove patient from session
   *
   * @param {import('./audit-event.js').AuditEvent} event - Event
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
   * @param {Gillick} gillick - gillick
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
   * Record triage
   *
   * @param {import('./audit-event.js').AuditEvent} event - Event
   */
  recordTriage(event) {
    this.patient?.addEvent({
      name: activity.triage.decision(event),
      note: event.note,
      outcome: event.outcome,
      outcomeAt_: event.outcomeAt_,
      createdAt: event.createdAt,
      createdBy_uid: event.createdBy_uid,
      programme_ids: [this.programme_id]
    })

    let messageTemplate
    switch (event.outcome) {
      case ScreenOutcome.DelayVaccination:
        messageTemplate = 'triage-delay-vaccination'
        break
      case ScreenOutcome.DoNotVaccinate:
        messageTemplate = 'triage-do-not-vaccinate'
        break
      case ScreenOutcome.InviteToClinic:
        messageTemplate = 'triage-invite-to-clinic'
        break
      default:
        messageTemplate = 'triage-vaccinate'
    }

    if (this.patient?.parents) {
      for (const parent of this.patient.parents) {
        this.patient?.addEvent({
          name: activity.notify[messageTemplate](parent),
          messageRecipient: parent,
          messageTemplate,
          createdAt: event.createdAt,
          patient_uuid: this.uuid,
          programme_ids: [this.programme_id],
          session_id: this.session?.id
        })
      }
    }
  }

  /**
   * Give PSD instruction
   *
   * @param {Instruction} instruction - Instruction
   */
  giveInstruction(instruction) {
    this.instruction_uuid = instruction.uuid

    this.patient?.addEvent({
      name: activity.psd.added,
      createdAt: instruction.createdAt,
      createdBy_uid: instruction.createdBy_uid,
      programme_ids: [this.programme_id]
    })
  }

  /**
   * Register attendance
   *
   * @param {import('./audit-event.js').AuditEvent} event - Event
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
   * @param {import('./audit-event.js').AuditEvent} event - Event
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
   * @param {import('./audit-event.js').AuditEvent} event - Event
   */
  saveNote(event) {
    this.patient?.addEvent({
      name: activity.note.created(event.type),
      note: event.note,
      pinned: event.pinned,
      createdBy_uid: event.createdBy_uid,
      programme_ids: this.session?.programme_ids
    })
  }

  /**
   * Send reminder
   *
   * @param {import('./audit-event.js').AuditEvent} event - Event
   * @param {import('./parent.js').Parent} parent - Parent
   */
  sendReminder(event, parent) {
    this.patient?.addEvent({
      name: activity.notify['vaccination-reminder'](parent),
      messageRecipient: parent,
      messageTemplate: 'vaccination-reminder',
      type: AuditEventType.Reminder,
      createdBy_uid: event.createdBy_uid,
      patient_uuid: this.patient_uuid,
      programme_ids: this.session?.programme_ids,
      session_id: this.session?.id
    })
  }
}
