import {
  ProgrammeType,
  ReplyDecision,
  ScreenStatus,
  ScreenVaccineCriteria
} from '../enums.js'

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
 * @import { Programme, Reply } from '../models.js'
 */
