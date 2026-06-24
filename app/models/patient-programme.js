import { addMonths, addWeeks, isAfter } from 'date-fns'

import {
  AuditEventType,
  PatientClinicStatus,
  PatientConsentStatus,
  PatientDeferredStatus,
  PatientDueStatus,
  PatientRefusedStatus,
  PatientStatus,
  ProgrammeType,
  SessionStatus,
  SessionType
} from '../enums.js'
import {
  AuditEvent,
  Patient,
  Programme,
  Session,
  Vaccination
} from '../models.js'
import {
  getCurrentAcademicYear,
  getDateValueDifference,
  today
} from '../utils/date.js'
import { ordinal } from '../utils/number.js'
import { getReportOutcome } from '../utils/patient-session.js'
import { getPatientStatus } from '../utils/status.js'
import {
  formatProgrammeStatus,
  formatTag,
  formatWithSecondaryText
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} PatientProgrammeOptions
 * @property {boolean} [invitedToClinic] - Invited to clinic
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
    this.invitedToClinic = options?.invitedToClinic
  }

  /**
   * Year patient is eligible for programme
   *
   * @returns {number|undefined} Year patient becomes eligible for programme
   */
  get year() {
    if (!this.programme) {
      return
    }

    if (this.programme.type === ProgrammeType.Flu) {
      const academicYear = getCurrentAcademicYear()

      // If flu season has finished, make eligible for next year’s programme
      if (isAfter(today(), `${academicYear + 1}-03-31`)) {
        return academicYear + 1
      }

      return academicYear
    }

    const yearsUntilEligible =
      this.programme.targetYearGroup - this.patient.yearGroup

    return getCurrentAcademicYear() + yearsUntilEligible
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
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
  }

  /**
   * Get patient sessions for this patient programme
   *
   * @returns {Array<PatientSession>} Patient sessions
   */
  get patientSessions() {
    return this.patient?.patientSessions
      .filter(
        (patientSession) => patientSession?.programme_id === this.programme_id
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
    if (this.invitedToClinic) {
      return PatientClinicStatus.Invited
    }

    // Maybe we *can* vaccinate the child, but there are no school sessions left?
    if (this.canVaccinateAtClinic && !this.schoolSessionPending) {
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
    return this.canVaccinateAtClinic && !this.schoolSessionPending
  }

  /**
   * Can the child be vaccinated (assuming we get the right consent and triage outcomes, if required)?
   *
   * @returns {boolean} OK to invite to clinic for a vaccination based on patient status (`true`), or otherwise (`false`)
   */
  get canVaccinateAtClinic() {
    const { status } = this

    switch (status) {
      case PatientStatus.Due:
      case PatientStatus.Triage:
        return true
      case PatientStatus.Deferred: {
        switch (this.lastPatientSession?.patientDeferred) {
          case PatientDeferredStatus.DoNotVaccinate:
            return false
          case PatientDeferredStatus.DelayVaccination: {
            const firstSafeDate =
              this.lastPatientSession?.triageNotes?.at(-1)?.outcomeAt
            return firstSafeDate === undefined || today() > firstSafeDate
          }
          default:
            return true
        }
      }
      case PatientStatus.Consent:
        return !this.patient?.hasNoContactDetails || this.patient.post16
      case PatientStatus.Refused:
        return (
          this.lastPatientSession?.patientRefused ===
          PatientRefusedStatus.FollowUp
        )
      default:
        return false
    }
  }

  /**
   * Does the patient still have a chance to get vaccinated at school this academic year?
   *
   * @returns {boolean} If there's still a chance for school vaccination (`true`), or otherwise (`false`)
   */
  get schoolSessionPending() {
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
      latestSchoolSession?.academicYear === getCurrentAcademicYear()
    )
  }

  /**
   * Get active clinics for this programme
   *
   * @returns {Array<Session>} Active clinics targeting this programme
   */
  get activeClinics() {
    return Session.findAll(this.context)
      ?.filter(({ programme_ids }) => programme_ids.includes(this.programme_id))
      ?.filter(({ type }) => type === SessionType.Clinic)
      ?.filter(({ status }) => status === SessionStatus.Active)
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
    return Session.findAll(this.context)
      ?.filter(({ programme_ids }) => programme_ids.includes(this.programme_id))
      ?.filter(({ type }) => type === SessionType.Clinic)
      ?.filter(({ status }) => status === SessionStatus.Planned)
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
   * Eligible for programme in the current academic year
   *
   * @returns {boolean} Eligible for programme
   */
  get eligible() {
    return (
      !this.patient?.agedOutOfProgrammes &&
      getCurrentAcademicYear() >= this.year
    )
  }

  /**
   * Get vaccination outcomes
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get vaccinationOutcomes() {
    return this.patient?.vaccinations.filter(
      ({ programme }) => programme.id === this.programme_id
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
    return this.vaccinationOutcomes.filter((vaccination) => vaccination.given)
  }

  /**
   * Get TTCV vaccinations given
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get ttcvVaccinationsGiven() {
    return this.patient?.vaccinations
      .filter((vaccination) => vaccination.programme?.ttcv)
      .filter((vaccination) => vaccination.given)
  }

  /**
   * Get other vaccinations given
   *
   * @returns {Array<Vaccination>|undefined} Vaccinations
   */
  get otherVaccinationsGiven() {
    return this.patient?.vaccinations
      .filter((vaccination) => vaccination.programmeOther)
      .filter((vaccination) => vaccination.given)
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
      this.patient.immunocompromised &&
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
   * Get dose sequence code
   *
   * @returns {string} Dose sequence code
   */
  get sequence() {
    if (
      this.patient.immunocompromised &&
      this.programme.immunocompromisedSequence
    ) {
      return this.programme.immunocompromisedSequence[this.doseDue - 1]
    }

    return this.programme.sequence[this.doseDue - 1]
  }

  get ttcvVaccinations() {
    if (this.programme.type === ProgrammeType.TdIPV) {
      return [
        new Vaccination(
          {
            createdAt: addWeeks(this.patient.dob, 8),
            programme_id: '5in1',
            sequence: '1P'
          },
          this.context
        ),
        new Vaccination(
          {
            createdAt: addWeeks(this.patient.dob, 12),
            programme_id: '5in1',
            sequence: '2P'
          },
          this.context
        ),
        new Vaccination(
          {
            createdAt: addWeeks(this.patient.dob, 16),
            programme_id: '5in1',
            sequence: '3P'
          },
          this.context
        ),
        new Vaccination(
          {
            createdAt: addMonths(this.patient.dob, 40),
            programme_id: '4in1',
            sequence: '1B'
          },
          this.context
        ),
        ...this.ttcvVaccinationsGiven,
        ...this.otherVaccinationsGiven
      ].sort((a, b) => getDateValueDifference(a.createdAt, b.createdAt))
    }
  }

  /**
   * Get vaccination due
   *
   * @returns {PatientDueStatus} Vaccination due
   */
  get vaccinationDue() {
    switch (true) {
      case this.dosesNeeded === 3 && this.dosesRemaining === 1:
        return PatientDueStatus.Third
      case this.dosesNeeded === 3 && this.dosesRemaining === 2:
      case this.dosesNeeded === 2 && this.dosesRemaining === 1:
        return PatientDueStatus.Second
      case this.dosesNeeded === 3 && this.dosesRemaining === 3:
      case this.dosesNeeded === 2 && this.dosesRemaining === 2:
        return PatientDueStatus.First
      case this.dosesNeeded === 1 && this.dosesRemaining === 1:
      default:
        return PatientDueStatus.Only
    }
  }

  /**
   * Get status
   *
   * @returns {PatientStatus} Status properties
   */
  get status() {
    // Not eligible for programme yet
    if (!this.eligible) {
      return PatientStatus.Ineligible
    }

    // Is fully vaccinated
    if (this.dosesRemaining === 0) {
      return PatientStatus.Vaccinated
    }

    // Has been invited to a session
    if (this.lastPatientSession) {
      return getReportOutcome(this.lastPatientSession)
    }

    // Needs to be invited to a session
    return PatientStatus.Consent
  }

  /**
   * Get status colour name
   *
   * @returns {string} Colour name
   */
  get statusColour() {
    return getPatientStatus(this.status, this.vaccinationDue).colour
  }

  /**
   * Get explanatory notes
   *
   * @returns {string} Explanatory notes
   */
  get statusNotes() {
    switch (this.status) {
      case PatientStatus.Ineligible:
        return this.patient?.agedOutOfProgrammes
          ? 'Not eligible for school age immunisation'
          : `Eligible from 1 September ${this.year}`
      case PatientStatus.Vaccinated:
        return `Vaccinated on ${this.lastVaccinationGiven.formatted.administeredAt_dateShort}`
      case PatientStatus.Triage:
        return this.lastPatientSession.patientTriage
      case PatientStatus.Due:
        return this.lastPatientSession.vaccineCriteria
      case PatientStatus.Deferred:
        return this.lastVaccinationOutcome
          ? `${this.lastPatientSession.patientDeferred} on ${this.lastVaccinationOutcome.formatted.administeredAt_dateShort}`
          : this.lastPatientSession.patientDeferred
      case PatientStatus.Refused:
        return this.lastPatientSession.patientRefused
      case PatientStatus.Consent:
        return this.lastPatientSession
          ? this.lastPatientSession.patientConsent
          : PatientConsentStatus.NotScheduled
    }
  }

  /**
   * Get vaccine to administer (or was administered) in this patient session
   *
   * @returns {RecordVaccineCriteria} Vaccine criteria
   */
  get vaccineCriteria() {
    return this.lastPatientSession.vaccineCriteria
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
            formatTag(getPatientStatus(this.status, this.vaccinationDue))

          switch (prop) {
            case 'doseDue':
              return ordinal(this.doseDue)
            case 'status':
              return getStatusTag()
            case 'statusWithNotes':
              return formatWithSecondaryText(
                getStatusTag(),
                this.statusNotes,
                false
              )
            case 'programmeStatus':
              return formatProgrammeStatus(
                this.programme,
                getPatientStatus(this.status, this.vaccinationDue),
                this.statusNotes
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
    return `/patients/${this.patient_uuid}/programmes/${this.programme_id}`
  }
}

PatientProgramme.relate('patient_uuid', () => Patient, 'patient')
PatientProgramme.relate('programme_id', () => Programme, 'programme')

/**
 * @import { RecordVaccineCriteria } from '../enums.js'
 * @import { PatientSession } from '../models.js'
 * @import { BaseModelOptions } from './base.js'
 */
