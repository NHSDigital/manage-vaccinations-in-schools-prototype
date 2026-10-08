import {
  PatientStatus,
  ReplyDecision,
  SessionPresetName,
  VaccinationOutcome
} from '../../../app/enums.js'
import { setMidday, today } from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'
import { createSchoolSession } from '../helpers.js'
import { populateSession, triageDecisions } from '../populate-session.js'

// How many children are in the session
const childCount = 200

// Share (%) of children with each flu programme status
const statusShares = [
  { status: PatientStatus.Due, share: 70 },
  { status: PatientStatus.Triage, share: 6 },
  { status: PatientStatus.Vaccinated, share: 4 },
  { status: PatientStatus.Consent, share: 12 },
  { status: PatientStatus.Refused, share: 5 },
  { status: PatientStatus.Deferred, share: 3 }
]

// Share (%) of children who have consent given making each choice of vaccine
const consentChoiceShares = [
  {
    name: 'Nasal preferred',
    share: 70,
    overrides: {
      decision: ReplyDecision.Given,
      hasConsentForAlternativeVaccine: true
    }
  },
  {
    name: 'Nasal only',
    share: 20,
    overrides: {
      decision: ReplyDecision.Given,
      hasConsentForAlternativeVaccine: false
    }
  },
  {
    name: 'Injection only',
    share: 10,
    overrides: { decision: ReplyDecision.OnlyAlternativeInjection }
  }
]

// Share (%) of children whose parent refused with each kind of refusal
const refusalShares = [
  { decision: ReplyDecision.Refused, share: 60 },
  { decision: ReplyDecision.Declined, share: 40 }
]

// Share (%) of children who can’t be vaccinated for each reason. The session
// is happening today, so some of these happened in the session
const deferralShares = [
  { share: 20, triage: triageDecisions.delay },
  { share: 15, triage: triageDecisions.doNotVaccinate },
  { share: 15, triage: triageDecisions.invitedToClinic },
  { share: 20, outcome: VaccinationOutcome.Absent },
  { share: 15, outcome: VaccinationOutcome.Unwell },
  { share: 15, outcome: VaccinationOutcome.Refused }
]

export default defineScenario({
  name: 'Flu session today with a mix of children',
  description:
    `A flu session happening today, with ${childCount} children spread evenly across the ` +
    'year groups. Most are due vaccination. The rest need consent, need triage, have a ' +
    'refusal, can’t be vaccinated (for example they were absent today, or a nurse decided to ' +
    'delay) or were vaccinated elsewhere. Parents who gave consent mostly chose the nasal ' +
    'spray, but some chose nasal spray only, or the injection only.',
  run(context, shared) {
    const { fluPrimarySchool: school, nurse } = shared

    const session = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.Flu,
      date: setMidday(today())
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
