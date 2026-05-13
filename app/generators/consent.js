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
import { today } from '../utils/date.js'
import {
  getHealthAnswers,
  getRefusalReason,
  getTriageNote
} from '../utils/reply.js'

/**
 * Generate fake consent
 *
 * @param {import('../models.js').Programme} programme - Programme
 * @param {import('../models.js').Session} session - Session
 * @param {import('../models.js').PatientSession} patientSession - Patient session
 * @param {import('../models.js').Parent} parent - Parent
 * @param {Date} [lastConsentCreatedAt] - Date previous consent response created
 * @returns {Consent|undefined} Consent
 */
export function generateConsent(
  programme,
  session,
  patientSession,
  parent,
  lastConsentCreatedAt
) {
  // Child
  const child = patientSession.patient

  // Can’t create a consent response if no parent associated with child
  if (!parent) {
    return
  }

  // Can’t create a consent response if no contact details for parent
  if (!parent.email && !parent.tel) {
    return
  }

  // Decision
  const decision = faker.helpers.weightedArrayElement([
    { value: ReplyDecision.Given, weight: 10 },
    { value: ReplyDecision.Declined, weight: 3 },
    { value: ReplyDecision.Refused, weight: 1 },
    ...([ProgrammeType.Flu, ProgrammeType.MMR].includes(programme.type)
      ? [{ value: ReplyDecision.OnlyAlternativeInjection, weight: 2 }]
      : [])
  ])

  const isFluProgramme = programme.type === ProgrammeType.Flu

  // Has the parent given consent for alternative injected vaccine?
  const alternative =
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
  const consultation =
    decision === ReplyDecision.Declined &&
    [
      ReplyRefusal.Medical,
      ReplyRefusal.Other,
      ReplyRefusal.OutsideSchool,
      ReplyRefusal.Personal
    ].includes(refusalReason)

  const nowAt = today()
  const sessionClosedBeforeToday = session.closeAt.valueOf() < nowAt.valueOf()
  const sessionOpensAfterToday = session.openAt.valueOf() > nowAt.valueOf()

  // If session hasn’t opened yet, don’t generate a consent
  if (sessionOpensAfterToday) {
    return
  }

  return new Consent({
    createdAt:
      lastConsentCreatedAt ||
      faker.date.between({
        from: session.openAt,
        to: sessionClosedBeforeToday ? session.closeAt : nowAt
      }),
    child,
    parent,
    decision,
    method,
    ...(decision === ReplyDecision.Given && { alternative }),
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
      consultation
    }),
    parent_uuid: parent.uuid,
    programme_id: programme.id,
    session_id: session.id
  })
}
