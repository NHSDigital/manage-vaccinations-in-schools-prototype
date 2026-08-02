import {
  ConsentStatus,
  DownloadStatus,
  InstructionStatus,
  PatientClinicStatus,
  PatientStatus,
  RegistrationStatus,
  ReplyDecision,
  SchoolStatus,
  ScreenStatus,
  UploadStatus,
  VaccinationOutcome,
  VaccinationSyncStatus
} from '../enums.js'

const CONSENT_REQUEST_STATUS_COLOURS = {
  [ConsentStatus.NoResponse]: 'grey',
  [ConsentStatus.NotDelivered]: 'orange'
}

const CONSENT_STATUS_COLOURS = {
  [ConsentStatus.NoResponse]: 'grey',
  [ConsentStatus.NotDelivered]: 'orange',
  [ConsentStatus.Inconsistent]: 'orange',
  [ConsentStatus.Given]: 'green',
  [ConsentStatus.GivenForAlternativeInjection]: 'green',
  [ConsentStatus.GivenForIntranasal]: 'green',
  [ConsentStatus.Declined]: 'yellow',
  [ConsentStatus.Refused]: 'red',
  [ConsentStatus.FinalRefusal]: 'red'
}

const DOWNLOAD_STATUS_COLOURS = {
  [DownloadStatus.Processing]: 'grey',
  [DownloadStatus.Ready]: 'green'
}

const PATIENT_CLINIC_STATUS_COLOURS = {
  [PatientClinicStatus.Ready]: 'green',
  [PatientClinicStatus.Invited]: 'orange',
  [PatientClinicStatus.Booked]: 'blue'
}

const PATIENT_STATUS_COLOURS = {
  [PatientStatus.Ineligible]: 'grey',
  [PatientStatus.Consent]: 'blue',
  [PatientStatus.Triage]: 'blue',
  [PatientStatus.Refused]: 'orange',
  [PatientStatus.Deferred]: 'red',
  [PatientStatus.Due]: 'green'
}

const REGISTRATION_STATUS_COLOURS = {
  [RegistrationStatus.Present]: 'green',
  [RegistrationStatus.Absent]: 'red',
  [RegistrationStatus.Complete]: 'white'
}

const REPLY_DECISION_COLOURS = {
  [ReplyDecision.Given]: 'green',
  [ReplyDecision.OnlyAlternativeInjection]: 'green',
  [ReplyDecision.Declined]: 'yellow',
  [ReplyDecision.Refused]: 'red',
  [ReplyDecision.NoResponse]: 'grey'
}

const SCHOOL_STATUS_COLOURS = {
  [SchoolStatus.Open]: 'white',
  [SchoolStatus.Opening]: 'yellow',
  [SchoolStatus.Closing]: 'yellow',
  [SchoolStatus.Closed]: 'grey'
}

const SCREEN_STATUS_COLOURS = {
  [ScreenStatus.NeedsTriage]: 'blue',
  [ScreenStatus.InvitedToClinic]: 'orange',
  [ScreenStatus.DelayVaccination]: 'orange',
  [ScreenStatus.DoNotVaccinate]: 'red'
}

const UPLOAD_STATUS_COLOURS = {
  [UploadStatus.Approved]: 'green',
  [UploadStatus.Review]: 'blue',
  [UploadStatus.Devoid]: 'grey',
  [UploadStatus.Failed]: 'red',
  [UploadStatus.Invalid]: 'red'
}

const VACCINATION_SYNC_STATUS_COLOURS = {
  [VaccinationSyncStatus.CannotSync]: 'orange',
  [VaccinationSyncStatus.NotSynced]: 'grey',
  [VaccinationSyncStatus.Synced]: 'green',
  [VaccinationSyncStatus.Failed]: 'red'
}

const VACCINATION_OUTCOME_COLOURS = {
  [VaccinationOutcome.DoNotVaccinate]: 'red',
  [VaccinationOutcome.Refused]: 'red',
  [VaccinationOutcome.Absent]: 'red',
  [VaccinationOutcome.Unwell]: 'red',
  [VaccinationOutcome.ConsentRefused]: 'orange',
  [VaccinationOutcome.DelayVaccination]: 'orange',
  [VaccinationOutcome.InvitedToClinic]: 'orange'
}

