import { faker } from '@faker-js/faker'

import { healthConditions } from '../datasets/health-conditions.js'
import {
  ConsentOutcome,
  ConsentVaccineCriteria,
  ProgrammeType,
  ReplyDecision,
  ReplyRefusal
} from '../enums.js'
import { Child } from '../models.js'

import { formatParentalRelationship } from './string.js'

/**
 * Add example answers to health questions
 *
 * @param {string} key - Health question key, i.e. aspirin
 * @param {string} healthCondition - Health condition
 * @returns {object} Health answer
 */
const enrichWithRealisticAnswer = (key, healthCondition) => {
  if (healthConditions[healthCondition][key]) {
    return {
      answer: 'Yes',
      details: healthConditions[healthCondition][key]
    }
  }

  return {
    answer: 'No'
  }
}

/**
 * Get consent responses with answers to health questions
 *
 * @param {Array<Reply>} replies - Consent responses
 * @returns {Array<Reply>} Consent responses with answers to health questions
 */
export function getRepliesWithHealthAnswers(replies) {
  replies = Array.isArray(replies) ? replies : [replies]

  return replies.filter(
    (reply) =>
      reply.healthAnswers &&
      Object.values(reply.healthAnswers).some((value) => value?.answer !== 'No')
  )
}

/**
 * Get combined answers to health questions
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {object|undefined} Combined answers to health questions
 */
export function getConsentHealthAnswers(patientSession) {
  const consentHealthAnswers = {}

  // Get consent responses with health answers
  const responsesWithHealthAnswers = Object.values(
    patientSession.responses
  ).filter((reply) => reply.healthAnswers)

  if (responsesWithHealthAnswers.length === 0) {
    return
  }

  for (const response of responsesWithHealthAnswers) {
    for (const [key, healthAnswer] of Object.entries(response.healthAnswers)) {
      if (!consentHealthAnswers[key]) {
        consentHealthAnswers[key] = []
      }

      // As we are not validating forms, handle cases where no answer given
      if (!healthAnswer.answer) {
        healthAnswer.answer = 'No'
      }

      const hasSingleResponse = responsesWithHealthAnswers.length === 1
      const hasSameAnswers = responsesWithHealthAnswers.every(
        (reply) => reply.healthAnswers[key]?.answer === healthAnswer.answer
      )
      const hasSameAnswersWithDetails = responsesWithHealthAnswers.some(
        (reply) =>
          reply.healthAnswers[key]?.details &&
          reply.healthAnswers[key]?.answer === healthAnswer.answer
      )

      // Don’t modify original health answer
      const thisHealthAnswer = { ...healthAnswer }
      thisHealthAnswer.relationship = formatParentalRelationship(
        response.contact
      )

      if (hasSingleResponse) {
        // Mum responded: Yes/No
        consentHealthAnswers[key].push(thisHealthAnswer)
      } else {
        if (hasSameAnswersWithDetails) {
          // Mum responded: Yes (Details)
          // Dad responded: Yes (Details)
          consentHealthAnswers[key].push(thisHealthAnswer)
        } else if (hasSameAnswers && consentHealthAnswers[key].length === 0) {
          // All responded: Yes/No
          thisHealthAnswer.relationship = 'All'
          consentHealthAnswers[key].push(thisHealthAnswer)
        }
      }
    }
  }

  return consentHealthAnswers
}

/**
 * Get consent outcome
 *
 * @param {Reply} reply - Reply
 * @param {Session} session - Session
 * @returns {ConsentOutcome} Consent outcome
 */
