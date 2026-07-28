import filters from '@x-govuk/govuk-prototype-filters'

import {
  ConsentStatus,
  ConsentVaccineCriteria,
  ConsentWindow,
  ReplyDecision
} from '../enums.js'

/**
 * Get confirmed consent status
 *
 * @param {Reply} reply - Reply
 * @param {Session} session - Session
 * @returns {ConsentStatus} Confirmed consent status
 */
export function getConfirmedConsentStatus(reply, session) {
  if (!reply.delivered) {
    return ConsentStatus.NotDelivered
  }

  if (reply.decision === ReplyDecision.NoResponse) {
    return ConsentStatus.NoResponse
  }

  if (reply.decision === ReplyDecision.Refused && reply.hasConfirmedRefusal) {
    return ConsentStatus.FinalRefusal
  }

  if (reply.hasRefusedConsent) {
    return ConsentStatus.Refused
  }

  if (reply.hasGivenConsent) {
    if (
      session?.canOfferAlternativeVaccine &&
      reply.decision === ReplyDecision.OnlyAlternativeInjection
    ) {
      return ConsentStatus.GivenForAlternativeInjection
    }

    if (
      session?.canOfferIntranasalVaccine &&
      reply.decision !== ReplyDecision.OnlyAlternativeInjection &&
      !reply.hasConsentForAlternativeVaccine
    ) {
      return ConsentStatus.GivenForIntranasal
    }

    return ConsentStatus.Given
  }

  return reply.decision
}

/**
 * Get consent status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {ConsentStatus} Consent status
 */
export function getConsentStatus(patientSession) {
  // If patient is 16+, assume consent given
  if (patientSession.patient.isPost16) {
    return ConsentStatus.Given
  }

  // Get valid replies
  const validReplies = Object.values(patientSession.replies).filter(
    ({ isInvalidated }) => !isInvalidated
  )

  // If no valid replies, no response
  if (validReplies.length === 0) {
    return ConsentStatus.NoResponse
  }

  // If all valid replies were undelivered, request failed
  if (validReplies.every(({ delivered }) => !delivered)) {
    return ConsentStatus.NotDelivered
  }

  // Get valid and delivered replies
  const replies = validReplies.filter(({ delivered }) => delivered)

  // If any reply is child self consenting, use child’s decision
  const childReply = replies.find((reply) => reply.hasSelfConsent)
  if (childReply) {
    return getConfirmedConsentStatus(childReply, patientSession.session)
  }

  // If only one reply, use that decision
  if (replies.length === 1) {
    return getConfirmedConsentStatus(replies[0], patientSession.session)
  }

  // If many replies, determine if responses are consistent or inconsistent
  if (replies.length > 1) {
    // If one of the replies is a confirmed refusal, consent is final refusal
    if (
      replies.find(
        ({ hasRefusedConsent, hasConfirmedRefusal }) =>
          hasRefusedConsent && hasConfirmedRefusal
      )
    ) {
      return ConsentStatus.FinalRefusal
    }

    // If one of the replies is a refusal, consent is refused
    if (replies.find(({ hasRefusedConsent }) => hasRefusedConsent)) {
      return ConsentStatus.Refused
    }

    // If one of the replies has requested follow up, show this status
    // over showing inconsistent consent
    if (replies.find(({ hasDeclinedConsent }) => hasDeclinedConsent)) {
      return ConsentStatus.Declined
    }

    // If consent given, determine which vaccine method has consent
    if (replies.every(({ hasGivenConsent }) => hasGivenConsent)) {
      // For flu programme, determine if consent given for injection
      if (patientSession.session?.canOfferIntranasalVaccine) {
        const allWantInjection = replies.every(
          ({ vaccineCriteria }) =>
            vaccineCriteria ===
            ConsentVaccineCriteria.AlternativeFluInjectionOnly
        )
        const someWantInjectionOnly = replies.some(
          ({ vaccineCriteria }) =>
            vaccineCriteria ===
            ConsentVaccineCriteria.AlternativeFluInjectionOnly
        )
        const someWantIntranasalOnly = replies.some(
          ({ vaccineCriteria }) =>
            vaccineCriteria === ConsentVaccineCriteria.IntranasalOnly
        )
        const allAcceptAlternative = replies.every(
          ({ hasConsentForAlternativeVaccine }) =>
            hasConsentForAlternativeVaccine
        )

        if (someWantInjectionOnly && someWantIntranasalOnly) {
          return ConsentStatus.Inconsistent
        }

        if (
          allWantInjection ||
          (someWantInjectionOnly && allAcceptAlternative)
        ) {
          return ConsentStatus.GivenForAlternativeInjection
        }

        return ConsentStatus.GivenForIntranasal
      }

      // For MMR programme, determine if any consent requested gelatine-free
      if (patientSession.session?.canOfferAlternativeVaccine) {
        if (
          replies.some(
            ({ hasConsentForAlternativeVaccine }) =>
              hasConsentForAlternativeVaccine
          )
        ) {
          return ConsentStatus.GivenForAlternativeInjection
        }
      }

      if (replies.every(({ hasGivenConsent }) => hasGivenConsent)) {
        return ConsentStatus.Given
      }
    }

    return ConsentStatus.Inconsistent
  }

  return ConsentStatus.NoResponse
}

/**
 * Get expanded description about consent status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {string} Consent status description
 */
export function getConsentStatusDescription(patientSession) {
  const relationships = filters.formatList(patientSession.parentalRelationships)
  const contactNames = filters.formatList(
    patientSession.contactsRequestingFollowUp
  )

  if (patientSession.patient?.isPost16) {
    return `${patientSession.patient.firstName} is old enough to self-consent.`
  }

  if (patientSession.patient?.hasNoContactDetails) {
    return 'There are no contact details for this child.'
  }

  if (patientSession.session?.consentWindow === ConsentWindow.Opening) {
    return patientSession.session?.formatted.consentWindowSentence
  }

  switch (patientSession.consent) {
    case ConsentStatus.NoResponse:
      return 'No-one responded to our requests for consent.'
    case ConsentStatus.NotDelivered:
      return 'Consent response could not be delivered.'
    case ConsentStatus.Inconsistent:
      return 'You can only vaccinate if all respondents give consent.'
    case ConsentStatus.Declined:
      return `${contactNames} would like to speak to a member of the team about other options for their child’s vaccination.`
    case ConsentStatus.Given:
    case ConsentStatus.GivenForAlternativeInjection:
    case ConsentStatus.GivenForIntranasal:
      return `${relationships} gave consent.`
    case ConsentStatus.Refused:
      return `${relationships} refused consent.`
    case ConsentStatus.FinalRefusal:
      return `Refusal to give consent confirmed by ${relationships}.`
    default:
  }
}

/**
 * @import { PatientSession, Reply, Session } from '../models.js'
 */
