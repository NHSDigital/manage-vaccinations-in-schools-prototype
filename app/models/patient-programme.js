import { isAfter, isBefore } from 'date-fns'

import activity from '../datasets/activity.js'
import {
  AuditEventType,
  ConsentStatus,
  InstructionStatus,
  PatientClinicStatus,
  PatientConsentStatus,
  PatientDeferredStatus,
  PatientDueStatus,
  PatientIneligibleStatus,
  PatientRefusedStatus,
  PatientStatus,
  ProgrammeType,
  RecordVaccineCriteria,
  ReplyDecision,
  ScreenStatus,
  ScreenVaccineCriteria,
  SessionStatus,
  SessionType,
  VaccinationOutcome
} from '../enums.js'
import {
  AuditEvent,
  Instruction,
  Patient,
  Programme,
  Reply,
  Session,
  Vaccination
} from '../models.js'
import {
  formatDate,
  getCurrentAcademicYear,
  getDateValueDifference,
  isBetweenDates,
  today
} from '../utils/date.js'
import {
  getConsentStatusProperties,
  getPatientClinicStatusProperties,
  getPatientStatusProperties
} from '../utils/enum-properties.js'
import { ordinal } from '../utils/number.js'
import {
  getConsentStatus,
  getConsentStatusDescription,
  getInstructionStatus,
  getScreenStatus,
  getScreenStatusDescription,
  getPatientConsentStatus,
  getPatientDeferredStatus,
  getPatientDeferredDescription,
  getPatientTriageStatus,
  getPatientRefusedStatus,
  getPatientStatus,
  getPatientStatusDescription,
  getPatientVaccinatedStatus,
  getVaccinationOutcome
} from '../utils/patient-programme.js'
import {
  countAnswersNeedingTriage,
  getConsentHealthAnswers,
  getConsentRefusalReasons
} from '../utils/reply.js'
import {
  formatProgrammeStatus,
  formatTag,
  formatWithSecondaryText,
  formatVaccineCriteria
} from '../utils/string.js'
import {
  getScreenStatusesForConsentMethod,
  getScreenVaccineCriteria
} from '../utils/triage.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} PatientProgrammeOptions
 * @property {number} [academicYear] - Programme year
 * @property {boolean} [wasInvitedToClinic] - Invited to clinic
 */

/**
 * @class Patient Programme
 */
export class PatientProgramme extends BaseModel {
  static ns = 'patientProgramme'

