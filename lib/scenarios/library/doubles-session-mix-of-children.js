import {
  PatientStatus,
  ReplyDecision,
  SchoolTerm,
  SessionPresetName
} from '../../../app/enums.js'
import { defineScenario } from '../define-scenario.js'
import { createSchoolSession, pickSessionDateInTerm } from '../helpers.js'
import { populateSession, commonTriageDecisions } from '../populate-session.js'

// How many children are in the session
const childCount = 120

// Share (%) of children in each year group. Doubles is for Years 9 to 11, but
// nearly all children have them in Year 9
const yearGroupShares = [
  { yearGroup: 9, share: 96 },
  { yearGroup: 10, share: 2 },
  { yearGroup: 11, share: 2 }
]

// Share (%) of children with each programme status. Doubles are two vaccines
// given together, so children usually have the same status for both. The
// exception is some children due vaccination, who are due only one vaccine
// because their parent gave consent for only that one and refused the other
const statusShares = [
  {
    status: PatientStatus.Due,
    share: 60,
    variants: [
      // Due both MenACWY and Td/IPV
      { share: 95 },
      // Due only MenACWY
      {
        share: 3,
        programmeOverrides: {
          menacwy: { decision: ReplyDecision.OnlyMenACWY },
          'td-ipv': { decision: ReplyDecision.Refused }
        }
      },
      // Due only Td/IPV
      {
        share: 2,
        programmeOverrides: {
          menacwy: { decision: ReplyDecision.Refused },
          'td-ipv': { decision: ReplyDecision.OnlyTdIPV }
        }
      }
    ]
  },
  { status: PatientStatus.Triage, share: 3 },
  { status: PatientStatus.Vaccinated, share: 2 },
  { status: PatientStatus.Consent, share: 21 },
  { status: PatientStatus.Refused, share: 10 },
  { status: PatientStatus.Deferred, share: 4 }
]

// Neither of the programmes in doubles has a vaccine choice, so just record `Given`
const vaccineChoiceShares = [
  { share: 100, overrides: { decision: ReplyDecision.Given } }
]

// Children with a refusal, shared out in proportion to 12 children. 8 have
// consent refused (about 70%), 2 of whom have parents who disagree: one has
// given consent but the other refused, which the app treats as a refusal. 4
// (about 30%) have a follow-up requested
const refusalShares = [
  { share: 6, replies: [{ decision: ReplyDecision.Refused }] },
  {
    share: 2,
    replies: [
      { decision: ReplyDecision.Given, needsTriage: false },
      { decision: ReplyDecision.Refused }
    ]
  },
  { share: 4, replies: [{ decision: ReplyDecision.Declined }] }
]

// Share (%) of children who can’t be vaccinated for each reason. The session
// hasn’t happened yet, so these are all decisions made by a nurse during triage
const deferralShares = [
  { share: 50, triage: commonTriageDecisions.delay },
  { share: 30, triage: commonTriageDecisions.doNotVaccinate },
  { share: 20, triage: commonTriageDecisions.invitedToClinic }
]

export default defineScenario({
  name: 'Doubles session in summer term with a mix of children',
  description:
    `A Doubles (MenACWY and Td/IPV) session in the summer term, with ${childCount} children, ` +
    'nearly all in Year 9. Most are due both vaccines, but a few are due only one, because ' +
    'their parent gave consent for only that one. The rest need consent, need triage, have ' +
    'a refusal (for some, one parent consented and the other refused), can’t be vaccinated ' +
    '(because a nurse decided to delay, ' +
    'not vaccinate or offer a clinic) or were vaccinated elsewhere.',
  run(context, shared) {
    const { doublesSecondarySchool: school, nurse } = shared

    const session = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.Doubles,
      date: pickSessionDateInTerm(SchoolTerm.Summer)
    })

    populateSession(context, {
      school,
      session,
      nurse,
      childCount,
      yearGroupShares,
      statusShares,
      vaccineChoiceShares,
      refusalShares,
      deferralShares
    })

    return {
      startUrl: session.uri,
      links: [{ label: 'Children in session', href: `${session.uri}/patients` }]
    }
  }
})
