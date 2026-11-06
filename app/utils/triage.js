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

  // If anyone gave consent for the injection only, the nasal spray can’t be
  // given, even if others prefer it
  const hasConsentForAlternativeInjectionOnly = replies?.some(
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

  // If anyone gave consent for the injection only, the nasal spray can’t be
  // given, even if others prefer it
  const hasConsentForAlternativeInjectionOnly = replies?.some(
    ({ decision }) => decision === ReplyDecision.OnlyAlternativeInjection
  )

  if (programme?.type === ProgrammeType.Flu) {
    switch (true) {
      case hasConsentForAlternativeInjectionOnly:
        return ScreenVaccineCriteria.AlternativeFluInjectionOnly
      case !hasConsentForInjection:
        return ScreenVaccineCriteria.IntranasalOnly
      default:
        return false
    }
  }

  // If anyone gave consent for the gelatine-free vaccine only, the vaccine
  // containing gelatine can’t be given, even if others are happy with either
  const hasConsentForGelatineFreeVaccineOnly = replies?.some(
    ({ hasConsentForGelatineFreeVaccineOnly }) =>
      hasConsentForGelatineFreeVaccineOnly
  )
  if (
    programme?.type === ProgrammeType.MMR &&
    hasConsentForGelatineFreeVaccineOnly
  ) {
    return ScreenVaccineCriteria.AlternativeMMRInjectionOnly
  }

  return false
}

/**
 * @import { Programme, Reply } from '../models.js'
 */