  /**
   * @param {PatientProgrammeOptions} options - Options
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

    this.context = context
    this.academicYear = options?.academicYear || this.#currentAcademicYear
    this.wasInvitedToClinic = options?.wasInvitedToClinic
  }

  /**
   * Current academic year for today’s date
   *
   * @returns {number} Academic year a date sits within
   */
  get #currentAcademicYear() {
    return getCurrentAcademicYear()
  }

  /**
   * Get patient programme ID
   *
   * @returns {string} Patient programme ID
   */
  get id() {
    if (this.programme.isSeasonal) {
      return this.#currentAcademicYear === this.academicYear
        ? this.programme.id
        : `${this.programme.id}-${this.academicYear}`
    }

    return this.programme.id
  }

  /**
   * Get programme name
   *
   * @returns {string} Programme name
   */
  get name() {
    if (this.programme.type === ProgrammeType.MMR && this.patient?.age <= 6) {
      return 'MMRV'
    }

    if (this.programme.type === ProgrammeType.Flu) {
      return `Flu (${this.eligibilityStartAt.getFullYear()} to ${this.eligibilityEndAt.getFullYear()} season)`
    }

    return this.programme.name
  }

  /**
   * Is active programme
   *
   * @returns {boolean} Is active programme
   */
  get isActive() {
    return this.academicYear === this.#currentAcademicYear
  }

  /**
   * Get audit events for this patient programme
   *
   * @returns {Array<AuditEvent>} Audit events
   */
  get auditEvents() {
    return this.patient.events
      .map((auditEvent) => new AuditEvent(auditEvent, this.context))
      .filter(({ type }) => type === AuditEventType.ProgrammeNote)
      .filter(({ programme_ids }) =>
        programme_ids?.some((id) => this.programme_id === id)
      )
      .filter(({ createdAt }) =>
        isBetweenDates(
          createdAt,
          this.eligibilityStartAt,
          this.eligibilityEndAt
        )
      )
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
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
      .filter(({ status }) => status)
  }

  /**
   * Get patient sessions for this patient programme
   *
   * @returns {Array<PatientSession>} Patient sessions
   */
  get patientSessions() {
    return this.patient?.patientSessions
      .filter(
        ({ programme_id, session }) =>
          programme_id === this.programme_id &&
          session.academicYear === this.academicYear
      )
      .sort((a, b) => getDateValueDifference(a.session.date, b.session.date))
  }

  /**
   * Get most recent patient session
   *
   * @returns {PatientSession|undefined} Patient session
   */
  get lastPatientSession() {
    if (this.patientSessions?.length > 0) {
      return this.patientSessions.at(-1)
    }
  }

  /**
   * Eligible for vaccination
   *
   * @returns {boolean} Eligible for vaccination
   */
  get canInviteToSession() {
    return (
      this.status !== PatientStatus.Ineligible &&
      this.status !== PatientStatus.Vaccinated
    )
  }

  /**
   * Get the patient's clinic status for this programme
   *
   * @returns {PatientClinicStatus|false} - the patient's clinic status for this programme, or false if clinic not applicable
   */
  get clinicStatus() {
    // Work backwards from the most complete status

    // Booked into a clinic that hasn't happened / isn't happening yet?
    if (
      this.patientSessions.some(
        ({ session }) =>
          session.type === SessionType.Clinic &&
          ![SessionStatus.Completed, SessionStatus.Closed].includes(
            session.status
          )
      )
    ) {
      return PatientClinicStatus.Booked
    }

    // Invited to a clinic?
    if (this.wasInvitedToClinic) {
      return PatientClinicStatus.Invited
    }

    // Is the child at least eligible for vaccination at clinic?
    if (this.canOfferClinicCatchup) {
      return PatientClinicStatus.Ready
    }

    return false
  }

  /**
   * If a child's at clinic for other vaccinations, can we also offer this programme?
   *
   * @returns {boolean} - true if we can offer this vaccination, false otherwise
   */
  get canOfferClinicCatchup() {
    return this.canVaccinateAtClinic && !this.hasSchoolSessionPending
  }

  /**
   * Can the child be vaccinated (assuming we get the right consent and triage statuses, if required)?
   *
   * @returns {boolean} OK to invite to clinic for a vaccination based on patient status (`true`), or otherwise (`false`)
   */
  get canVaccinateAtClinic() {
    const { status } = this

    switch (status) {
      case PatientStatus.Ineligible:
        return false
      case PatientStatus.Consent:
      case PatientStatus.Triage:
      case PatientStatus.Due:
        return true
      case PatientStatus.Deferred: {
        switch (this.patientDeferred) {
          case PatientDeferredStatus.DoNotVaccinate:
            return false
          case PatientDeferredStatus.DelayVaccination: {
            const firstSafeDate = this.triageNotes?.at(-1)?.statusInvalidAt
            return firstSafeDate === undefined || today() > firstSafeDate
          }
          default:
            return true
        }
      }
      case PatientStatus.Refused: {
        // Parent refused but wanted a follow-up --> OK to invite
        if (this.patientRefused === PatientRefusedStatus.FollowUp) {
          return true
        }

        // Parent(s) refused on grounds of it being in school --> OK to invite
        if (this?.lastPatientSession?.isVaccinationWantedOutsideSchool) {
          return true
        }

        // Any other refusal reason is a hard no for clinic
        return false
      }
      default:
        return false
    }
  }

  /**
   * Does the patient still have a chance to get vaccinated at school this academic year?
   *
   * @returns {boolean} If there's still a chance for school vaccination (`true`), or otherwise (`false`)
   */
  get hasSchoolSessionPending() {
    const school = this.patient?.school
    if (school?.isHomeOrUnknown) {
      return false
    }

    const latestSchoolSession = school?.sessions
      ?.filter(({ programme_ids }) => programme_ids.includes(this.programme_id))
      ?.at(-1)
    return (
      ![
        SessionStatus.Completed,
        SessionStatus.Closed,
        SessionStatus.Cancelled
      ].includes(latestSchoolSession?.status) &&
      latestSchoolSession?.academicYear === this.#currentAcademicYear
    )
  }

  /**
   * Get clinics for this programme by session status
   *
   * @param {SessionStatus} status - Session status
   * @returns {Array<Session>} Clinics targeting this programme and status
   */
  #clinicsWithStatus(status) {
    return Session.findAll(this.context)
      ?.filter(({ programme_ids }) => programme_ids.includes(this.programme_id))
      ?.filter(({ type }) => type === SessionType.Clinic)
      ?.filter((session) => session.status === status)
  }

  /**
   * Get active clinics for this programme
   *
   * @returns {Array<Session>} Active clinics targeting this programme
   */
  get activeClinics() {
    return this.#clinicsWithStatus(SessionStatus.Active)
  }

  /**
   * Get number of active clinics for this programme
   *
   * @returns {number} Number of active clinics targeting this programme
   */
  get activeClinicsCount() {
    return this.activeClinics?.length || 0
  }

  /**
   * Get scheduled clinics for this programme
   *
   * @returns {Array<Session>} Scheduled clinics targeting this programme
   */
  get scheduledClinics() {
    return this.#clinicsWithStatus(SessionStatus.Planned)
  }

  /**
   * Get number of scheduled clinics for this programme
   *
   * @returns {number} Number of scheduled clinics targeting this programme
   */
  get scheduledClinicsCount() {
    return this.scheduledClinics?.length || 0
  }

  /**
   * Date patient becomes eligible for programme
   *
   * @returns {Date|undefined} Date patient becomes eligible for programme
   */
  get eligibilityStartAt() {
    if (!this.programme) {
      return
    }

    if (this.programme.isSeasonal) {
      return new Date(`${this.academicYear}-09-01`)
    }

    let yearsUntilEligible =
      this.programme.targetYearGroup - this.patient.yearGroup

    return new Date(`${this.#currentAcademicYear + yearsUntilEligible}-09-01`)
  }

  /**
   * Date patient left eligible for programme
   *
   * @returns {Date|undefined} Date patient left eligible for programme
   */
  get eligibilityEndAt() {
    if (!this.programme?.isSeasonal) {
      return
    }

    return new Date(`${this.academicYear + 1}-03-31`)
  }

  /**
   * Is not yet eligible for programme
   *
   * @returns {boolean} Is not yet eligible for programme
   */
  get isNotEligibleYet() {
    return isBefore(today(), this.eligibilityStartAt)
  }

  /**
   * Is no longer eligible for programme
   *
   * @returns {boolean} Is no longer eligible for programme
   */
  get isNoLongerEligible() {
    return isAfter(today(), this.eligibilityEndAt)
  }

  /**
   * Ineligible for programme
   *
   * @returns {boolean} Ineligible for programme
   */
  get isIneligible() {
    return (
      this.patient?.hasAgedOutOfProgrammes ||
      this.isNotEligibleYet ||
      this.isNoLongerEligible
    )
  }

  /**
   * Get expanded description about ineligibility status
   *
   * @returns {PatientIneligibleStatus} Ineligibility description
   */
  get ineligibilityStatus() {
    switch (true) {
      case this.patient?.hasAgedOutOfProgrammes:
        return PatientIneligibleStatus.AgedOut
      case this.isNoLongerEligible:
        return PatientIneligibleStatus.Expired
      default:
        return PatientIneligibleStatus.Pending
    }
  }

  /**
   * Get expanded description about ineligibility status
   *
   * @returns {string} Ineligibility description
   */
  get ineligibilityDescription() {
    switch (this.ineligibilityStatus) {
      case PatientIneligibleStatus.AgedOut:
        return 'Not eligible for school age immunisation'
      case PatientIneligibleStatus.Expired:
        return `Programme ended on ${this.formatted.eligibilityEndAt}`
      default:
        return `Eligible from ${this.formatted.eligibilityStartAt}`
    }
  }

  /**
   * Get PSD instruction
   *
   * @returns {Instruction|undefined} PSD instruction
   */
  get instruction() {
    return this.patient?.instructions.find(
      (instruction) => instruction.programme_id === this.programme_id
    )
  }

  /**
   * Get vaccination outcomes
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get vaccinationOutcomes() {
    return this.patient?.vaccinations.filter(
      ({ academicYear, programme_id }) =>
        programme_id === this.programme_id && academicYear === this.academicYear
    )
  }

  /**
   * Get last vaccination outcome
   *
   * @returns {Vaccination|undefined} Vaccination
   */
  get lastVaccinationOutcome() {
    if (this.vaccinationOutcomes?.length > 0) {
      return this.vaccinationOutcomes.at(-1)
    }
  }

  /**
   * Get vaccinations given
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get vaccinationsGiven() {
    return this.vaccinationOutcomes.filter(
      (vaccination) => vaccination.wasGiven
    )
  }

  /**
   * Get tetanus vaccinations given
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get tetanusVaccinationsGiven() {
    return this.patient?.vaccinations
      .filter((vaccination) => vaccination.programme?.isTetanusVaccine)
      .filter((vaccination) => vaccination.wasGiven)
  }

  /**
   * Get other (non-NHS) vaccinations given
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get otherVaccinationsGiven() {
    return this.patient?.vaccinations
      .filter((vaccination) => vaccination.programmeOther)
      .filter((vaccination) => vaccination.wasGiven)
  }

  /**
   * Get tetanus vaccinations
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get tetanusVaccinations() {
    if (this.programme.type === ProgrammeType.TdIPV) {
      return [
        ...this.tetanusVaccinationsGiven,
        ...this.otherVaccinationsGiven
      ].sort((a, b) => getDateValueDifference(a.createdAt, b.createdAt))
    }
  }

  /**
   * Get last vaccination outcome
   *
   * @returns {Vaccination|undefined} Vaccination
   */
  get lastVaccinationGiven() {
    if (this.vaccinationsGiven?.length > 0) {
      return this.vaccinationsGiven.at(-1)
    }
  }

  /**
   * Get doses needed
   *
   * @returns {number} Doses needed
   */
  get dosesNeeded() {
    if (
      this.patient.isImmunocompromised &&
      this.programme.immunocompromisedSequence
    ) {
      return this.programme.immunocompromisedSequence.length
    }

    return this.programme.sequence.length
  }

  /**
   * Get doses remaining
   *
   * @returns {number} Doses remaining
   */
  get dosesRemaining() {
    if (this.vaccinationsGiven?.length > 0) {
      return this.dosesNeeded - this.vaccinationsGiven?.length
    }

    return this.dosesNeeded
  }

  /**
   * Get dose due (ordinal)
   *
   * @returns {number} Dose due (ordinal)
   */
  get doseDue() {
    switch (true) {
      case this.dosesNeeded === 3 && this.dosesRemaining === 1:
        return 3
      case this.dosesNeeded === 3 && this.dosesRemaining === 2:
      case this.dosesNeeded === 2 && this.dosesRemaining === 1:
        return 2
      case this.dosesNeeded === 3 && this.dosesRemaining === 3:
      case this.dosesNeeded === 2 && this.dosesRemaining === 2:
        return 1
      case this.dosesNeeded === 1 && this.dosesRemaining === 1:
      default:
        return 0
    }
  }

  /**
   * Get vaccination due
   *
   * @returns {PatientDueStatus} Vaccination due
   */
  get vaccinationDue() {
    return [
      PatientDueStatus.Only,
      PatientDueStatus.First,
      PatientDueStatus.Second,
      PatientDueStatus.Third
    ][this.doseDue]
  }

  /**
   * Get dose sequence code
   *
   * @returns {string} Dose sequence code
   */
  get sequence() {
    if (
      this.patient.isImmunocompromised &&
      this.programme.immunocompromisedSequence
    ) {
      return this.programme.immunocompromisedSequence[this.doseDue - 1]
    }

    return this.programme.sequence[this.doseDue - 1]
  }

  /**
   * Get other seasons for this programme
   *
   * @returns {Array<PatientProgramme>|undefined} - Other seasons for this programme
   */
  get otherSeasons() {
    if (this.programme.isSeasonal) {
      return Object.values(this.patient.programmes).filter(
        ({ programme, id }) =>
          this.programme.id === programme.id && this.id !== id
      )
    }
  }

  /**
   * Get the active season for this programme
   *
   * @returns {PatientProgramme} - Active season for this programme
   */
  get activeSeason() {
    return Object.values(this.patient.programmes).find(
      ({ programme, isActive }) =>
        this.programme.id === programme.id && isActive
    )
  }

  /**
   * Get valid replies
   *
   * @returns {Array<Reply>|undefined} Valid replies
   */
  get validReplies() {
    return this.patient?.replies
      .filter(
        ({ isValid, patientProgramme }) =>
          patientProgramme.id === this.id && isValid
      )
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
  }

  /**
   * Get responses (consent requests that were delivered)
   *
   * @returns {Array<Reply>|undefined} Responses
   */
  get replies() {
    return this.validReplies?.filter((reply) => reply.isDelivered)
  }

  /**
   * Get responses with triage notes for consent health answers
   *
   * @returns {Array<Reply>|undefined} Responses with triage notes
   */
  get repliesWithTriageNotes() {
    return this.replies?.filter((response) => response.triageNote)
  }

  /**
   * Get consent health answers
   *
   * @returns {object|undefined} Consent health answers
   */
  get consentHealthAnswers() {
    return getConsentHealthAnswers(this.replies)
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
   * Get consent refusal reasons (from replies)
   *
   * @returns {object|boolean} Consent refusal reasons
   */
  get consentRefusalReasons() {
    return getConsentRefusalReasons(this.replies)
  }

  /**
   * Get parental relationships from valid replies
   *
   * @returns {Array<string>|undefined} Parental relationships
   */
  get parentalRelationships() {
    if (this.replies) {
      return this.replies
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
    if (this.replies) {
      return this.replies
        .filter((reply) => !reply.isInvalidated)
        .filter((reply) => reply.hasDeclinedConsent)
        .flatMap((reply) => reply.contact.fullNameAndRelationship)
    }
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
    return this.replies?.every(
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
    return this.replies?.every(
      ({ decision }) => decision === ReplyDecision.OnlyAlternativeInjection
    )
  }

  /**
   * Consent has been given
   *
   * @returns {boolean} Consent has been given
   */
  get consentGiven() {
    if (this.consent && !this.lastPatientSession?.clinicAppointment) {
      return [
        ConsentStatus.Given,
        ConsentStatus.GivenForAlternativeInjection,
        ConsentStatus.GivenForIntranasal
      ].includes(this.consent)
    } else if (this.lastPatientSession?.clinicAppointment) {
      return true
    }

    return false
  }

  /**
   * Get screen statuses for vaccination method(s) consented to
   *
   * @returns {Array<ScreenStatus>} Screen statuses
   */
  get screenStatusesForConsentMethod() {
    return getScreenStatusesForConsentMethod(this.programme, this.replies)
  }

  /**
   * Get vaccination criteria consented to use if safe to vaccinate
   *
   * @returns {ScreenVaccineCriteria|boolean} Criteria
   */
  get screenVaccineCriteria() {
    return getScreenVaccineCriteria(this.programme, this.replies)
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
    // We only want to instruct patients being vaccinated using nasal spray
    if (!this.consentGiven) {
      return
    }

    // If no alternative, can only have been the standard vaccine
    if (!this.programme?.alternativeVaccine) {
      return standardVaccine
    }

    // Administered vaccine was the alternative
    if (
      this.lastPatientSession?.clinicAppointment
        ?.hasConsentForAlternativeVaccine ||
      this.lastPatientSession?.hasAlternativeVaccine
    ) {
      return alternativeVaccine
    }

    // Return vaccine based on consent (and triage) outcomes
    const hasScreenedForInjection =
      this.screen &&
      [
        ScreenStatus.VaccinateAlternativeFluInjectionOnly,
        ScreenStatus.VaccinateAlternativeMMRInjectionOnly
      ].includes(String(this.screen))

    return this.hasConsentForAlternativeInjectionOnly || hasScreenedForInjection
      ? alternativeVaccine // Injection
      : standardVaccine // Nasal
  }

  /**
   * Get vaccine to administer (or was administered) for this programme
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
        this.consent === ConsentStatus.GivenForIntranasal ||
        this.screen === ScreenStatus.VaccinateIntranasalOnly
      ) {
        return RecordVaccineCriteria.IntranasalOnly
      }

      if (
        this.consent === ConsentStatus.GivenForAlternativeInjection ||
        this.screen === ScreenStatus.VaccinateAlternativeFluInjectionOnly
      ) {
        return RecordVaccineCriteria.AlternativeFluInjectionOnly
      }

      return RecordVaccineCriteria.IntranasalPreferred
    }

    if (this.programme.type === ProgrammeType.MMR) {
      if (
        this.consent === ConsentStatus.GivenForAlternativeInjection ||
        this.screen === ScreenStatus.VaccinateAlternativeMMRInjectionOnly
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
      this.screen === ScreenStatus.VaccinateIntranasalOnly

    return (
      this.hasConsentForInjection &&
      !this.hasConsentForAlternativeInjectionOnly &&
      !hasScreenedForNasal
    )
  }

  /**
   * Get consent status
   *
   * @returns {ConsentStatus|PatientStatus} Consent status
   */
  get consent() {
    return getConsentStatus(this)
  }

  /**
   * Get expanded description about consent status
   *
   * @returns {string} Consent description
   */
  get consentDescription() {
    return getConsentStatusDescription(this)
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
   * Get screening status
   *
   * @returns {ScreenStatus|boolean} Screening status
   */
  get screen() {
    return getScreenStatus(this)
  }

  /**
   * Get expanded description about screening status
   *
   * @returns {string} Screen description
   */
  get screenDescription() {
    return getScreenStatusDescription(this)
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
   * Get expanded description about deferred status
   *
   * @returns {string|undefined} Deferred description
   */
  get deferredDescription() {
    return getPatientDeferredDescription(this)
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
   * Get instruction status
   *
   * @returns {InstructionStatus|undefined} Instruction status
   */
  get instructionStatus() {
    return getInstructionStatus(this)
  }

  /**
   * Patient has PSD instruction
   *
   * @returns {boolean} Patient has PSD instruction
   */
  get hasInstruction() {
    return this.instructionStatus === InstructionStatus.Given
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
   * Get patient vaccinated status
   *
   * @returns {PatientVaccinatedStatus|undefined} Patient vaccinated status
   */
  get patientVaccinated() {
    return getPatientVaccinatedStatus(this)
  }

  /**
   * Is vaccinated
   *
   * @returns {boolean} Is vaccinated
   */
  get isVaccinated() {
    return this.status === PatientStatus.Vaccinated
  }

  /**
   * Get status
   *
   * @returns {PatientStatus} Status
   */
  get status() {
    return getPatientStatus(this)
  }

  /**
   * Get status colour name
   *
   * @returns {string} Colour name
   */
  get statusColour() {
    return getPatientStatusProperties(this.status, this.vaccinationDue).colour
  }

  /**
   * Get expanded description about patient status
   *
   * @returns {string|undefined} Report description
   */
  get statusDescription() {
    return getPatientStatusDescription(this)
  }

  /**
   * Get explanatory notes
   *
   * @returns {string} Explanatory notes
   */
  get statusNotes() {
    switch (this.status) {
      case PatientStatus.Ineligible:
        return this.ineligibilityDescription
      case PatientStatus.Vaccinated:
        return `Vaccinated on ${this.lastVaccinationGiven.formatted.administeredAt_date}`
      case PatientStatus.Triage:
        return this.patientTriage
      case PatientStatus.Due:
        return this.vaccineCriteria
      case PatientStatus.Deferred:
        return this.lastVaccinationOutcome
          ? `${this.patientDeferred} on ${this.lastVaccinationOutcome.formatted.administeredAt_date}`
          : this.patientDeferred
      case PatientStatus.Refused: {
        if (
          this.patientRefused === PatientRefusedStatus.Refusal &&
          this.lastPatientSession?.isVaccinationWantedOutsideSchool
        ) {
          return 'Do not vaccinate in school'
        }

        return this.patientRefused
      }
      case PatientStatus.Consent:
        return this.lastPatientSession
          ? this.patientConsent
          : PatientConsentStatus.NotScheduled
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
          const getStatusTag = () =>
            formatTag(
              getPatientStatusProperties(this.status, this.vaccinationDue)
            )

          switch (prop) {
            case 'doseDue':
              return ordinal(this.doseDue)
            case 'eligibilityStartAt':
              return formatDate(this.eligibilityStartAt, { dateStyle: 'long' })
            case 'eligibilityEndAt':
              return formatDate(this.eligibilityEndAt, { dateStyle: 'long' })
            case 'vaccineCriteria':
              return formatVaccineCriteria(this.vaccineCriteria)
            case 'status':
              return getStatusTag()
            case 'statusWithNotes':
              return formatWithSecondaryText(
                getStatusTag(),
                this.statusNotes,
                false
              )
            case 'consentStatus':
              return this.consent
                ? formatProgrammeStatus(
                    this.programme,
                    getConsentStatusProperties(this.consent)
                  )
                : formatProgrammeStatus(
                    this.programme,
                    getPatientStatusProperties(this.status)
                  )
            case 'programmeStatus':
              return formatProgrammeStatus(
                this.programme,
                getPatientStatusProperties(this.status, this.vaccinationDue),
                this.statusNotes
              )
            case 'clinicStatus':
              return (
                this.clinicStatus &&
                formatProgrammeStatus(
                  this.programme,
                  getPatientClinicStatusProperties(this.clinicStatus)
                )
              )
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
    return `/patients/${this.patient_uuid}/programmes/${this.id}`
  }

  /**
   * Give PSD instruction
   *
   * @param {Partial<Instruction>} instruction - Instruction
   */
  giveInstruction(instruction) {
    this.patient?.addInstruction(instruction)

    this.patient?.addEvent({
      name: activity.psd.added,
      createdAt: instruction.createdAt,
      createdBy_uid: instruction.createdBy_uid,
      programme_ids: [this.programme_id]
    })
  }

  /**
   * Record triage
   *
   * @param {Partial<AuditEvent>} event - Event
   */
  recordTriage(event) {
    this.patient?.addEvent({
      name: activity.triage.decision(event),
      note: event.note,
      type: AuditEventType.ProgrammeNote,
      status: event.status,
      statusInvalidAt_: event.statusInvalidAt_,
      createdAt: event.createdAt,
      createdBy_uid: event.createdBy_uid,
      programme_ids: [this.programme_id]
    })

    let messageTemplate
    switch (event.status) {
      case ScreenStatus.DelayVaccination:
        messageTemplate = 'triage-delay-vaccination'
        break
      case ScreenStatus.DoNotVaccinate:
        messageTemplate = 'triage-do-not-vaccinate'
        break
      case ScreenStatus.InvitedToClinic:
        messageTemplate = 'triage-invite-to-clinic'
        break
      default:
        messageTemplate = 'triage-vaccinate'
    }

    if (this.patient?.contacts) {
      for (const contact of this.patient.contacts) {
        this.patient?.addEvent({
          name: activity.notify[messageTemplate](contact),
          messageRecipient: contact,
          messageTemplate,
          createdAt: event.createdAt,
          patient_uuid: this.patient.uuid,
          programme_ids: [this.programme_id]
        })
      }
    }
  }
}

PatientProgramme.relate('patient_uuid', () => Patient, 'patient')
PatientProgramme.relate('programme_id', () => Programme, 'programme')

/**
 * @import { PatientTriageStatus, PatientVaccinatedStatus } from '../enums.js'
 * @import { PatientSession, Vaccine } from '../models.js'
 * @import { BaseModelOptions } from './base.js'
 */
