import filters from '@x-govuk/govuk-prototype-filters'
import { isBefore, isSameDay } from 'date-fns'

import {
  ConsentRequestReason,
  ConsentStatus,
  ConsentVaccineCriteria,
  ConsentWindow,
  InstructionStatus,
  PatientConsentStatus,
  PatientDeferredStatus,
  PatientRefusedStatus,
  PatientStatus,
  PatientTriageStatus,
  PatientVaccinatedStatus,
  ReplyDecision,
  ScreenStatus,
  SessionConsentContacts,
  SessionType,
  VaccinationOutcome,
  VaccineCriteria
} from '../enums.js'

import { formatDate, getDateValueDifference, today } from './date.js'
import i18n from './i18n.js'
import { getRepliesWithHealthAnswers } from './reply.js'

/**
 * Get only the latest response from each respondent, as a newer response
 * supersedes an older one from the same person
 *
 * @param {Array<Reply>} replies - Responses, newest first
 * @returns {Array<Reply>} Latest response from each respondent, newest first
 */
export function getLatestReplyFromEachRespondent(replies) {
  const latestReplyByRespondent = new Map()

  for (const reply of replies ?? []) {
    // Responses are newest first, so keep the first for each respondent
    if (!latestReplyByRespondent.has(reply.respondent)) {
      latestReplyByRespondent.set(reply.respondent, reply)
    }
  }

  return [...latestReplyByRespondent.values()]
}

/**
 * Get confirmed consent status
 *
 * @param {Reply} reply - Reply
 * @param {Programme} programme - Programme the reply is for
 * @returns {ConsentStatus} Confirmed consent status
 */
