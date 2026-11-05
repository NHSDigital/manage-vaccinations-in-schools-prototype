import { addYears, isAfter, isBefore, max } from 'date-fns'

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
  ClinicAppointment,
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
  getPatientClinicStatusProperties,
  getPatientStatusProperties
} from '../utils/enum-properties.js'
import { ordinal } from '../utils/number.js'
import {
  getConsentStatus,
  getConsentStatusDescription,
  getHealthAnswersDescription,
  getInstructionStatus,
  getLatestReplyFromEachRespondent,
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
    return [...this.patient.events, ...this.#consentExpiryEvents]
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
   * Get events for consent that has expired, including consent superseded by
   * a newer response from the same respondent, as superseded responses are
   * still listed until they expire
   *
   * Worked out from responses, rather than stored, as expiry happens with the
   * passing of time, not when someone does something
   *
   * @returns {Array<Partial<AuditEvent>>} Audit events
   */
  get #consentExpiryEvents() {
    return (this.#allDeliveredReplies ?? [])
      .filter(
        (reply) =>
          reply.hasGivenConsent && reply.hasExpired && !reply.isInvalidated
      )
      .map((reply) => ({
        name: activity.consent.expired(reply),
        type: AuditEventType.ProgrammeNote,
        createdAt: reply.expiresAt,
        programme_ids: [this.programme_id]
      }))
  }

  /**
   * Get messages sent for this patient programme using a given template
   *
   * @param {string} messageTemplate - Message template
   * @returns {Array<AuditEvent>} Messages sent, oldest first
   */
  #messagesSent(messageTemplate) {
    return this.patient.events
      .map((event) => new AuditEvent(event, this.context))
      .filter(
        (auditEvent) =>
          auditEvent.messageTemplate === messageTemplate &&
          auditEvent.programme_ids?.includes(this.programme_id) &&
          auditEvent.session?.academicYear === this.academicYear
      )
      .sort((a, b) => getDateValueDifference(a.createdAt, b.createdAt))
  }

  /**
   * Get consent requests sent for this patient programme
   *
   * @returns {Array<AuditEvent>} Consent requests, oldest first
   */
  get consentRequests() {
    return this.#messagesSent('invite')
  }

  /**
   * Get consent reminders sent for this patient programme, both automatic and
   * manual (manual reminders have `createdBy_uid` set)
   *
   * @returns {Array<AuditEvent>} Consent reminders, oldest first
   */
  get consentReminders() {
    return this.#messagesSent('invite-reminder')
  }

  /**
   * Get summary details of the consent reminders sent out for this programme
   *
   * @returns {{count: number, lastSentAt: Date|undefined}} Number of consent
   *   reminders sent, and date last reminder sent
   */
  get consentRemindersSummary() {
    const { consentReminders } = this
    const sentAtTimes = consentReminders.map(({ createdAt }) =>
      createdAt.valueOf()
    )

    return {
      count: new Set(sentAtTimes).size,
      lastSentAt: consentReminders.at(-1)?.createdAt
    }
  }

  /**
   * Get every triage note for this programme, including expired ones, oldest
   * first
   *
   * Not all of these are still current, so use `triageNotes` for that instead
   *
   * @returns {Array<AuditEvent>} Audit events
   */
  get #allTriageNotes() {
    return this.auditEvents
      .filter(({ type }) => type === AuditEventType.ProgrammeNote)
      .filter(({ programme_ids }) => programme_ids.includes(this.programme_id))
      .filter(({ status }) => status)
      .sort((a, b) => getDateValueDifference(a.createdAt, b.createdAt))
  }

  /**
   * Get triage notes that are still current, oldest first
   *
   * @returns {Array<AuditEvent>} Audit events
   */
  get triageNotes() {
    return this.#allTriageNotes.filter(
      (triageNote) => !this.#isPreviousTriage(triageNote)
    )
  }

  /**
   * Get previous triage notes that no longer count, because the health
   * answers they reviewed have expired, or a newer response invalidated them,
   * oldest first
   *
   * @returns {Array<AuditEvent>} Audit events
   */
  get previousTriageNotes() {
    return this.#allTriageNotes.filter((triageNote) =>
      this.#isPreviousTriage(triageNote)
    )
  }

  /**
   * Does a triage no longer count?
   *
   * @param {AuditEvent} triageNote - Triage note
   * @returns {boolean} Triage has expired or been invalidated
   */
  #isPreviousTriage(triageNote) {
    return (
      this.hasTriageExpired(triageNote) ||
      this.hasTriageBeenInvalidated(triageNote)
    )
  }

  /**
   * Get responses whose health answers were reviewed in a triage, i.e. those
   * giving consent before the triage was recorded, and not since invalidated
   *
   * @param {AuditEvent} triageNote - Triage note
   * @returns {Array<Reply>} Responses
   */
  #getRepliesReviewedInTriage(triageNote) {
    const triagedAt = new Date(triageNote.createdAt)

    return (this.#allDeliveredReplies ?? []).filter(
      (reply) =>
        reply.hasGivenConsent &&
        !reply.isInvalidated &&
        !isAfter(new Date(reply.createdAt), triagedAt)
    )
  }

  /**
   * Get the date a triage expires, which is when the last of the health
   * answers it reviewed expires
   *
   * A response without health answers, like a clinic booking that skipped
   * questions already answered, doesn’t keep a triage outcome alive, because
   * the triage wasn’t based on anything in it. But if _none_ of the responses
   * reviewed had health answers (for example, if the child was triaged in
   * person), the triage lasts until the last of those responses expires
   *
   * @param {AuditEvent} triageNote - Triage note
   * @returns {Date|undefined} Expiry date, or undefined if it never expires
   */
  getTriageExpiresAt(triageNote) {
    const reviewedReplies = this.#getRepliesReviewedInTriage(triageNote)

    // Without any responses to base it on, we can’t tell when it expires
    if (reviewedReplies.length === 0) {
      return
    }

    const reviewedRepliesWithHealthAnswers = reviewedReplies.filter(
      (reply) => Object.keys(reply.healthAnswers ?? {}).length > 0
    )
    const repliesTriageIsBasedOn =
      reviewedRepliesWithHealthAnswers.length > 0
        ? reviewedRepliesWithHealthAnswers
        : reviewedReplies

    // If any response it’s based on never expires, neither does the triage
    const expiryDates = repliesTriageIsBasedOn.map((reply) => reply.expiresAt)
    if (expiryDates.some((expiryDate) => !expiryDate)) {
      return
    }

    return max(expiryDates)
  }

  /**
   * Has a triage expired?
   *
   * @param {AuditEvent} triageNote - Triage note
   * @returns {boolean} Triage has expired
   */
  hasTriageExpired(triageNote) {
    const expiryDate = this.getTriageExpiresAt(triageNote)
    return expiryDate ? isAfter(today(), expiryDate) : false
  }

  /**
   * Get the first response that invalidated a triage
   *
   * A triage deciding it was safe to vaccinate is invalidated by a later
   * response giving consent, if that response’s health answers need triage,
   * or it doesn’t include the vaccine method the triage approved
   *
   * @param {AuditEvent} triageNote - Triage note
   * @returns {Reply|undefined} Response that invalidated the triage
   */
  getReplyInvalidatingTriage(triageNote) {
    const safeToVaccinateStatuses = [
      ScreenStatus.Vaccinate,
      ScreenStatus.VaccinateAlternativeFluInjectionOnly,
      ScreenStatus.VaccinateAlternativeMMRInjectionOnly,
      ScreenStatus.VaccinateIntranasalOnly
    ]
    if (!safeToVaccinateStatuses.includes(triageNote.status)) {
      return
    }

    const triagedAt = new Date(triageNote.createdAt)
    const repliesGivenSinceTriage = (this.replies ?? [])
      .filter(
        (reply) =>
          reply.hasGivenConsent && isAfter(new Date(reply.createdAt), triagedAt)
      )
      .sort((a, b) => getDateValueDifference(a.createdAt, b.createdAt))

    return repliesGivenSinceTriage.find(
      (reply) =>
        countAnswersNeedingTriage(reply.healthAnswers) > 0 ||
        !this.#doesReplyIncludeTriagedMethod(reply, triageNote.status)
    )
  }

  /**
   * Has a triage been invalidated by a newer response?
   *
   * @param {AuditEvent} triageNote - Triage note
   * @returns {boolean} Triage has been invalidated
   */
  hasTriageBeenInvalidated(triageNote) {
    return Boolean(this.getReplyInvalidatingTriage(triageNote))
  }

  /**
   * Does a response giving consent include the vaccine method a triage
   * approved?
   *
   * @param {Reply} reply - Response giving consent
   * @param {ScreenStatus} triageStatus - Triage status
   * @returns {boolean} Response includes the approved vaccine method
   */
  #doesReplyIncludeTriagedMethod(reply, triageStatus) {
    switch (triageStatus) {
      case ScreenStatus.VaccinateAlternativeFluInjectionOnly:
      case ScreenStatus.VaccinateAlternativeMMRInjectionOnly:
        // Approved the injection (or gelatine-free injection)
        return reply.hasConsentForInjection
      case ScreenStatus.Vaccinate:
      case ScreenStatus.VaccinateIntranasalOnly:
      default:
        // Approved the standard vaccine (nasal spray, for flu)
        return reply.decision !== ReplyDecision.OnlyAlternativeInjection
    }
  }

  /**
   * Get description of when a triage was invalidated, or when it expires (or
   * expired)
   *
   * @param {AuditEvent} triageNote - Triage note
   * @returns {string|undefined} Validity description
   */
  getTriageValidityDescription(triageNote) {
    const invalidatingReply = this.getReplyInvalidatingTriage(triageNote)
    if (invalidatingReply) {
      const formattedInvalidatedDate = formatDate(
        new Date(invalidatingReply.createdAt),
        { dateStyle: 'long' }
      )

      return `Invalidated ${formattedInvalidatedDate} by a new response`
    }

    const expiryDate = this.getTriageExpiresAt(triageNote)
    if (!expiryDate) {
      return
    }

    const formattedExpiryDate = formatDate(expiryDate, { dateStyle: 'long' })

    return this.hasTriageExpired(triageNote)
      ? `Expired ${formattedExpiryDate}`
      : `Expires ${formattedExpiryDate}`
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
      return this.programme.getSeasonStartAt(this.academicYear)
    }

    let yearsUntilEligible =
      this.programme.targetYearGroup - this.patient.yearGroup

    return new Date(`${this.#currentAcademicYear + yearsUntilEligible}-09-01`)
  }

  /**
   * Date patient no longer eligible for programme
   *
   * @returns {Date} Date patient no longer eligible for programme
   */
  get eligibilityEndAt() {
    if (this.programme?.isSeasonal) {
      return this.programme.getSeasonEndAt(this.academicYear)
    }

    return addYears(this.patient.dob, this.programme.eligibilityEndAge)
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
    const vaccinationOutcomes = this.patient?.vaccinations.filter(
      ({ programme_id }) => programme_id === this.programme_id
    )

    if (this.programme.isSeasonal) {
      vaccinationOutcomes.filter(
        ({ academicYear }) => academicYear === this.academicYear
      )
    }

    return vaccinationOutcomes
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
   * Get all clinic appointments for this patient, for this programme
   *
   * @returns {Array<ClinicAppointment>} the clinic appointments this patient has/had for this programme
   */
  get appointments() {
    const appointments = ClinicAppointment.findAll(this.context).filter(
      (appointment) =>
        appointment.patient_uuid === this.patient_uuid &&
        appointment.selected_programme_ids.includes(this.programme_id)
    )

    return appointments
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
          patientProgramme?.id === this.id && isValid
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
   * Get every delivered response for this programme, including expired and
   * invalid ones, newest first
   *
   * Not all of these count towards consent, so use `replies` for that instead
   *
   * @returns {Array<Reply>|undefined} Delivered responses
   */
  get #allDeliveredReplies() {
    return this.patient?.replies
      .filter(
        (reply) => reply.patientProgramme.id === this.id && reply.isDelivered
      )
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
  }

  /**
   * Get previous responses that no longer count towards consent, because they
   * were invalidated or have expired, newest first
   *
   * @returns {Array<Reply>} Previous responses
   */
  get previousReplies() {
    return (this.#allDeliveredReplies ?? []).filter(
      (reply) => reply.isInvalidated || reply.hasExpired
    )
  }

  /**
   * Get expired responses (not invalidated), with only the latest from each
   * respondent, earliest expiry first
   *
   * @returns {Array<Reply>} Expired responses
   */
  get expiredReplies() {
    const expiredReplies = (this.#allDeliveredReplies ?? []).filter(
      (reply) => reply.hasExpired && !reply.isInvalidated
    )

    return getLatestReplyFromEachRespondent(expiredReplies).sort((a, b) =>
      getDateValueDifference(a.expiresAt, b.expiresAt)
    )
  }

  /**
   * Get responses that count towards consent status: only the latest from
   * each respondent, and ignoring any that say nothing about consent, so they
   * can’t conflict with a response that does
   *
   * @returns {Array<Reply>} Responses, newest first
   */
  get repliesCountingTowardsConsent() {
    const repliesWithDecision = (this.replies ?? []).filter(
      ({ decision }) => decision !== ReplyDecision.NoResponse
    )

    return getLatestReplyFromEachRespondent(repliesWithDecision)
  }

  /**
   * Get consent health answers
   *
   * @returns {object|undefined} Consent health answers
   */
  get consentHealthAnswers() {
    return getConsentHealthAnswers(this.repliesWithHealthAnswersThatCount)
  }

  /**
   * Get description of who gave answers to health questions, and when,
   * noting any answers that expire before the given session
   *
   * @param {Session} [session] - Session the answers are being looked at for
   * @returns {string|undefined} Health answers description
   */
  getHealthAnswersDescriptionForSession(session) {
    return getHealthAnswersDescription(
      this.repliesWithHealthAnswersThatCount,
      session
    )
  }

  /**
   * Get responses whose answers to the health questions count
   *
   * These are the responses that count towards consent, plus the answers in
   * any response replaced by a clinic booking from the same person, to the
   * questions the booking didn’t ask. When booking, a parent isn’t asked
   * questions they’ve already answered, so those earlier answers still count
   * (until that earlier response expires or is invalidated)
   *
   * @returns {Array<Reply>} Responses, newest first
   */
  get repliesWithHealthAnswersThatCount() {
    const replies = [...this.repliesCountingTowardsConsent]

    const bookingRepliesFromKnownContacts = replies.filter(
      (reply) => reply.clinicAppointment_uuid && reply.contact_uuid
    )
    for (const bookingReply of bookingRepliesFromKnownContacts) {
      const replacedReply = this.#getReplyReplacedByBooking(bookingReply)
      if (!replacedReply?.healthAnswers) {
        continue
      }

      const questionsInBooking =
        bookingReply.clinicAppointment?.getHealthQuestionsForProgramme(
          this.programme
        ) ?? {}
      const answersFromBooking = bookingReply.healthAnswers ?? {}
      const answersToQuestionsNotAskedInBooking = Object.entries(
        replacedReply.healthAnswers
      ).filter(
        ([question]) =>
          question in questionsInBooking && !(question in answersFromBooking)
      )
      if (answersToQuestionsNotAskedInBooking.length === 0) {
        continue
      }

      // Keep only those answers, so we don’t show any the booking replaced
      replies.push(
        new Reply(
          {
            ...replacedReply,
            healthAnswers: Object.fromEntries(
              answersToQuestionsNotAskedInBooking
            )
          },
          this.context
        )
      )
    }

    return replies.sort((a, b) =>
      getDateValueDifference(b.createdAt, a.createdAt)
    )
  }

  /**
   * Get the latest response that a clinic booking replaced, given before the
   * booking by the same person
   *
   * @param {Reply} bookingReply - Response given by booking a clinic appointment
   * @returns {Reply|undefined} Replaced response
   */
  #getReplyReplacedByBooking(bookingReply) {
    // Responses are newest first, so the first earlier one is the latest
    return (this.replies ?? []).find(
      (reply) =>
        reply !== bookingReply &&
        reply.respondent === bookingReply.respondent &&
        reply.decision !== ReplyDecision.NoResponse &&
        new Date(reply.createdAt) < new Date(bookingReply.createdAt)
    )
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
    return getConsentRefusalReasons(this.repliesCountingTowardsConsent)
  }

  /**
   * Get names of contacts who have requested a follow up
   *
   * @returns {Array<string>|undefined} Contact names and relationships
   */
  get contactsRequestingFollowUp() {
    if (this.replies) {
      return this.repliesCountingTowardsConsent
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
    return this.repliesCountingTowardsConsent.every(
      ({ hasConsentForInjection }) => hasConsentForInjection
    )
  }

  /**
   * Has any contact given consent only for an injected vaccine?
   *
   * If so, only the injected vaccine can be given, even if other contacts
   * prefer the nasal spray. We need this so that we don’t offer multiple
   * triage outcomes if consent has only been given for the injected vaccine
   *
   * @returns {boolean|undefined} Consent given for an injected vaccine
   */
  get hasConsentForAlternativeInjectionOnly() {
    return this.repliesCountingTowardsConsent.some(
      ({ decision }) => decision === ReplyDecision.OnlyAlternativeInjection
    )
  }

  /**
   * Consent has been given
   *
   * @returns {boolean} Consent has been given
   */
  get consentGiven() {
    return [
      ConsentStatus.Given,
      ConsentStatus.GivenForAlternativeInjection,
      ConsentStatus.GivenForIntranasal
    ].includes(this.consent)
  }

  /**
   * Get date of last consent given response
   *
   * @returns {Date|undefined} Date of last consent given response
   */
  get consentGivenDate() {
    // Replies are sorted newest first, so take the first reply giving consent
    const reply = this.repliesCountingTowardsConsent.find(({ decision }) =>
      [
        ReplyDecision.Given,
        ReplyDecision.OnlyAlternativeInjection,
        ReplyDecision.OnlyMenACWY,
        ReplyDecision.OnlyTdIPV
      ].includes(decision)
    )

    return reply && new Date(reply.createdAt)
  }

  /**
   * Get screen statuses for vaccination method(s) consented to
   *
   * @returns {Array<ScreenStatus>} Screen statuses
   */
  get screenStatusesForConsentMethod() {
    return getScreenStatusesForConsentMethod(
      this.programme,
      this.repliesCountingTowardsConsent
    )
  }

  /**
   * Get vaccination criteria consented to use if safe to vaccinate
   *
   * @returns {ScreenVaccineCriteria|boolean} Criteria
   */
  get screenVaccineCriteria() {
    return getScreenVaccineCriteria(
      this.programme,
      this.repliesCountingTowardsConsent
    )
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

    // Need consent response before we can determine the chosen method.
    // We only want to instruct patients being vaccinated using nasal spray
    if (!this.consentGiven) {
      return
    }

    // If no alternative, can only have been the standard vaccine
    if (!this.programme?.alternativeVaccine) {
      return standardVaccine
    }

    // Administered vaccine was the alternative
    if (this.lastPatientSession?.hasAlternativeVaccine) {
      return alternativeVaccine
    }

    // Gelatine-free MMR vaccine requested
    const hasRequestedGelatineFree =
      this.programme.type === ProgrammeType.MMR &&
      this.repliesCountingTowardsConsent.some(
        ({ hasConsentForAlternativeVaccine }) => hasConsentForAlternativeVaccine
      )
    if (hasRequestedGelatineFree) {
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
   * Can apply bulk instruction
   *
   * @returns {boolean} Can apply bulk instruction
   */
  get canBulkInstruct() {
    return (
      this.status === PatientStatus.Due &&
      this.instructionStatus === InstructionStatus.Needed
    )
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
   * Can record vaccination
   *
   * @returns {boolean} Can record vaccination
   */
  get canRecordVaccination() {
    if (this.isIneligible) {
      return false
    }

    if (this.isVaccinated) {
      return false
    }

    return this.isActive
  }

  /**
   * Can record vaccination within a session
   *
   * @returns {boolean} Can record vaccination within a session
   */
  get canRecordVaccinationInSession() {
    return (
      this.canRecordVaccination &&
      [PatientStatus.Due, PatientStatus.Deferred].includes(this.status)
    )
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
        return this.patientConsent
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
            case 'consentGivenDate':
              return (
                this.consentGivenDate &&
                formatProgrammeStatus(
                  this.programme,
                  false,
                  formatDate(this.consentGivenDate, { dateStyle: 'long' })
                )
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