export const getConfirmedConsentOutcome = (reply, session) => {
  if (!reply.delivered) {
    return ConsentOutcome.NotDelivered
  }

  if (reply.decision === ReplyDecision.NoResponse) {
    return ConsentOutcome.NoResponse
  }

  if (reply.decision === ReplyDecision.Refused && reply.confirmed) {
    return ConsentOutcome.FinalRefusal
  }

  if (reply.refused) {
    return ConsentOutcome.Refused
  }

  if (reply.given) {
    if (
      session.canOfferAlternativeVaccine &&
      reply.decision === ReplyDecision.OnlyAlternativeInjection
    ) {
      return ConsentOutcome.GivenForAlternativeInjection
    }

    if (
      session.canOfferIntranasalVaccine &&
      reply.decision !== ReplyDecision.OnlyAlternativeInjection &&
      !reply.alternative
    ) {
      return ConsentOutcome.GivenForIntranasal
    }

    return ConsentOutcome.Given
  }

  return reply.decision
}

/**
 * Get consent outcome
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {ConsentOutcome} Consent outcome
 */
export const getConsentOutcome = (patientSession) => {
  // If patient is 16+, assume consent given
  if (patientSession.patient.isPost16) {
    return ConsentOutcome.Given
  }

  // Get valid replies
  const validReplies = Object.values(patientSession.replies).filter(
    ({ isInvalidated }) => !isInvalidated
  )

  // If no valid replies, no response
  if (validReplies.length === 0) {
    return ConsentOutcome.NoResponse
  }

  // If all valid replies were undelivered, request failed
  if (validReplies.every(({ delivered }) => !delivered)) {
    return ConsentOutcome.NotDelivered
  }

  // Get valid and delivered replies
  const replies = validReplies.filter(({ delivered }) => delivered)

  // If any reply is child self consenting, use child’s decision
  const childReply = replies.find((reply) => reply.hasSelfConsent)
  if (childReply) {
    return getConfirmedConsentOutcome(childReply, patientSession.session)
  }

  // If only one reply, use that decision
  if (replies.length === 1) {
    return getConfirmedConsentOutcome(replies[0], patientSession.session)
  }

  // If many replies, determine if responses are consistent or inconsistent
  if (replies.length > 1) {
    // If one of the replies is a confirmed refusal, consent is final refusal
    if (replies.find(({ refused, confirmed }) => refused && confirmed)) {
      return ConsentOutcome.FinalRefusal
    }

    // If one of the replies is a refusal, consent is refused
    if (replies.find(({ refused }) => refused)) {
      return ConsentOutcome.Refused
    }

    // If one of the replies has requested follow up, show this status
    // over showing inconsistent consent
    if (replies.find(({ declined }) => declined)) {
      return ConsentOutcome.Declined
    }

    // If consent given, determine which vaccine method has consent
    if (replies.every(({ given }) => given)) {
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
          ({ alternative }) => alternative
        )

        if (someWantInjectionOnly && someWantIntranasalOnly) {
          return ConsentOutcome.Inconsistent
        }

        if (
          allWantInjection ||
          (someWantInjectionOnly && allAcceptAlternative)
        ) {
          return ConsentOutcome.GivenForAlternativeInjection
        }

        return ConsentOutcome.GivenForIntranasal
      }

      // For MMR programme, determine if any consent requested gelatine-free
      if (patientSession.session?.canOfferAlternativeVaccine) {
        if (replies.some(({ alternative }) => alternative)) {
          return ConsentOutcome.GivenForAlternativeInjection
        }
      }

      if (replies.every(({ given }) => given)) {
        return ConsentOutcome.Given
      }
    }

    return ConsentOutcome.Inconsistent
  }

  return ConsentOutcome.NoResponse
}

/**
 * Get combined refusal reasons
 *
 * @param {PatientSession} patientSession - Patient session
 * @returns {Array<ReplyRefusal>} Refusal reasons
 */
export const getConsentRefusalReasons = (patientSession) => {
  const reasons = []

  // Get consent responses with a refusal reason
  const repliesWithRefusalReasons = Object.values(
    patientSession.replies
  ).filter((reply) => reply.refusalReason)

  for (const reply of repliesWithRefusalReasons) {
    if (reply.refusalReason && !reply.isInvalidated) {
      // Indicate confirmed refusal reason
      const refusalReason = reply.confirmed
        ? `${reply.refusalReason}<br><b>Confirmed</b>`
        : reply.refusalReason

      reasons.push(refusalReason)
    }
  }

  return reasons ? [...new Set(reasons)] : []
}

