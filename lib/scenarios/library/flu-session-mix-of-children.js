import {
  PatientStatus,
  ReplyDecision,
  SessionPresetName,
  VaccinationOutcome
} from '../../../app/enums.js'
import {
  getCurrentAcademicYear,
  removeDays,
  setMidday,
  today
} from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'
import { createSchoolSession } from '../helpers.js'
import { populateSession, commonTriageDecisions } from '../populate-session.js'

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

// Share of children who have consent for each choice of vaccine (and the values needed to reflect that)
const vaccineChoiceShares = [
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

// Share (%) of children whose parent(s) refused, with each kind of refusal (including
// conflicting consent arising from nasal vs. IM preference)
const refusalShares = [
  { share: 40, replies: [{ decision: ReplyDecision.Refused }] },
  { share: 30, replies: [{ decision: ReplyDecision.Declined }] },
  {
    share: 30,
    replies: [
      {
        decision: ReplyDecision.Given,
        hasConsentForAlternativeVaccine: false,
        needsTriage: false
      },
      { decision: ReplyDecision.OnlyAlternativeInjection, needsTriage: false }
    ]
  }
]

// Share (%) of children who can’t be vaccinated for each reason. If the session
// is happening today, some of these happened in the session
const deferralShares = [
  { share: 20, triage: commonTriageDecisions.delay },
  { share: 15, triage: commonTriageDecisions.doNotVaccinate },
  { share: 15, triage: commonTriageDecisions.invitedToClinic },
  { share: 20, outcome: VaccinationOutcome.Absent },
  { share: 15, outcome: VaccinationOutcome.Unwell },
  { share: 15, outcome: VaccinationOutcome.Refused }
]

/**
 * Pick a date for the session in this academic year’s flu season, which ends
 * on 31 March (matching `PatientProgramme.eligibilityEndAt`). Default to today
 * if the season is still going
 *
 * @returns {Date} Session date
 */
function pickSessionDateInFluSeason() {
  const seasonEndsAt = setMidday(
    new Date(`${getCurrentAcademicYear() + 1}-03-31T00:00:00`)
  )

  let date = setMidday(today())
  if (date > seasonEndsAt) {
    date = seasonEndsAt

    // Not at weekends
    while ([0, 6].includes(date.getDay())) {
      date = removeDays(date, 1)
    }
  }

  return date
}

export default defineScenario({
  name: 'Flu session with a mix of children',
  description:
    `A flu session happening today (or at the end of the flu season, if that’s passed), with ` +
    `${childCount} children spread evenly across the year groups. Most are due vaccination. ` +
    'The rest need consent, need triage, have a refusal (incl. conflicting consent), can’t be ' +
    'vaccinated (for example they were absent from the session, or a nurse decided to delay) ' +
    'or were vaccinated elsewhere. Parents who gave consent mostly chose the nasal spray.',
  run(context, shared) {
    const { fluPrimarySchool: school, nurse } = shared

    const session = createSchoolSession(context, {
      school,
      nurse,
      presetName: SessionPresetName.Flu,
      date: pickSessionDateInFluSeason()
    })

    populateSession(context, {
      school,
      session,
      nurse,
      childCount,
      statusShares,
      vaccineChoiceShares,
      refusalShares,
      // Outcomes recorded in a session only work for a session happening today
      deferralShares: session.isActive
        ? deferralShares
        : deferralShares.filter(({ outcome }) => !outcome)
    })

    return {
      startUrl: session.uri,
      links: [{ label: 'Children in session', href: `${session.uri}/patients` }]
    }
  }
})
