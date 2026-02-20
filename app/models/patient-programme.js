import { addMonths, addWeeks } from 'date-fns'

import {
  PatientConsentStatus,
  PatientDueStatus,
  PatientStatus,
  ProgrammeType
} from '../enums.js'
import { AuditEvent, Patient, Programme, Vaccination } from '../models.js'
import {
  getCurrentAcademicYear,
  getDateValueDifference
} from '../utils/date.js'
import { ordinal } from '../utils/number.js'
import { getReportOutcome } from '../utils/patient-session.js'
import { getPatientStatus } from '../utils/status.js'
import {
  formatProgrammeStatus,
  formatTag,
  formatWithSecondaryText
} from '../utils/string.js'

/**
 * @class Patient Programme
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {object} [context] - Global context
 * @property {boolean} [invitedToClinic] - Invited to clinic
 * @property {string} patient_uuid - Patient UUID
 * @property {string} programme_id - Programme ID
 */
export class PatientProgramme {
  constructor(options, context) {
    this.context = context
    this.invitedToClinic = options?.invitedToClinic
    this.patient_uuid = options?.patient_uuid
    this.programme_id = options?.programme_id
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
      console.error('PatientProgramme.patient', error.message)
    }
  }

  /**
   * Get programme
   *
   * @returns {Programme|undefined} Programme
   */
  get programme() {
    try {
      const programme = Programme.findOne(this.programme_id, this.context)

      if (this.programme_id === 'mmr' && this.patient?.age <= 6) {
        programme.name = 'MMRV'
      }

      return programme
    } catch (error) {
      console.error('PatientProgramme.programme', error.message)
    }
  }

  /**
   * Year patient is eligible for programme
   *
   * @returns {number} Year patient becomes eligible for programme
   */
  get year() {
    if (!this.programme) {
      return
    }

    if (this.programme.type === ProgrammeType.Flu) {
      return getCurrentAcademicYear()
    }

    const yearsUntilEligible =
      this.programme.targetYearGroup - this.patient.yearGroup

    return getCurrentAcademicYear() + yearsUntilEligible
  }

  /**
   * Get audit events for this patient programme
   *
   * @returns {Array<import('./audit-event.js').AuditEvent>} Audit events
   */
  get auditEvents() {
    return this.patient.events
      .map((auditEvent) => new AuditEvent(auditEvent, this.context))
      .filter(({ programme_ids }) =>
        programme_ids?.some((id) => this.programme_id === id)
      )
  }

  /**
   * Get patient sessions for this patient programme
   *
   * @returns {Array<import('./patient-session.js').PatientSession>} Patient sessions
   */
  get patientSessions() {
    return this.patient?.patientSessions.filter(
      ({ programme_id }) => programme_id === this.programme_id
    )
  }

  /**
   * Get most recent patient session
   *
   * @returns {import('./patient-session.js').PatientSession} Patient session
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
  get inviteToSession() {
    return (
      this.status !== PatientStatus.Ineligible &&
      this.status !== PatientStatus.Vaccinated
    )
  }

  /**
   * Eligible for programme in the current academic year
   *
   * @returns {boolean} Eligible for programme
   */
  get eligible() {
    return getCurrentAcademicYear() >= this.year
  }

  /**
   * Get vaccination outcomes
   *
   * @returns {Array<import('./vaccination.js').Vaccination>|undefined} Vaccinations
   */
  get vaccinationOutcomes() {
    return this.patient?.vaccinations.filter(
      ({ programme }) => programme.id === this.programme_id
    )
  }

  /**
   * Get last vaccination outcome
   *
   * @returns {import('./vaccination.js').Vaccination} Vaccination
   */
  get lastVaccinationOutcome() {
    if (this.vaccinationOutcomes?.length > 0) {
      return this.vaccinationOutcomes.at(-1)
    }
  }

  /**
   * Get vaccinations given
   *
   * @returns {Array<import('./vaccination.js').Vaccination>|undefined} Vaccinations
   */
  get vaccinationsGiven() {
    return this.vaccinationOutcomes.filter((vaccination) => vaccination.given)
  }

  /**
   * Get TTCV vaccinations given
   *
   * @returns {Array<import('./vaccination.js').Vaccination>|undefined} Vaccinations
   */
  get ttcvVaccinationsGiven() {
    return this.patient?.vaccinations
      .filter((vaccination) => vaccination.programme?.ttcv)
      .filter((vaccination) => vaccination.given)
  }

  /**
   * Get other vaccinations given
   *
   * @returns {Array<import('./vaccination.js').Vaccination>|undefined} Vaccinations
   */
  get otherVaccinationsGiven() {
    return this.patient?.vaccinations
      .filter((vaccination) => vaccination.programmeOther)
      .filter((vaccination) => vaccination.given)
  }

  /**
   * Get last vaccination outcome
   *
   * @returns {import('./vaccination.js').Vaccination} Vaccination
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
   * @returns {number} Dose sequence code
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
        return this.patient.post16
          ? 'Not eligible for school age immunisation'
          : `Eligible from 1 September ${this.year}`
      case PatientStatus.Vaccinated:
        return `Vaccinated on ${this.lastVaccinationGiven.formatted.createdAt_dateShort}`
      case PatientStatus.Due:
        return this.lastPatientSession.vaccineCriteria
      case PatientStatus.Deferred:
        return this.lastVaccinationOutcome
          ? `${this.lastPatientSession.patientDeferred} on ${this.lastVaccinationOutcome.formatted.createdAt_dateShort}`
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
   * @returns {import('../enums.js').RecordVaccineCriteria} Vaccine criteria
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
    const status = formatTag(getPatientStatus(this.status, this.vaccinationDue))

    return {
      doseDue: ordinal(this.doseDue),
      status,
      statusWithNotes: formatWithSecondaryText(status, this.statusNotes, false),
      programmeStatus: formatProgrammeStatus(
        this.programme,
        getPatientStatus(this.status, this.vaccinationDue),
        this.statusNotes
      )
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'patientProgramme'
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
