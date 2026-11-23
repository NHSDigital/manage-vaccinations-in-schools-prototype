import {
  ClinicType,
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
  VgdOnly: 'VGD only',
  PgdOnly: 'PGD only',
  Mix: 'Mix of VGD and PGD'
}

/**
 * Each test case sets which programmes nurses and HCAs give under a VGD, to show one of the
 * ways the protocol rows can be summarised. A test case has either a `schoolKey`, for a
 * school session, or a `clinic_id`, for a clinic.
 *
 * Cases are grouped by the protocols used across both roles: everything under a VGD,
 * nothing under a VGD, or a mix of the two.
 */
const testCases = [
  {
    group: LinkGroup.VgdOnly,
    label: 'Flu-only school session: VGD for nurses and HCAs',
    schoolKey: 'fluPrimarySchool',
    presetName: SessionPresetName.Flu,
    nurseVgdProgramme_ids: ['flu'],
    hcaVgdProgramme_ids: ['flu']
  },
  {
    group: LinkGroup.VgdOnly,
    label: 'Flu-only clinic: VGD for nurses and HCAs',
    clinic_id: 'M86020', // Wood End Health Centre
    presetName: SessionPresetName.Flu,
    canVaccinateForOtherProgrammes: false,
    nurseVgdProgramme_ids: ['flu'],
    hcaVgdProgramme_ids: ['flu']
  },
  {
    group: LinkGroup.PgdOnly,
    label: 'Flu-only school session: PGD for nurses',
    schoolKey: 'fluPrimarySchool',
    presetName: SessionPresetName.Flu,
    nurseVgdProgramme_ids: [],
    hcaVgdProgramme_ids: []
  },
  {
    group: LinkGroup.PgdOnly,
    label: 'Flu clinic with catch-ups: PGD for nurses',
    clinic_id: 'M86005', // Hillfields Health Centre
    presetName: SessionPresetName.Flu,
    canVaccinateForOtherProgrammes: true,
    nurseVgdProgramme_ids: [],
    hcaVgdProgramme_ids: []
  },
  {
    // Nurses still use a PGD here, but VGDs don’t apply to HPV so no protocol is shown
    group: LinkGroup.PgdOnly,
    label:
      'HPV school session: no VGD/PGD protocol info (VGD’s not applicable)',
    schoolKey: 'hpvSecondarySchool',
    presetName: SessionPresetName.HPV,
    nurseVgdProgramme_ids: [],
    hcaVgdProgramme_ids: []
  },
  {
    group: LinkGroup.Mix,
    label: 'Doubles school session: Td/IPV under VGD for nurses and HCAs',
    schoolKey: 'doublesSecondarySchool',
    presetName: SessionPresetName.Doubles,
    nurseVgdProgramme_ids: ['td-ipv'],
    hcaVgdProgramme_ids: ['td-ipv']
  },
  {
    group: LinkGroup.Mix,
    label: 'Doubles-only clinic: Td/IPV under VGD for nurses and HCAs',
    clinic_id: 'M86005', // Hillfields Health Centre
    presetName: SessionPresetName.Doubles,
    canVaccinateForOtherProgrammes: false,
    nurseVgdProgramme_ids: ['td-ipv'],
    hcaVgdProgramme_ids: ['td-ipv']
  },
  {
    group: LinkGroup.Mix,
    label:
      'Flu and MMR clinic with catch-ups: Flu and Td/IPV under VGD for nurses, Flu under VGD for HCAs',
    clinic_id: 'M86045', // Paradise Medical Centre
    presetName: SessionPresetName.AutumnCatchup,
    canVaccinateForOtherProgrammes: true,
    nurseVgdProgramme_ids: ['flu', 'td-ipv'],
    hcaVgdProgramme_ids: ['flu']
  },
  {
    group: LinkGroup.Mix,
    label:
      'Flu and MMR clinic with catch-ups: Everything under PGD for nurses, Flu under VGD for HCAs',
    clinic_id: 'M86014', // The Forum Health Centre
    presetName: SessionPresetName.AutumnCatchup,
    canVaccinateForOtherProgrammes: true,
    nurseVgdProgramme_ids: [],
    hcaVgdProgramme_ids: ['flu']
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
  name: 'Session protocol summaries',
  description:
    'School sessions and clinics with different VGD settings for nurses and healthcare assistants, to show each way the protocol rows can be summarised on a session’s edit page. None of the sessions have any children.',
  run(context, shared) {
    const links = testCases.map((testCase, index) => {
      const session = createSessionForTestCase(
        context,
        shared,
        testCase,
        pickSessionDate(30 + index)
      )
      session.setVgdProgrammes(
        testCase.nurseVgdProgramme_ids,
        testCase.hcaVgdProgramme_ids
      )

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
