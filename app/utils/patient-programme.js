import filters from '@x-govuk/govuk-prototype-filters'

import {
  ConsentStatus,
  ConsentVaccineCriteria,
  ConsentWindow,
  ReplyDecision,
  ScreenStatus,
  VaccinationOutcome
} from '../enums.js'

import { getRepliesWithHealthAnswers } from './reply.js'

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
 * Get screening status (what was the triage decision)
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {ScreenStatus|boolean} Screening status
 */
export function getScreenStatus(patientSession) {
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
  const lastTriageNoteWithStatus = patientSession.triageNotes
    .filter((event) => event.status)
    .at(-1)

  if (responsesToTriage.length === 0) {
    // Triage completed without any ‘Yes’ answers to health questions
    if (lastTriageNoteWithStatus) {
      return lastTriageNoteWithStatus.status
    }

    // Clinic appointment without any answers to health questions
    if (!responses.length && patientSession.clinicAppointment) {
      return ScreenStatus.NeedsTriage
    }

    return false
  }

  // Triage needed or completed due to answers to health questions
  if (responsesToTriage.length > 0) {
    if (lastTriageNoteWithStatus) {
      return lastTriageNoteWithStatus.status
    }

    return ScreenStatus.NeedsTriage
  }

  return false
}

/**
 * Get expanded description about screen status
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {string} Screen status description
 */
export function getScreenStatusDescription(patientSession) {
  const triageNote = patientSession.triageNotes.at(-1)
  const user = triageNote?.createdBy || { fullName: 'Jane Joy' }
  const person = patientSession.patient.isPost16 ? 'child' : 'parent'

  switch (patientSession.screen) {
    case ScreenStatus.NeedsTriage:
      return patientSession.clinicAppointment
        ? `You need to review the health questions with the ${person} to decide if it’s safe to vaccinate ${patientSession.patient.firstName}.`
        : `You need to decide if it’s safe to vaccinate ${patientSession.patient.firstName}.`
    case ScreenStatus.InvitedToClinic:
      return `${user.fullName} decided that ${patientSession.patient.firstName}’s vaccination should take place at a clinic.`
    case ScreenStatus.DelayVaccination:
      return triageNote?.statusInvalidAt
        ? `${user.fullName} decided that ${patientSession.patient.firstName}’s vaccination should be delayed until ${triageNote.formatted.statusInvalidAt}.`
        : `${user.fullName} decided that ${patientSession.patient.firstName}’s vaccination should be delayed`
    case ScreenStatus.DoNotVaccinate:
      return `${user.fullName} decided that ${patientSession.patient.firstName} should not be vaccinated.`
    case ScreenStatus.Vaccinate:
      return `${user.fullName} decided that ${patientSession.patient.firstName} is safe to vaccinate.`
    case ScreenStatus.VaccinateAlternativeFluInjectionOnly:
      return `${user.fullName} decided that ${patientSession.patient.firstName} is safe to vaccinate using the injected vaccine only.`
    case ScreenStatus.VaccinateAlternativeMMRInjectionOnly:
      return `${user.fullName} decided that ${patientSession.patient.firstName} is safe to vaccinate using the gelatine-free injection only.`
    case ScreenStatus.VaccinateIntranasalOnly:
      return `${user.fullName} decided that ${patientSession.patient.firstName} is safe to vaccinate using the nasal spray only.`
    default:
      return `No triage is needed for ${patientSession.patient.firstName}.`
  }
}

/**
 * @import { PatientSession, Reply, Session } from '../models.js'
 */
