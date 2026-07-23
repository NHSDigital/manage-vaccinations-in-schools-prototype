import {
  ProgrammeType,
  ReplyDecision,
  ScreenOutcome,
  ScreenVaccineCriteria,
  VaccinationOutcome
} from '../enums.js'

import { getRepliesWithHealthAnswers } from './reply.js'

/**
 * Get screen outcomes for vaccination method(s) consented to
 *
 * @param {Programme} programme - Programme
 * @param {Array<Reply>} replies - Replies
 * @returns {Array<ScreenOutcome>} Screen outcomes
 */
export const getScreenOutcomesForConsentMethod = (programme, replies) => {
  const hasConsentForInjection = replies?.every(
    ({ hasConsentForInjection }) => hasConsentForInjection
  )

  const hasConsentForAlternativeInjectionOnly = replies?.every(
    ({ decision }) => decision === ReplyDecision.OnlyAlternativeInjection
  )

  return [
    ...(!programme?.alternativeVaccine ? [ScreenOutcome.Vaccinate] : []),
    ...(programme?.alternativeVaccine &&
    programme.type === ProgrammeType.Flu &&
    !hasConsentForAlternativeInjectionOnly
      ? [ScreenOutcome.VaccinateIntranasalOnly]
      : []),
    ...(programme?.alternativeVaccine &&
    programme.type === ProgrammeType.Flu &&
    hasConsentForInjection
      ? [ScreenOutcome.VaccinateAlternativeFluInjectionOnly]
      : []),
    ...(programme?.alternativeVaccine && programme.type === ProgrammeType.MMR
      ? [ScreenOutcome.VaccinateAlternativeFluInjectionOnly]
      : []),
    'or',
    ScreenOutcome.NeedsTriage,
    ScreenOutcome.InvitedToClinic,
    ScreenOutcome.DelayVaccination,
    ScreenOutcome.DoNotVaccinate
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
 * Get screen outcome (what was the triage decision)
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {ScreenOutcome|boolean} Screen outcome
 */
export const getScreenOutcome = (patientSession) => {
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
      return ScreenOutcome.InvitedToClinic
    }

    if (
      patientSession.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.DelayVaccination
    ) {
      return ScreenOutcome.DelayVaccination
    }

    if (
      patientSession.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.DoNotVaccinate
    ) {
      return ScreenOutcome.DoNotVaccinate
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
      return ScreenOutcome.NeedsTriage
    }

    return false
  }

  // Triage needed or completed due to answers to health questions
  if (responsesToTriage.length > 0) {
    if (lastTriageNoteWithOutcome) {
      return lastTriageNoteWithOutcome.outcome
    }

    return ScreenOutcome.NeedsTriage
  }

  return false
}

/**
 * @import { PatientSession, Programme, Reply } from '../models.js'
 */
