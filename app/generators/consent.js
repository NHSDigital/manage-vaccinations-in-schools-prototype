import { fakerEN_GB as faker } from '@faker-js/faker'

import { healthConditions } from '../datasets/health-conditions.js'
import {
  ProgrammeType,
  ReplyDecision,
  ReplyMethod,
  ReplyRefusal,
  VaccineCriteria
} from '../enums.js'
import { Consent } from '../models.js'
import { removeDays, today } from '../utils/date.js'
import {
  getHealthAnswers,
  getRefusalReason,
  getTriageNote
} from '../utils/reply.js'

/**
 * Generate fake consent
 *
 * @param {PatientSession} patientSession - Patient session
 * @param {Contact} contact - Contact
 * @param {Date} [lastConsentCreatedAt] - Date previous consent response created
 * @returns {Consent|undefined} Consent
 */
export function generateConsent(patientSession, contact, lastConsentCreatedAt) {
  const child = patientSession.patient
  const programme = patientSession.programme
  const session = patientSession.session

  // Can’t create a consent response if no contact associated with child
  if (!contact) {
    return
  }

  // Can’t create a consent response if no contact details
  if (!contact.hasContactDetails) {
    return
  }

  // Decision
  const decision = faker.helpers.weightedArrayElement([
    { value: ReplyDecision.Given, weight: 10 },
    { value: ReplyDecision.Declined, weight: 1 },
    { value: ReplyDecision.Refused, weight: 1 },
    ...([ProgrammeType.Flu, ProgrammeType.MMR].includes(programme.type)
      ? [{ value: ReplyDecision.OnlyAlternativeInjection, weight: 2 }]
      : [])
  ])

  const isFluProgramme = programme.type === ProgrammeType.Flu

  // Has the contact given consent for alternative injected vaccine?
  const hasConsentForAlternativeVaccine =
    isFluProgramme && decision === ReplyDecision.Given
      ? faker.datatype.boolean(0.75)
      : false

  // Reply method
  const method = faker.helpers.weightedArrayElement([
    { value: ReplyMethod.Website, weight: 8 },
    { value: ReplyMethod.Phone, weight: 1 },
    { value: ReplyMethod.Paper, weight: 1 }
  ])

  let vaccineCriteria = VaccineCriteria.Injection
  if (isFluProgramme && decision !== ReplyDecision.OnlyAlternativeInjection) {
    vaccineCriteria = VaccineCriteria.Intranasal
  }

  const vaccine = programme.vaccines.find(
    ({ method }) => method === vaccineCriteria
  )

  const healthCondition = faker.helpers.objectKey(healthConditions)
  const healthAnswers = getHealthAnswers(vaccine, healthCondition)
  const triageNote = getTriageNote(healthAnswers, healthCondition)
  const refusalReason = getRefusalReason(programme.type, decision)

  // If decision is declined then a follow-up consultation was requested
  const hasRequestedConsultation =
    decision === ReplyDecision.Declined &&
    [
      ReplyRefusal.Medical,
      ReplyRefusal.Other,
      ReplyRefusal.OutsideSchool,
      ReplyRefusal.Personal
    ].includes(refusalReason)

  const nowAt = today()
  const sessionClosedBeforeToday =
    session.consentCloseAt.valueOf() < nowAt.valueOf()
  const consentWindowOpensAfterToday =
    session.consentOpenAt.valueOf() > nowAt.valueOf()

  // If session hasn’t opened yet, don’t generate a consent
  if (consentWindowOpensAfterToday) {
    return
  }

  const createdAt =
    lastConsentCreatedAt ||
    faker.date.between({
      from: session.consentOpenAt,
      to: sessionClosedBeforeToday ? session.consentCloseAt : nowAt
    })

  // Expire a portion of consent responses
  // Flu consent responses also expire, but this is handled in the `Reply` model
  const isExpiredConsent = !isFluProgramme && faker.datatype.boolean(0.25)

  return new Consent({
    createdAt: isExpiredConsent ? removeDays(createdAt, 250) : createdAt,
    child,
    decision,
    method,
    ...(decision === ReplyDecision.Given && {
      hasConsentForAlternativeVaccine
    }),
    ...([
      ReplyDecision.Given,
      ReplyDecision.OnlyAlternativeInjection,
      ReplyDecision.OnlyMenACWY,
      ReplyDecision.OnlyTdIPV
    ].includes(decision) && { healthAnswers, triageNote }),
    ...([ReplyDecision.Declined, ReplyDecision.Refused].includes(decision) && {
      refusalReason,
      ...(refusalReason === ReplyRefusal.AlreadyVaccinated && {
        refusalReasonDetails: 'My child had the vaccination at our GP surgery.'
      }),
      ...(refusalReason === ReplyRefusal.GettingElsewhere && {
        refusalReasonDetails:
          'My child is getting the vaccination at our GP surgery.'
      }),
      ...(refusalReason === ReplyRefusal.Medical && {
        refusalReasonDetails:
          'My child has recently had chemotherapy and her immune system needs time to recover.'
      }),
      ...(refusalReason === ReplyRefusal.OutsideSchool && {
        refusalReasonDetails:
          'My child gets anxious in situations where there are a lot of people.'
      }),
      ...(refusalReason === ReplyRefusal.Other && {
        refusalReasonOther: 'My family rejects vaccinations on principle.'
      }),
      hasRequestedConsultation
    }),
    contact_uuid: contact.uuid,
    programme_id: programme.id,
    session_id: session.id
  })
}

/**
 * @import { Contact, PatientSession } from '../models.js'
 */
