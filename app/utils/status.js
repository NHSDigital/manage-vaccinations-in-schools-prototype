import {
  ConsentOutcome,
  DownloadStatus,
  GillickCompetent,
  InstructionOutcome,
  PatientConsentStatus,
  PatientStatus,
  RegistrationOutcome,
  ReplyDecision,
  ScreenOutcome,
  UploadStatus,
  VaccinationOutcome,
  VaccinationSyncStatus
} from '../enums.js'

/**
 * Get consent outcome status properties
 *
 * @param {ConsentOutcome} consent - Consent outcome
 * @returns {object} Status properties
 */
export function getConsentOutcomeStatus(consent) {
  let colour
  let icon
  switch (consent) {
    case ConsentOutcome.NoResponse:
      colour = 'grey'
      break
    case ConsentOutcome.NotDelivered:
    case ConsentOutcome.Inconsistent:
      colour = 'orange'
      icon = 'cross'
      break
    case ConsentOutcome.Given:
    case ConsentOutcome.GivenForAlternativeInjection:
    case ConsentOutcome.GivenForIntranasal:
      colour = 'green'
      icon = 'tick'
      break
    case ConsentOutcome.Declined:
      colour = 'yellow'
      icon = 'info'
      break
    case ConsentOutcome.Refused:
      colour = 'red'
      icon = 'cross'
      break
    case ConsentOutcome.FinalRefusal:
      colour = 'red'
      icon = 'cross'
      break
    default:
  }

  return {
    colour,
    icon,
    text: consent
  }
}

/**
 * Get download status properties
 *
 * @param {DownloadStatus} status - Download status
 * @returns {object} Status properties
 */
export function getDownloadStatus(status) {
  let colour
  switch (status) {
    case DownloadStatus.Ready:
      colour = 'green'
      break
    default:
      colour = 'white'
  }

  return {
    colour,
    text: status
  }
}

/**
 * Get consent outcome status properties
 *
 * @param {PatientConsentStatus} patientConsent - Patient consent status
 * @returns {object} Status properties
 */
export function getPatientConsentStatus(patientConsent) {
  let colour
  let text = patientConsent
  switch (patientConsent) {
    case PatientConsentStatus.NoResponse:
    case PatientConsentStatus.NotScheduled:
    case PatientConsentStatus.Scheduled:
      colour = 'grey'
      break
    case PatientConsentStatus.NoDetails:
    case PatientConsentStatus.NotDelivered:
      colour = 'orange'
      break
    case PatientConsentStatus.FollowUp:
      colour = 'yellow'
      break
    case ConsentOutcome.Refused:
      colour = 'red'
      break
    default:
      text = ConsentOutcome.Given
      colour = 'green'
  }

  return {
    colour,
    text
  }
}

/**
 * Get Gillick competency status properties
 *
 * @param {GillickCompetent} competent - Gillick competency
 * @returns {object} Status properties
 */
export function getGillickCompetenceStatus(competent) {
  return {
    colour: competent === GillickCompetent.True ? 'green' : 'red',
    icon: competent === GillickCompetent.True ? 'tick' : 'cross',
    text: competent
  }
}

/**
 * Get instruction outcome status properties
 *
 * @param {InstructionOutcome|boolean} instruct - Instruction outcome
 * @returns {object|undefined} Status properties
 */
export function getInstructionOutcomeStatus(instruct) {
  if (!instruct) {
    return
  }

  return {
    colour: instruct === InstructionOutcome.Given ? 'green' : 'grey',
    text: instruct
  }
}

/**
 * Get patient status properties
 *
 * @param {PatientStatus} report - Patient status
 * @param {import('../enums.js').PatientDueStatus} [vaccinationDue] - Patient due status
 * @returns {object} Status properties
 */
export function getPatientStatus(report, vaccinationDue) {
  let colour
  let text = report
  switch (report) {
    case PatientStatus.Ineligible:
      colour = 'grey'
      break
    case PatientStatus.Consent:
    case PatientStatus.Triage:
      colour = 'blue'
      break
    case PatientStatus.Refused:
      colour = 'orange'
      break
    case PatientStatus.Deferred:
      colour = 'red'
      break
    case PatientStatus.Due:
      colour = 'green'
      text = vaccinationDue ?? report
      break
    default:
      colour = 'white'
      break
  }

  return {
    colour,
    text
  }
}

