import {
  PatientStatus,
  ReplyDecision,
  SchoolTerm,
  SessionPresetName
} from '../../../app/enums.js'
import { defineScenario } from '../define-scenario.js'
import { createSchoolSession, pickSessionDateInTerm } from '../helpers.js'
import { populateSession, triageDecisions } from '../populate-session.js'

// How many children are in the session
const childCount = 300

// Share (%) of children with each HPV programme status
const statusShares = [
  { status: PatientStatus.Due, share: 70 },
  { status: PatientStatus.Triage, share: 6 },
  { status: PatientStatus.Vaccinated, share: 4 },
  { status: PatientStatus.Consent, share: 12 },
  { status: PatientStatus.Refused, share: 5 },
  { status: PatientStatus.Deferred, share: 3 }
]

// There is only one HPV vaccine, so every parent who gave consent made the same choice
const consentChoiceShares = [
  { share: 100, overrides: { decision: ReplyDecision.Given } }
]

// Share (%) of children whose parent refused with each kind of refusal
const refusalShares = [
  { decision: ReplyDecision.Refused, share: 60 },
  { decision: ReplyDecision.Declined, share: 40 }
]

// Share (%) of children who can’t be vaccinated for each reason. The session
// hasn’t happened yet, so these are all decisions made by a nurse during triage
const deferralShares = [
  { share: 50, triage: triageDecisions.delay },
  { share: 30, triage: triageDecisions.doNotVaccinate },
  { share: 20, triage: triageDecisions.invitedToClinic }
]

export default defineScenario({
  name: 'HPV session in spring term with a mix of children',
  description:
    `An HPV session in the spring term, with ${childCount} children spread evenly ` +
    'across the year groups. Most are due vaccination. The rest need consent, need triage, ' +
    'have a refusal, can’t be vaccinated (because a nurse decided to delay, not vaccinate or ' +
    'offer a clinic) or were vaccinated elsewhere.',
  run(context, shared) {
    const { hpvSecondarySchool: school, nurse } = shared

    const session = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.HPV,
      date: pickSessionDateInTerm(SchoolTerm.Spring)
    })

    populateSession(context, {
      school,
      session,
      nurse,
      childCount,
      statusShares,
      consentChoiceShares,
      refusalShares,
      deferralShares
    })

    return {
      startUrl: session.uri,
      links: [{ label: 'Children in session', href: `${session.uri}/patients` }]
    }
  }
})
