import {
  ProgrammeType,
  ReplyDecision,
  ScreenStatus,
  ScreenVaccineCriteria
} from '../enums.js'

import { stringToBoolean } from './string.js'

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
 * Get the triage outcomes that a PSD can be given with in a session, based on the
 * session’s PSD settings
 *
 * @param {Array<ScreenStatus|string>} screenStatuses - Triage outcomes offered
 * @param {string} programme_id - Programme ID
 * @param {Session} [session] - Session the child is being triaged for
 * @returns {Array<ScreenStatus>} Triage outcomes a PSD can be given with
 */
export const getScreenStatusesForPsd = (
  screenStatuses,
  programme_id,
  session
) => {
  // Without a session, there are no PSD settings to follow
  if (!session) {
    return []
  }

  return screenStatuses.filter((screenStatus) =>
    session.canUsePsdForScreenStatus(programme_id, screenStatus)
  )
}

/**
 * Has the person triaging asked to give a PSD with the chosen triage outcome?
 *
 * The PSD question is asked separately for each triage outcome it applies to, so only
 * the answer for the chosen outcome counts
 *
 * @param {object} triage - Triage form answers
 * @param {ScreenStatus} triage.status - Chosen triage outcome
 * @param {object} [triage.psd] - PSD answers, keyed by `ScreenStatus` key
 * @returns {boolean} PSD should be given
 */
export const isPsdRequestedInTriage = (triage) => {
  const screenStatusKey = Object.keys(ScreenStatus).find(
    (key) => ScreenStatus[key] === triage?.status
  )

  return stringToBoolean(triage?.psd?.[screenStatusKey]) === true
}

/**
 * @import { Programme, Reply, Session } from '../models.js'
 */