export function getConfirmedConsentStatus(reply, programme) {
  if (!reply.isDelivered) {
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
      programme?.hasIntranasalVaccine &&
      reply.decision === ReplyDecision.OnlyAlternativeInjection
    ) {
      return ConsentStatus.GivenForAlternativeInjection
    }

    if (reply.hasConsentForGelatineFreeVaccineOnly) {
      return ConsentStatus.GivenForAlternativeInjection
    }

    if (
      programme?.hasIntranasalVaccine &&
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
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {ConsentStatus} Consent status
 */
export function getConsentStatus(patientProgramme) {
  const { programme } = patientProgramme

  // If patient is 16+, assume consent given
  if (patientProgramme.patient.isPost16) {
    return ConsentStatus.Given
  }

  // Get valid replies
  const validReplies = Object.values(patientProgramme.validReplies)

  // If no valid replies, no response
  if (validReplies.length === 0) {
    return ConsentStatus.NoResponse
  }

  // If all valid replies were undelivered, request failed
  if (validReplies.every(({ isDelivered }) => !isDelivered)) {
    return ConsentStatus.NotDelivered
  }

  const replies = patientProgramme.repliesCountingTowardsConsent

  // If no-one has given a decision, no response
  if (replies.length === 0) {
    return ConsentStatus.NoResponse
  }

  // If any reply is child self consenting, use child’s decision
  const childReply = replies.find((reply) => reply.hasSelfConsent)
  if (childReply) {
    return getConfirmedConsentStatus(childReply, programme)
  }

  // If only one reply, use that decision
  if (replies.length === 1) {
    return getConfirmedConsentStatus(replies[0], programme)
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
      // For flu programme, determine which methods every response allows
      if (programme?.hasIntranasalVaccine) {
        const someWantInjectionOnly = replies.some(
          ({ vaccineCriteria }) =>
            vaccineCriteria ===
            ConsentVaccineCriteria.AlternativeFluInjectionOnly
        )
        const someWantIntranasalOnly = replies.some(
          ({ vaccineCriteria }) =>
            vaccineCriteria === ConsentVaccineCriteria.IntranasalOnly
        )

        if (someWantInjectionOnly && someWantIntranasalOnly) {
          return ConsentStatus.Inconsistent
        }

        // Any other responses prefer the nasal spray but also accept the
        // injection, so the injection is the only method everyone allows
        if (someWantInjectionOnly) {
          return ConsentStatus.GivenForAlternativeInjection
        }

        if (someWantIntranasalOnly) {
          return ConsentStatus.GivenForIntranasal
        }

        // Every response prefers the nasal spray but also accepts the injection
        return ConsentStatus.Given
      }

      // For MMR programme, determine if any consent requested gelatine-free
      if (programme?.alternativeVaccine) {
        if (
          replies.some(
            ({ hasConsentForGelatineFreeVaccineOnly }) =>
              hasConsentForGelatineFreeVaccineOnly
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
 * Describe the most recent expiry of consent, and whose consent it was
 *
 * @param {Array<Reply>} expiredReplies - Expired responses, earliest expiry first
 * @returns {string|undefined} Expired consent description, if any have expired
 */
function getExpiredConsentDescription(expiredReplies) {
  if (!expiredReplies?.length) {
    return undefined
  }

  const getRespondent = (reply) =>
    reply.fullNameAndRelationship || 'parent or guardian'
  const getExpiryDate = (reply) =>
    formatDate(reply.expiresAt, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

  // Only mention consent that expired most recently, as older expiries don’t
  // help the user. More than one respondent’s consent can expire that day
  const latestExpiryDate = getExpiryDate(expiredReplies.at(-1))
  const latestExpiredReplies = expiredReplies.filter(
    (reply) => getExpiryDate(reply) === latestExpiryDate
  )
  const respondents = filters.formatList(
    latestExpiredReplies.map(getRespondent)
  )

  return `Consent from ${respondents} expired on ${latestExpiryDate}.`
}

/**
 * Get a note about when a response’s health answers expire, if they expire
 * before the session or soon
 *
 * @param {Reply} reply - Response with health answers
 * @param {Session} [session] - Session the answers are being looked at for
 * @returns {string} Expiry note, or an empty string if there’s nothing to note
 */
function getHealthAnswersExpiryNote(reply, session) {
  const expiresBeforeSession =
    reply.expiresAt && session?.date ? reply.expiresAt < session.date : false

  // Expiring before the session matters more than expiring soon
  if (expiresBeforeSession) {
    return ' (expiring before the session)'
  }

  if (reply.isExpiringSoon) {
    return ' (expiring soon)'
  }

  return ''
}

/**
 * Describe who gave answers to health questions, and when
 *
 * @param {Array<Reply>} replies - Responses that count towards consent
 * @param {Session} [session] - Session the answers are being looked at for
 * @returns {string|undefined} Health answers description (Markdown), if any
 *   were given
 */
export function getHealthAnswersDescription(replies, session) {
  const answers = (replies ?? [])
    .filter((reply) => reply.healthAnswers)
    .map((reply) => ({
      respondent: reply.fullNameAndRelationship,
      answeredAt: reply.createdAt,
      expiryNotice: getHealthAnswersExpiryNote(reply, session)
    }))
    .sort((a, b) => getDateValueDifference(b.answeredAt, a.answeredAt))
  if (!answers.length) {
    return undefined
  }

  const answeredBy = answers.map(({ respondent, answeredAt, expiryNotice }) => {
    const answeredOn = formatDate(answeredAt, {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    return `${respondent || 'parent or guardian'} on ${answeredOn}${expiryNotice}`
  })

  if (answeredBy.length === 1) {
    return `Answers given by ${answeredBy[0]}.`
  }

  // List several respondents as bullets (Markdown), so they’re easier to scan
  const answeredByList = answeredBy
    .map((respondentAndDate) => `- ${respondentAndDate}`)
    .join('\n')

  return `Answers given by:\n\n${answeredByList}`
}

/**
 * Get expanded description about consent status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {string} Consent status description
 */
export function getConsentStatusDescription(patientProgramme) {
  const session = patientProgramme.lastPatientSession?.session
  const replies = patientProgramme.repliesCountingTowardsConsent ?? []
  const relationshipsOf = (repliesToName) =>
    filters.formatList(
      repliesToName.map((reply) => reply.relationship || 'Parent or guardian')
    )
  const givers = replies.filter((reply) => reply.hasGivenConsent)
  const refusers = replies.filter((reply) => reply.hasRefusedConsent)
  const confirmedRefusers = refusers.filter(
    (reply) => reply.hasConfirmedRefusal
  )
  const contactNames = filters.formatList(
    patientProgramme.contactsRequestingFollowUp
  )

  if (patientProgramme.patient?.isPost16) {
    return `${patientProgramme.patient.firstName} is old enough to self-consent.`
  }

  if (!patientProgramme.patient?.hasContactDetails) {
    return 'There are no contact details for this child.'
  }

  if (session?.consentWindow === ConsentWindow.Opening) {
    return session?.formatted.consentWindowSentence
  }

  switch (patientProgramme.consent) {
    case ConsentStatus.NoResponse:
      return (
        getExpiredConsentDescription(patientProgramme.expiredReplies) ||
        'No-one responded to our requests for consent.'
      )
    case ConsentStatus.NotDelivered:
      return 'Consent response could not be delivered.'
    case ConsentStatus.Inconsistent:
      return 'You can only vaccinate if all respondents give consent.'
    case ConsentStatus.Declined:
      return `${contactNames} would like to speak to a member of the team about other options for their child’s vaccination.`
    case ConsentStatus.Given:
    case ConsentStatus.GivenForAlternativeInjection:
    case ConsentStatus.GivenForIntranasal:
      return `${relationshipsOf(givers)} gave consent.`
    case ConsentStatus.Refused:
      return `${relationshipsOf(refusers)} refused consent.`
    case ConsentStatus.FinalRefusal:
      return `Refusal to give consent confirmed by ${relationshipsOf(confirmedRefusers)}.`
    default:
  }
}

/**
 * @typedef {object} ConsentRequestNeeds
 * @property {boolean} shouldRequest - Whether consent should be requested
 * @property {ConsentRequestReason} reason - Why it should (or shouldn’t) be
 */

/**
 * Should consent be requested from the child’s parents for a school session,
 * and why (or why not)?
 *
 * Requests go out when the session’s consent window opens, so this is decided
 * on what was known then. Responses since, including replies to the request
 * itself, don’t change it. Consent should be requested if:
 * - no responses gave consent
 * - every response giving consent expires before the session
 * - there’s a refusal, and the session requests consent from children who
 *   have one
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @param {Session} session - School session
 * @returns {ConsentRequestNeeds|undefined} Decision, or nothing if it’s not
 *   a school session
 */
export function getConsentRequestNeeds(patientProgramme, session) {
  if (session?.type !== SessionType.School) {
    return
  }

  const requestedAt = session.consentOpenAt

  if (patientProgramme.patient?.isPost16) {
    return {
      shouldRequest: false,
      reason: ConsentRequestReason.SelfConsent
    }
  }

  const wasVaccinatedBeforeRequest =
    patientProgramme.isVaccinated &&
    patientProgramme.vaccinationsGiven.some((vaccination) =>
      isBefore(vaccination.createdAt, requestedAt)
    )
  const repliesBeforeRequest =
    patientProgramme.getRepliesCountingTowardsConsentAt(requestedAt)
  const wasReportedAsAlreadyVaccinated = repliesBeforeRequest.some(
    ({ decision }) => decision === ReplyDecision.AlreadyVaccinated
  )
  if (wasVaccinatedBeforeRequest || wasReportedAsAlreadyVaccinated) {
    return {
      shouldRequest: false,
      reason: ConsentRequestReason.AlreadyVaccinated
    }
  }

  const hasRefusal = repliesBeforeRequest.some(
    (reply) => reply.hasRefusedConsent || reply.hasDeclinedConsent
  )
  if (hasRefusal) {
    return session.consentContacts === SessionConsentContacts.All
      ? {
          shouldRequest: true,
          reason: ConsentRequestReason.SessionContactsRefusals
        }
      : { shouldRequest: false, reason: ConsentRequestReason.Refused }
  }

  const repliesGivingConsent = repliesBeforeRequest.filter(
    (reply) => reply.hasGivenConsent
  )
  if (repliesGivingConsent.length === 0) {
    return { shouldRequest: true, reason: ConsentRequestReason.NoConsent }
  }

  const doesConsentLastUntilSession =
    session.date === undefined ||
    repliesGivingConsent.some(
      (reply) => !isBefore(reply.expiresAt, session.date)
    )

  return doesConsentLastUntilSession
    ? {
        shouldRequest: false,
        reason: ConsentRequestReason.ConsentLastsUntilSession
      }
    : {
        shouldRequest: true,
        reason: ConsentRequestReason.ConsentExpiresBeforeSession
      }
}

/**
 * Get the key of a consent request reason, as used to look up its text
 *
 * @param {ConsentRequestReason} reason - Consent request reason
 * @returns {string} Key, for example `ConsentLastsUntilSession`
 */
function getConsentRequestReasonKey(reason) {
  return Object.keys(ConsentRequestReason).find(
    (key) => ConsentRequestReason[key] === reason
  )
}

/**
 * Describe whether consent requests and reminders for a school session will be
 * (or were) sent, and to whom
 *
 * Reminders are only mentioned once requests have gone out, and contacts who
 * respond to the request aren’t reminded
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @param {Session} session - School session
 * @returns {string|undefined} Description (Markdown), or nothing if it’s not a
 *   school session
 */
export function getConsentRequestDescription(patientProgramme, session) {
  const { __ } = i18n

  const consentRequest = getConsentRequestNeeds(patientProgramme, session)
  if (!consentRequest) {
    return
  }

  const requestTense = session.areConsentRequestsSent ? 'sent' : 'upcoming'
  const reminderTense = session.areConsentRemindersSent ? 'sent' : 'upcoming'

  if (!consentRequest.shouldRequest) {
    const reasonKey = getConsentRequestReasonKey(consentRequest.reason)

    return __(
      `patientSession.consentRequests.notRequested.${reasonKey}.${requestTense}`
    )
  }

  const contactsToRequestFrom = (patientProgramme.patient?.contacts ?? [])
    .filter((contact) => contact.hasContactDetails)
    .map((contact) => contact.fullNameAndRelationship)
  if (contactsToRequestFrom.length === 0) {
    return __('patientSession.consentRequests.noContacts')
  }

  const paragraphs = []

  if (consentRequest.reason === ConsentRequestReason.SessionContactsRefusals) {
    paragraphs.push(
      __(`patientSession.consentRequests.refusalIncluded.${requestTense}`)
    )
  }

  paragraphs.push(
    __(`patientSession.consentRequests.requested.${requestTense}`, {
      date: session.formatted.consentOpenAt
    }),
    contactsToRequestFrom.map((contact) => `- ${contact}`).join('\n')
  )

  // Reminders can’t have gone out before the request
  if (session.areConsentRequestsSent) {
    const hasRespondedToRequest = patientProgramme.hasReplyBetween(
      session.consentOpenAt,
      session.nextReminderDate
    )

    paragraphs.push(
      hasRespondedToRequest
        ? __(`patientSession.consentRequests.noReminder.${reminderTense}`)
        : __(`patientSession.consentRequests.reminder.${reminderTense}`, {
            date: session.formatted.nextReminderDate
          })
    )
  }

  return paragraphs.join('\n\n')
}

/**
 * Has consent been given without any answers to health questions?
 *
 * For example, in a clinic booking transferred from another system. Children
 * aged 16 or over don’t count, as their consent is assumed without a response
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {boolean} Consent given without any answers to health questions
 */
function hasConsentWithoutHealthAnswers(patientProgramme) {
  const responsesGivingConsent =
    patientProgramme.repliesCountingTowardsConsent.filter(
      (reply) => reply.hasGivenConsent
    )

  return (
    responsesGivingConsent.length > 0 && !patientProgramme.consentHealthAnswers
  )
}

/**
 * Get screen status (what was the triage decision)
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {ScreenStatus|boolean} Screen status
 */
export function getScreenStatus(patientProgramme) {
  // No consent given, so cannot triage yet
  if (!patientProgramme.consentGiven) {
    return false
  }

  // Triage occurred during a previous vaccination session
  if (patientProgramme.lastVaccinationOutcome) {
    if (
      patientProgramme.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.InvitedToClinic
    ) {
      return ScreenStatus.InvitedToClinic
    }

    if (
      patientProgramme.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.DelayVaccination
    ) {
      return ScreenStatus.DelayVaccination
    }

    if (
      patientProgramme.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.DoNotVaccinate
    ) {
      return ScreenStatus.DoNotVaccinate
    }
  }

  const responses = patientProgramme.repliesCountingTowardsConsent
  const responsesToTriage = getRepliesWithHealthAnswers(responses)
  const lastTriageNoteWithStatus = patientProgramme.triageNotes
    .filter((event) => event.status)
    .at(-1)

  if (responsesToTriage.length === 0) {
    // Triage completed without any ‘Yes’ answers to health questions
    if (lastTriageNoteWithStatus) {
      return lastTriageNoteWithStatus.status
    }

    // Consent given without any answers to health questions
    if (hasConsentWithoutHealthAnswers(patientProgramme)) {
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
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {string} Screen status description
 */
export function getScreenStatusDescription(patientProgramme) {
  const triageNote = patientProgramme.triageNotes.at(-1)
  const user = triageNote?.createdBy || { fullName: 'Jane Joy' }
  const person = patientProgramme.patient.isPost16 ? 'child' : 'parent'

  // Without consent, there are no current health answers to triage
  if (!patientProgramme.consentGiven) {
    return `${patientProgramme.patient.firstName} can be triaged once consent has been given.`
  }

  switch (patientProgramme.screen) {
    case ScreenStatus.NeedsTriage:
      return hasConsentWithoutHealthAnswers(patientProgramme)
        ? `You need to review the health questions with the ${person} to decide if it’s safe to vaccinate ${patientProgramme.patient.firstName}.`
        : `You need to decide if it’s safe to vaccinate ${patientProgramme.patient.firstName}.`
    case ScreenStatus.InvitedToClinic:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName}’s vaccination should take place at a clinic.`
    case ScreenStatus.DelayVaccination:
      return triageNote?.statusInvalidAt
        ? `${user.fullName} decided that ${patientProgramme.patient.firstName}’s vaccination should be delayed until ${triageNote.formatted.statusInvalidAt}.`
        : `${user.fullName} decided that ${patientProgramme.patient.firstName}’s vaccination should be delayed`
    case ScreenStatus.DoNotVaccinate:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} should not be vaccinated.`
    case ScreenStatus.Vaccinate:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} is safe to vaccinate.`
    case ScreenStatus.VaccinateAlternativeFluInjectionOnly:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} is safe to vaccinate using the injected vaccine only.`
    case ScreenStatus.VaccinateAlternativeMMRInjectionOnly:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} is safe to vaccinate using the gelatine-free injection only.`
    case ScreenStatus.VaccinateIntranasalOnly:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} is safe to vaccinate using the nasal spray only.`
    default:
      return `No triage is needed for ${patientProgramme.patient.firstName}.`
  }
}

/**
 * Get instruction status for nasal spray
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {InstructionStatus|undefined} Instruction status
 */
export function getInstructionStatus(patientProgramme) {
  if (!patientProgramme.vaccine) {
    return
  }

  if (patientProgramme.vaccine.criteria === VaccineCriteria.Intranasal) {
    return patientProgramme.instruction
      ? InstructionStatus.Given
      : InstructionStatus.Needed
  }

  return
}

/**
 * Get vaccination (session) outcome
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {VaccinationOutcome|undefined} Vaccination (session) outcome
 */
export function getVaccinationOutcome(patientProgramme) {
  if (patientProgramme.lastVaccinationOutcome) {
    return patientProgramme.lastVaccinationOutcome.outcome
  } else if (
    [ConsentStatus.Refused, ConsentStatus.FinalRefusal].includes(
      patientProgramme.consent
    )
  ) {
    return VaccinationOutcome.ConsentRefused
  } else if (patientProgramme.screen === ScreenStatus.InvitedToClinic) {
    return VaccinationOutcome.InvitedToClinic
  } else if (patientProgramme.screen === ScreenStatus.DelayVaccination) {
    return VaccinationOutcome.DelayVaccination
  } else if (patientProgramme.screen === ScreenStatus.DoNotVaccinate) {
    return VaccinationOutcome.DoNotVaccinate
  }
}

/**
 * Get patient status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientStatus} Overall patient status
 */
export function getPatientStatus(patientProgramme) {
  // Not eligible for any school-age vaccination or this programme
  if (
    patientProgramme.patient.hasAgedOutOfProgrammes ||
    patientProgramme.isNotEligibleYet
  ) {
    return PatientStatus.Ineligible
  }

  // Is fully vaccinated
  if (patientProgramme.dosesRemaining === 0) {
    return PatientStatus.Vaccinated
  }

  // Is no longer eligible for this programme
  if (patientProgramme.isNoLongerEligible) {
    return PatientStatus.Ineligible
  }

  // Has vaccination outcome
  if (patientProgramme.vaccinationOutcomes?.length > 0) {
    switch (patientProgramme.outcome) {
      case VaccinationOutcome.Vaccinated:
      case VaccinationOutcome.AlreadyVaccinated:
        return PatientStatus.Vaccinated

      case VaccinationOutcome.Absent:
      case VaccinationOutcome.Refused:
      case VaccinationOutcome.Unwell:
        if (
          isSameDay(patientProgramme.lastVaccinationOutcome?.createdAt, today())
        ) {
          // ‘Could not vaccinate’ only applies on the day it was recorded
          return PatientStatus.Deferred
        }
    }
  }

  // Has screening status
  switch (patientProgramme.screen) {
    case ScreenStatus.DelayVaccination:
    case ScreenStatus.InvitedToClinic:
    case ScreenStatus.DoNotVaccinate:
      return PatientStatus.Deferred

    case ScreenStatus.Vaccinate:
    case ScreenStatus.VaccinateAlternativeFluInjectionOnly:
    case ScreenStatus.VaccinateAlternativeMMRInjectionOnly:
    case ScreenStatus.VaccinateIntranasalOnly:
      return PatientStatus.Due

    case ScreenStatus.NeedsTriage:
      return PatientStatus.Triage
  }

  // Has consent status
  if (patientProgramme.consentGiven) {
    return PatientStatus.Due
  }

  switch (patientProgramme.consent) {
    case ConsentStatus.Declined:
    case ConsentStatus.Inconsistent:
    case ConsentStatus.Refused:
    case ConsentStatus.FinalRefusal:
      return PatientStatus.Refused

    default:
      return PatientStatus.Consent
  }
}

/**
 * Get expanded description about patient status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {string|undefined} Patient status description
 */
export function getPatientStatusDescription(patientProgramme) {
  switch (patientProgramme.status) {
    case PatientStatus.Ineligible:
      return patientProgramme?.ineligibilityDescription
    case PatientStatus.Vaccinated: {
      const vaccination = patientProgramme.lastVaccinationOutcome

      // Vaccinations from other sources (such as GP records or uploads)
      // weren’t recorded by anyone using Mavis
      return vaccination.createdBy
        ? `${patientProgramme.patient?.firstName} was vaccinated by ${vaccination.createdBy.fullName} on ${vaccination.formatted.createdAt}.`
        : `${patientProgramme.patient?.firstName} was vaccinated on ${vaccination.formatted.administeredAt_date}.`
    }
    case PatientStatus.Due:
      return patientProgramme.vaccineCriteria
        ? `${patientProgramme.patient?.firstName} is ready to vaccinate (${patientProgramme.vaccineCriteria.toLowerCase()}).`
        : `${patientProgramme.patient?.firstName} is ready to vaccinate.`
    case PatientStatus.Deferred:
      return patientProgramme.deferredDescription
    case PatientStatus.Triage:
      return patientProgramme.screenDescription
    case PatientStatus.Refused:
    case PatientStatus.Consent:
      // Don’t show full consent description as it’s shown directly below
      return `${patientProgramme.patientConsent}.`
  }
}

/**
 * Get patient consent status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientConsentStatus|undefined} Patient consent status
 */
export function getPatientConsentStatus(patientProgramme) {
  if (patientProgramme.patient?.isPost16) {
    return PatientConsentStatus.SelfConsent
  }

  if (!patientProgramme.patient?.hasContactDetails) {
    return PatientConsentStatus.NoDetails
  }

  // Only school sessions have a consent window
  const session = patientProgramme.lastPatientSession?.session
  if (session?.school_id) {
    if (session?.consentWindow === ConsentWindow.None) {
      return PatientConsentStatus.NotScheduled
    } else if (session?.consentWindow === ConsentWindow.Opening) {
      return PatientConsentStatus.Scheduled
    }
  }

  switch (patientProgramme.consent) {
    case ConsentStatus.NotDelivered:
      return PatientConsentStatus.NotDelivered
    case ConsentStatus.NoResponse:
      return PatientConsentStatus.NoResponse
    case ConsentStatus.Declined:
      return PatientRefusedStatus.FollowUp
    case ConsentStatus.Inconsistent:
      return PatientRefusedStatus.Conflict
    case ConsentStatus.Refused:
      return PatientRefusedStatus.Refusal
  }
}

/**
 * Get patient triage status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientTriageStatus|undefined} Patient triage status
 */
export function getPatientTriageStatus(patientProgramme) {
  const responses = patientProgramme.repliesCountingTowardsConsent
  const responsesToTriage = getRepliesWithHealthAnswers(responses)

  if (patientProgramme.screen === ScreenStatus.NeedsTriage) {
    if (responsesToTriage.length > 0) {
      return PatientTriageStatus.Responses
    } else if (hasConsentWithoutHealthAnswers(patientProgramme)) {
      return PatientTriageStatus.Consultation
    }
  }
}

/**
 * Get patient deferred status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientDeferredStatus|undefined} Patient deferred status
 */
export function getPatientDeferredStatus(patientProgramme) {
  if (patientProgramme.screen === ScreenStatus.DoNotVaccinate) {
    return PatientDeferredStatus.DoNotVaccinate
  } else if (patientProgramme.screen === ScreenStatus.DelayVaccination) {
    return PatientDeferredStatus.DelayVaccination
  } else if (patientProgramme.screen === ScreenStatus.InvitedToClinic) {
    return PatientDeferredStatus.InvitedToClinic
  }

  switch (patientProgramme.outcome) {
    case VaccinationOutcome.Absent:
      return PatientDeferredStatus.ChildAbsent
    case VaccinationOutcome.Refused:
      return PatientDeferredStatus.ChildRefused
    case VaccinationOutcome.Unwell:
      return PatientDeferredStatus.ChildUnwell
    case VaccinationOutcome.InvitedToClinic:
      return PatientDeferredStatus.InvitedToClinic
    case VaccinationOutcome.DelayVaccination:
      return PatientDeferredStatus.DelayVaccination
    case VaccinationOutcome.DoNotVaccinate:
      return PatientDeferredStatus.DoNotVaccinate
  }
}

/**
 * Get expanded description about deferred status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {string} Deferred description
 */
export function getPatientDeferredDescription(patientProgramme) {
  switch (patientProgramme.patientDeferred) {
    case PatientDeferredStatus.ChildAbsent:
    case PatientDeferredStatus.ChildRefused:
    case PatientDeferredStatus.ChildUnwell:
      return `${patientProgramme.patientDeferred} on ${patientProgramme.lastVaccinationOutcome?.formatted.createdAt}.`
    case PatientDeferredStatus.InvitedToClinic:
    case PatientDeferredStatus.DelayVaccination:
    case PatientDeferredStatus.DoNotVaccinate:
      return patientProgramme.screenDescription
    default:
      return patientProgramme.patientDeferred
  }
}

/**
 * Get patient refused status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientRefusedStatus|undefined} Patient refused status
 */
export function getPatientRefusedStatus(patientProgramme) {
  switch (patientProgramme.consent) {
    case ConsentStatus.Inconsistent:
      return PatientRefusedStatus.Conflict
    case ConsentStatus.Declined:
      return PatientRefusedStatus.FollowUp
    case ConsentStatus.Refused:
    case ConsentStatus.FinalRefusal:
      return PatientRefusedStatus.Refusal
  }
}

/**
 * Get patient vaccinated status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientVaccinatedStatus|undefined} Patient vaccinated status
 */
export function getPatientVaccinatedStatus(patientProgramme) {
  switch (patientProgramme.outcome) {
    case VaccinationOutcome.Vaccinated:
    case VaccinationOutcome.PartVaccinated:
      return PatientVaccinatedStatus.Vaccinated
    case VaccinationOutcome.AlreadyVaccinated:
      return PatientVaccinatedStatus.AlreadyVaccinated
  }
}

/**
 * @import { PatientProgramme, Programme, Reply, Session } from '../models.js'
 */