/**
 * Get registration outcome status properties
 *
 * @param {RegistrationOutcome} register - Registration outcome
 * @returns {object} Status properties
 */
export function getRegistrationStatus(register) {
  let colour
  switch (register) {
    case RegistrationOutcome.Present:
      colour = 'green'
      break
    case RegistrationOutcome.Absent:
      colour = 'red'
      break
    case RegistrationOutcome.Complete:
      colour = 'white'
      break
    default:
      colour = 'grey'
  }

  return {
    colour,
    text: register
  }
}

/**
 * Get reply decision status properties
 *
 * @param {ReplyDecision} decision - Reply decision
 * @returns {object} Status properties
 */
export function getReplyDecisionStatus(decision) {
  let colour
  let text = decision
  switch (decision) {
    case ReplyDecision.Given:
      colour = 'green'
      break
    case ReplyDecision.OnlyAlternativeInjection:
      colour = 'green'
      text = ReplyDecision.Given
      break
    case ReplyDecision.Declined:
      colour = 'yellow'
      break
    case ReplyDecision.Refused:
      colour = 'red'
      break
    case ReplyDecision.NoResponse:
      colour = 'grey'
      break
    default:
      colour = 'blue'
  }

  return {
    colour,
    text
  }
}

/**
 * Get screen outcome status properties
 *
 * @param {ScreenOutcome|boolean} screen - Screen outcome
 * @returns {object} Status properties
 */
export function getScreenOutcomeStatus(screen) {
  let colour
  let text = screen
  switch (screen) {
    case ScreenOutcome.NeedsTriage:
      colour = 'blue'
      break
    case ScreenOutcome.InviteToClinic:
    case ScreenOutcome.DelayVaccination:
      colour = 'orange'
      break
    case ScreenOutcome.DoNotVaccinate:
      colour = 'red'
      break
    default:
      text = 'No triage needed'
      colour = 'green'
  }

  return {
    colour,
    text
  }
}

/**
 * Get upload status properties
 *
 * @param {UploadStatus} status - Upload status
 * @returns {object} Status properties
 */
export function getUploadStatus(status) {
  let colour
  switch (status) {
    case UploadStatus.Approved:
      colour = 'green'
      break
    case UploadStatus.Review:
      colour = 'blue'
      break
    case UploadStatus.Devoid:
      colour = 'grey'
      break
    case UploadStatus.Failed:
    case UploadStatus.Invalid:
      colour = 'red'
      break
    default:
      colour = 'white'
  }

  return {
    colour,
    text: status
  }
}

/**
 * Get vaccination sync status properties
 *
 * @param {VaccinationSyncStatus} syncStatus - Vaccination sync status
 * @returns {object} Status properties
 */
export function getVaccinationSyncStatus(syncStatus) {
  let colour
  switch (syncStatus) {
    case VaccinationSyncStatus.CannotSync:
      colour = 'orange'
      break
    case VaccinationSyncStatus.NotSynced:
      colour = 'grey'
      break
    case VaccinationSyncStatus.Synced:
      colour = 'green'
      break
    case VaccinationSyncStatus.Failed:
      colour = 'red'
      break
    default:
      colour = 'blue'
  }

  return {
    colour,
    text: syncStatus
  }
}

/**
 * Get vaccination outcome status properties
 *
 * @param {VaccinationOutcome} outcome - Vaccination outcome
 * @returns {object} Status properties
 */
export function getVaccinationOutcomeStatus(outcome) {
  let colour
  switch (outcome) {
    case VaccinationOutcome.DoNotVaccinate:
    case VaccinationOutcome.Refused:
    case VaccinationOutcome.Absent:
    case VaccinationOutcome.Unwell:
      colour = 'red'
      break
    case VaccinationOutcome.ConsentRefused:
    case VaccinationOutcome.DelayVaccination:
    case VaccinationOutcome.InviteToClinic:
      colour = 'orange'
      break
    default:
      colour = 'white'
  }

  return {
    colour,
    text: outcome
  }
}