/**
 * Get faked answers for health questions needed for a vaccine
 *
 * @param {Vaccine} vaccine - Vaccine
 * @param {string} healthCondition - Health condition
 * @returns {object|undefined} Health answers
 */
export const getHealthAnswers = (vaccine, healthCondition) => {
  // If no vaccine, we don’t have consent
  if (!vaccine) {
    return
  }

  const answers = {}

  for (const key of Object.keys(vaccine.flatHealthQuestions)) {
    answers[key] = enrichWithRealisticAnswer(key, healthCondition)
  }

  // If asthma sub-question(s) has 'Yes’ answer, change contact answer to ‘Yes’
  if (
    [answers.asthmaSteroids?.answer, answers.asthmaAdmitted?.answer].includes(
      'Yes'
    )
  ) {
    answers.asthma.answer = 'Yes'
  }

  return answers
}

/**
 * Get faked triage note for health answer given for a child’s health condition
 *
 * @param {object} healthAnswers - Health answers
 * @param {string} healthCondition - Health condition
 * @returns {string|undefined} Triage note
 */
export const getTriageNote = (healthAnswers, healthCondition) => {
  if (countAnswersNeedingTriage(healthAnswers)) {
    return healthConditions[healthCondition].triageNote
  }
}

/**
 * Get child’s preferred names, based on information in consent replies
 *
 * @param {Array<Reply>} replies - Consent replies
 * @returns {string|boolean} Names(s)
 */
export const getPreferredNames = (replies) => {
  const names = new Set()

  Object.values(replies).forEach((reply) => {
    const child = new Child(reply.child)
    if (child.preferredName) {
      names.add(child.preferredName)
    }
  })

  return names.size && [...names].join(', ')
}

/**
 * Get valid refusal reasons for a programme
 *
 * @param {ProgrammeType} type - Programme type
 * @param {ReplyDecision} decision - Reply decision
 * @returns {string} Refusal reason
 */
export const getRefusalReason = (type, decision) => {
  // Gelatine content only a valid refusal reason for flu vaccine
  let refusalReasons = Object.values(ReplyRefusal).filter((value) =>
    type !== ProgrammeType.Flu ? value !== ReplyRefusal.Gelatine : value
  )

  // Gelatine content only a valid refusal reason for MMR vaccine
  refusalReasons = Object.values(ReplyRefusal).filter((value) =>
    type !== ProgrammeType.MMR ? value !== ReplyRefusal.GelatineMMR : value
  )

  // You cannot decline on the basis of already having had the vaccine
  if (decision === ReplyDecision.Declined) {
    refusalReasons = refusalReasons.filter(
      (value) =>
        ![
          ReplyRefusal.AlreadyVaccinated,
          ReplyRefusal.AlreadyVaccinatedMMR,
          ReplyRefusal.GettingElsewhere
        ].includes(value)
    )
  }

  return faker.helpers.arrayElement(refusalReasons)
}

/**
 * Has health answers needing triage
 *
 * @param {object} healthAnswers - Health answers
 * @returns {number} Number of health answers needing triage
 */
export const countAnswersNeedingTriage = (healthAnswers) => {
  if (!healthAnswers) {
    return 0
  }

  const ignoredKeys = new Set(['asthma'])

  return Object.entries(healthAnswers)
    .filter(([key]) => !ignoredKeys.has(key))
    .flatMap(([, answer]) => (Array.isArray(answer) ? answer : [answer]))
    .filter((answer) => answer.answer === 'Yes').length
}

/**
 * @import { PatientSession, Reply, Session, Vaccine } from '../models.js'
 */