/**
 * Get clinic status properties
 *
 * @param {PatientClinicStatus|false} status - clinic status
 * @returns {object} Status properties
 */
export function getPatientClinicStatusProperties(status) {
  return {
    colour: PATIENT_CLINIC_STATUS_COLOURS[status] ?? 'white',
    text: status
  }
}

/**
 * Get consent request status properties
 *
 * @param {ConsentStatus} status - Consent request status
 * @returns {object} Status properties
 */
export function getConsentRequestStatusProperties(status) {
  return { colour: CONSENT_REQUEST_STATUS_COLOURS[status], text: status }
}

/**
 * Get consent status properties
 *
 * @param {ConsentStatus} status - Consent status
 * @returns {object} Status properties
 */
export function getConsentStatusProperties(status) {
  return { colour: CONSENT_STATUS_COLOURS[status], text: status }
}

/**
 * Get download status properties
 *
 * @param {DownloadStatus} status - Download status
 * @returns {object} Status properties
 */
export function getDownloadStatusProperties(status) {
  return { colour: DOWNLOAD_STATUS_COLOURS[status], text: status }
}

/**
 * Get instruction status properties
 *
 * @param {InstructionStatus|boolean} status - Instruction status
 * @returns {object|undefined} Status properties
 */
export function getInstructionStatusProperties(status) {
  if (!status) {
    return
  }

  return {
    colour: status === InstructionStatus.Given ? 'green' : 'grey',
    text: status
  }
}

/**
 * Get patient status properties
 *
 * @param {PatientStatus} status - Patient status
 * @param {PatientDueStatus} [vaccinationDue] - Patient due status
 * @returns {object} Status properties
 */
export function getPatientStatusProperties(status, vaccinationDue) {
  return {
    colour: PATIENT_STATUS_COLOURS[status] ?? 'white',
    text: status === PatientStatus.Due ? (vaccinationDue ?? status) : status
  }
}

/**
 * Get registration status properties
 *
 * @param {RegistrationStatus} status - Registration status
 * @returns {object} Status properties
 */
export function getRegistrationStatusProperties(status) {
  return {
    colour: REGISTRATION_STATUS_COLOURS[status] ?? 'grey',
    text: status
  }
}

/**
 * Get reply decision status properties
 *
 * @param {ReplyDecision} decision - Reply decision
 * @returns {object} Decision properties
 */
export function getReplyDecisionProperties(decision) {
  return {
    colour: REPLY_DECISION_COLOURS[decision] ?? 'blue',
    text:
      decision === ReplyDecision.OnlyAlternativeInjection
        ? ReplyDecision.Given
        : decision
  }
}

/**
 * Get school status properties
 *
 * @param {SchoolStatus} status - School status
 * @returns {object} Status properties
 */
export function getSchoolStatusProperties(status) {
  return {
    colour: SCHOOL_STATUS_COLOURS[status],
    text: status
  }
}

/**
 * Get screen status properties
 *
 * @param {ScreenStatus|boolean} status - Screen status
 * @returns {object} Status properties
 */
export function getScreenStatusProperties(status) {
  const hasStatus = String(status) in SCREEN_STATUS_COLOURS

  return {
    colour: hasStatus ? SCREEN_STATUS_COLOURS[status] : 'green',
    text: hasStatus ? status : 'No triage needed'
  }
}

/**
 * Get upload status properties
 *
 * @param {UploadStatus} status - Upload status
 * @returns {object} Status properties
 */
export function getUploadStatusProperties(status) {
  return {
    colour: UPLOAD_STATUS_COLOURS[status] ?? 'white',
    text: status
  }
}

/**
 * Get vaccination sync status properties
 *
 * @param {VaccinationSyncStatus} status - Vaccination sync status
 * @returns {object} Status properties
 */
export function getVaccinationSyncStatusProperties(status) {
  return {
    colour: VACCINATION_SYNC_STATUS_COLOURS[status] ?? 'blue',
    text: status
  }
}

/**
 * Get vaccination outcome properties
 *
 * @param {VaccinationOutcome} outcome - Vaccination outcome
 * @returns {object} Outcome properties
 */
export function getVaccinationOutcomeProperties(outcome) {
  return {
    colour: VACCINATION_OUTCOME_COLOURS[outcome] ?? 'white',
    text: outcome
  }
}

/**
 * @import { PatientDueStatus } from '../enums.js'
 */
