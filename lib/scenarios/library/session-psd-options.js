import {
  ClinicType,
  PsdUsage,
  SessionConsentContacts,
  SessionPresetName
} from '../../../app/enums.js'
import { defineScenario } from '../define-scenario.js'
import {
  createClinicSession,
  createSchoolSession,
  pickSessionDate
} from '../helpers.js'

const LinkGroup = {
  OneProgramme: 'One programme',
  SeveralProgrammesWithoutFlu: 'Several programmes, without flu',
  SeveralProgrammesWithFlu: 'Several programmes, including flu'
}

/**
 * Each test case sets up a session whose programmes change which PSD options are offered,
 * or how they’re worded. A test case has either a `schoolKey`, for a school session, or a
 * `clinic_id`, for a clinic.
 *
 * Each session is set to use PSDs, so its edit page shows the wording for that choice.
 *
 * Cases are grouped by the programmes the session can vaccinate for, as that decides the
 * options: one programme, several without flu (so no nasal spray), or several including flu.
 */
const testCases = [
  {
    group: LinkGroup.OneProgramme,
    label: 'Flu-only school session: nasal spray only',
    schoolKey: 'fluPrimarySchool',
    presetName: SessionPresetName.Flu,
    psdUsage: PsdUsage.NasalFluOnly
  },
  {
    group: LinkGroup.OneProgramme,
    label: 'HPV school session: yes',
    schoolKey: 'hpvSecondarySchool',
    presetName: SessionPresetName.HPV,
    psdUsage: PsdUsage.All
  },
  {
    group: LinkGroup.SeveralProgrammesWithoutFlu,
    label: 'Doubles school session: all programmes',
    schoolKey: 'doublesSecondarySchool',
    presetName: SessionPresetName.Doubles,
    psdUsage: PsdUsage.All
  },
  {
    group: LinkGroup.SeveralProgrammesWithoutFlu,
    label: 'HPV and MMR(V) clinic without catch-ups: all programmes',
    clinic_id: 'M86045', // Paradise Medical Centre
    presetName: SessionPresetName.SpringCatchup,
    canVaccinateForOtherProgrammes: false,
    psdUsage: PsdUsage.All
  },
  {
    group: LinkGroup.SeveralProgrammesWithFlu,
    label: 'Flu and MMR(V) clinic without catch-ups: flu nasal spray only',
    clinic_id: 'M86014', // The Forum Health Centre
    presetName: SessionPresetName.AutumnCatchup,
    canVaccinateForOtherProgrammes: false,
    psdUsage: PsdUsage.NasalFluOnly
  },
  {
    // Flu is one of the catch-ups, so the nasal spray options are offered
    group: LinkGroup.SeveralProgrammesWithFlu,
    label: 'Doubles clinic with catch-ups: all programmes and vaccine methods',
    clinic_id: 'M86005', // Hillfields Health Centre
    presetName: SessionPresetName.Doubles,
    canVaccinateForOtherProgrammes: true,
    psdUsage: PsdUsage.All
  }
]

/**
 * Create the school session or clinic for a test case
 *
 * @param {object} context - Context
 * @param {SharedResources} shared - Shared resources
 * @param {object} testCase - Test case
 * @param {Date} date - Session date
 * @returns {Session} Session
 */
function createSessionForTestCase(context, shared, testCase, date) {
  if (testCase.schoolKey) {
    return createSchoolSession(context, {
      school: shared[testCase.schoolKey],
      nurse: shared.nurse,
      presetName: testCase.presetName,
      date,
      consentContacts: SessionConsentContacts.NonRefusers
    })
  }

  const session = createClinicSession(context, {
    clinic_id: testCase.clinic_id,
    nurse: shared.nurse,
    presetName: testCase.presetName,
    clinicType: ClinicType.DropIn,
    date
  })
  session.canVaccinateForOtherProgrammes =
    testCase.canVaccinateForOtherProgrammes
  return session
}

export default defineScenario({
  name: 'Session PSD options',
  description:
    'School sessions and clinics with different programmes, to show which PSD options are offered for each and how they’re worded. Each session is set to use PSDs, so its edit page shows the wording for that choice; change it to see all the options. None of the sessions have any children.',
  run(context, shared) {
    const links = testCases.map((testCase, index) => {
      const session = createSessionForTestCase(
        context,
        shared,
        testCase,
        pickSessionDate(50 + index)
      )
      session.psdUsage = testCase.psdUsage

      return {
        label: testCase.label,
        href: `${session.uri}/edit`,
        group: testCase.group
      }
    })

    return {
      startUrl: links[0].href,
      links
    }
  }
})

/**
 * @import { Session } from '../../../app/models.js'
 * @import { SharedResources } from '../types.js'
 */
