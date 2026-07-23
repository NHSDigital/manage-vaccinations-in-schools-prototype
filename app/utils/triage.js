import {
  ProgrammeType,
  ReplyDecision,
  ScreenStatus,
  ScreenVaccineCriteria,
  VaccinationOutcome
} from '../enums.js'

import { getRepliesWithHealthAnswers } from './reply.js'

/**
 * Get screening statuses for vaccination method(s) consented to
 *
 * @param {Programme} programme - Programme
 * @param {Array<Reply>} replies - Replies
 * @returns {Array<ScreenStatus>} Screening statuses
 */
export const getScreenStatusesForConsentMethod = (programme, replies) => {
  const hasConsentForInjection = replies?.every(
    ({ hasConsentForInjection }) => hasConsentForInjection
  )

  const hasConsentForAlternativeInjectionOnly = replies?.every(
    ({ decision }) => decision === ReplyDecision.OnlyAlternativeInjection
  )

  return [
    ...(!programme?.alternativeVaccine ? [ScreenStatus.Vaccinate] : []),
    ...(programme?.alternativeVaccine &&
    programme.type === ProgrammeType.Flu &&
    !hasConsentForAlternativeInjectionOnly
      ? [ScreenStatus.VaccinateIntranasalOnly]
      : []),
    ...(programme?.alternativeVaccine &&
    programme.type === ProgrammeType.Flu &&
    hasConsentForInjection
      ? [ScreenStatus.VaccinateAlternativeFluInjectionOnly]
      : []),
    ...(programme?.alternativeVaccine && programme.type === ProgrammeType.MMR
      ? [ScreenStatus.VaccinateAlternativeFluInjectionOnly]
      : []),
    'or',
    ScreenStatus.NeedsTriage,
    ScreenStatus.InvitedToClinic,
    ScreenStatus.DelayVaccination,
    ScreenStatus.DoNotVaccinate
  ]
}

/**
 * Get vaccination criteria consented to use if safe to vaccinate
 *
 * @param {Programme} programme - Programme
 * @param {Array<Reply>} replies - Replies
 * @returns {ScreenVaccineCriteria|boolean} Criteria
 */
export const getScreenVaccineCriteria = (programme, replies) => {
  const hasConsentForInjection = replies?.every(
    ({ hasConsentForInjection }) => hasConsentForInjection
  )

  const hasConsentForAlternativeInjectionOnly = replies?.every(
    ({ decision }) => decision === ReplyDecision.OnlyAlternativeInjection
  )

  if (programme?.alternativeVaccine) {
    switch (true) {
      case hasConsentForAlternativeInjectionOnly &&
        programme.type === ProgrammeType.Flu:
        return ScreenVaccineCriteria.AlternativeFluInjectionOnly
      case hasConsentForAlternativeInjectionOnly &&
        programme.type === ProgrammeType.MMR:
        return ScreenVaccineCriteria.AlternativeMMRInjectionOnly
      case !hasConsentForInjection:
        return ScreenVaccineCriteria.IntranasalOnly
      default:
        return false
    }
  }

  return false
}

/**
 * Get screening status (what was the triage decision)
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {ScreenStatus|boolean} Screening status
 */
export const getScreenStatus = (patientSession) => {
  // No consent given, so cannot triage yet
  if (!patientSession.consentGiven) {
    return false
  }

  // Triage occurred during a previous vaccination session
  if (patientSession.lastVaccinationOutcome) {
    if (
      patientSession.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.InvitedToClinic
    ) {
      return ScreenStatus.InvitedToClinic
    }

    if (
      patientSession.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.DelayVaccination
    ) {
      return ScreenStatus.DelayVaccination
    }

    if (
      patientSession.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.DoNotVaccinate
    ) {
      return ScreenStatus.DoNotVaccinate
    }
  }

  const responses = Object.values(patientSession.responses)
  const responsesToTriage = getRepliesWithHealthAnswers(responses)
  const lastTriageNoteWithOutcome = patientSession.triageNotes
    .filter((event) => event.outcome)
    .at(-1)

  if (responsesToTriage.length === 0) {
    // Triage completed without any ‘Yes’ answers to health questions
    if (lastTriageNoteWithOutcome) {
      return lastTriageNoteWithOutcome.outcome
    }

    // Clinic appointment without any answers to health questions
    if (!responses.length && patientSession.clinicAppointment) {
      return ScreenStatus.NeedsTriage
    }

    return false
  }

  // Triage needed or completed due to answers to health questions
  if (responsesToTriage.length > 0) {
    if (lastTriageNoteWithOutcome) {
      return lastTriageNoteWithOutcome.outcome
    }

    return ScreenStatus.NeedsTriage
  }

  return false
}

/**
 * @import { PatientSession, Programme, Reply } from '../models.js'
 */
