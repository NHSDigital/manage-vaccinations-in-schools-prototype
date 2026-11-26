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
  FluOnly: 'Flu only',
  NoFlu: 'No flu',
  FluAlongsideOtherProgrammes: 'Flu alongside other programmes'
}

/**
 * Each test case sets up a session whose programmes change which PSD options are offered,
 * or how they’re worded. A test case has either a `schoolKey`, for a school session, or a
 * `clinic_id`, for a clinic.
 *
 * Each session is set to use PSDs, so its edit page shows the wording for that choice.
 *
 * Cases are grouped by whether the session can vaccinate for flu, as that decides the
 * options: without flu, there’s no choice to make, so the question isn’t asked.
 */
const testCases = [
  {
    group: LinkGroup.FluOnly,
    label: 'Flu-only school session: nasal spray only',
    researchTags: [
      {
        tag: 'psds-and-vgd',
        label:
          '[2. PSD options depend on the session’s programmes] a. Flu-only session: 2 options, worded for flu'
      }
    ],
    schoolKey: 'fluPrimarySchool',
    presetName: SessionPresetName.Flu,
    psdUsage: PsdUsage.NasalFluOnly
  },
  {
    // Flu is one of the catch-ups, so the nasal spray option is offered
    group: LinkGroup.FluAlongsideOtherProgrammes,
    label: 'HPV clinic with catch-ups: all programmes and vaccine methods',
    researchTags: [
      {
        tag: 'psds-and-vgd',
        label:
          '[2. PSD options depend on the session’s programmes] b. HPV clinic with catch-ups: flu is a catch-up, so the flu nasal spray option is offered'
      }
    ],
    clinic_id: 'M86005', // Hillfields Health Centre
    presetName: SessionPresetName.HPV,
    canVaccinateForOtherProgrammes: true,
    psdUsage: PsdUsage.All
  },
  {
    group: LinkGroup.NoFlu,
    label: 'Doubles school session: all programmes',
    researchTags: [
      {
        tag: 'psds-and-vgd',
        label:
          '[2. PSD options depend on the session’s programmes] c. Td/IPV and MenACWY session: no flu, so HCAs aren’t asked which vaccinations they can give'
      }
    ],
    schoolKey: 'doublesSecondarySchool',
    presetName: SessionPresetName.Doubles,
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
        group: testCase.group,
        researchTags: testCase.researchTags
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
