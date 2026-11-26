import {
  PsdUsage,
  RegistrationStatus,
  ReplyDecision,
  SessionConsentContacts,
  SessionPresetName
} from '../../../app/enums.js'
import { generateInstruction } from '../../../app/generators/instruction.js'
import { setMidday, today } from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'
import {
  createConsentReply,
  createPatientInSession,
  createSchoolSession
} from '../helpers.js'

/**
 * Each session has its own VGD and PSD settings, and a few children who are ready to
 * vaccinate, so each part of the vaccination recording form can be seen for nurses and HCAs
 *
 * Each child case sets the consent the parent gave and, if `hasPsd` is true, adds a PSD
 * for the programme being linked to
 */
const sessionCases = [
  {
    group: 'Flu: VGD for nurses, PSDs for HCAs (nasal spray only)',
    schoolKey: 'fluPrimarySchool',
    presetName: SessionPresetName.Flu,
    yearGroup: 3,
    nurseVgdProgramme_ids: ['flu'],
    hcaVgdProgramme_ids: [],
    psdUsage: PsdUsage.NasalFluOnly,
    linkProgramme_id: 'flu',
    childCases: [
      {
        label: 'Nasal spray, with a PSD: HCAs record under the PSD',
        researchTags: [
          {
            tag: 'psds-and-vgd',
            label:
              '[4. Recording flu vaccinations (switch between nurse and HCA for each)] a. PSDs for HCAs, nasal spray with a PSD: HCA records under the PSD'
          }
        ],
        replyOverrides: { hasConsentForAlternativeVaccine: false },
        hasPsd: true
      },
      {
        label: 'Nasal spray, no PSD: HCAs can’t record',
        researchTags: [
          {
            tag: 'psds-and-vgd',
            label:
              '[4. Recording flu vaccinations (switch between nurse and HCA for each)] b. PSDs for HCAs, nasal spray without a PSD: HCA can’t record'
          }
        ],
        replyOverrides: { hasConsentForAlternativeVaccine: false },
        hasPsd: false
      }
    ]
  },
  {
    group: 'Flu: VGD for nurses and HCAs, no PSDs',
    schoolKey: 'fluPrimarySchool',
    presetName: SessionPresetName.Flu,
    yearGroup: 3,
    nurseVgdProgramme_ids: ['flu'],
    hcaVgdProgramme_ids: ['flu'],
    psdUsage: PsdUsage.None,
    linkProgramme_id: 'flu',
    childCases: [
      {
        label:
          'Nasal spray: HCAs record under their VGD, naming the nurse who assessed',
        researchTags: [
          {
            tag: 'psds-and-vgd',
            label:
              '[4. Recording flu vaccinations (switch between nurse and HCA for each)] c. VGD for HCAs, nasal spray: HCA names the assessing nurse'
          }
        ],
        replyOverrides: { hasConsentForAlternativeVaccine: false },
        hasPsd: false
      },
      {
        label:
          'Injection only: HCAs record under their VGD, naming the nurse who assessed',
        researchTags: [
          {
            tag: 'psds-and-vgd',
            label:
              '[4. Recording flu vaccinations (switch between nurse and HCA for each)] d. VGD for HCAs, injection only: HCA records under their VGD'
          }
        ],
        replyOverrides: { decision: ReplyDecision.OnlyAlternativeInjection },
        hasPsd: false
      }
    ]
  },
  {
    group: 'Doubles: PGD for nurses, PSDs for HCAs (all programmes)',
    schoolKey: 'doublesSecondarySchool',
    presetName: SessionPresetName.Doubles,
    yearGroup: 9,
    nurseVgdProgramme_ids: [],
    hcaVgdProgramme_ids: [],
    psdUsage: PsdUsage.All,
    linkProgramme_id: 'td-ipv',
    childCases: [
      {
        // VGDs don’t apply to MenACWY, so nurses vaccinate under a PGD
        label:
          'MenACWY, no PSD: nurses can’t hand over (PGD), HCAs can’t record',
        researchTags: [
          {
            tag: 'psds-and-vgd',
            label:
              '[5. Recording Td/IPV and MenACWY vaccinations (switch between nurse and HCA for each)] a. PGD for MenACWY: HCA can’t record, nurse can’t hand over'
          }
        ],
        replyOverrides: {},
        hasPsd: false,
        linkProgramme_id: 'menacwy'
      },
      {
        label: 'Td/IPV, with a PSD: HCAs record under the PSD',
        researchTags: [
          {
            tag: 'psds-and-vgd',
            label:
              '[5. Recording Td/IPV and MenACWY vaccinations (switch between nurse and HCA for each)] b. PSD for Td/IPV: HCA records under the PSD, nurse can hand over to another nurse'
          }
        ],
        replyOverrides: {},
        hasPsd: true
      }
    ]
  }
]

/**
 * Add a child who is ready to vaccinate: their parent gave consent for each programme,
 * with no need for triage, and they’ve been registered as attending
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {SharedResources} options.shared - Shared resources
 * @param {object} options.sessionCase - Session case
 * @param {Session} options.session - Session
 * @param {object} options.childCase - Child case
 * @returns {PatientSession} Patient session to link to
 */
function addChildReadyToVaccinate(
  context,
  { shared, sessionCase, session, childCase }
) {
  const { patient, patientSessions, parent } = createPatientInSession(context, {
    school: shared[sessionCase.schoolKey],
    session,
    programme_ids: session.programme_ids,
    yearGroup: sessionCase.yearGroup
  })

  for (const patientSession of patientSessions) {
    createConsentReply(context, {
      patient,
      patientSession,
      parent,
      overrides: {
        decision: ReplyDecision.Given,
        needsTriage: false,
        ...childCase.replyOverrides
      }
    })
  }

  patientSessions[0].registerAttendance(
    { createdBy_uid: shared.nurse.uid },
    RegistrationStatus.Present
  )

  const linkProgramme_id =
    childCase.linkProgramme_id || sessionCase.linkProgramme_id
  const linkedPatientSession = patientSessions.find(
    ({ programme_id }) => programme_id === linkProgramme_id
  )

  if (childCase.hasPsd) {
    linkedPatientSession.patientProgramme.giveInstruction(
      generateInstruction(linkedPatientSession, shared.nurse)
    )
  }

  return linkedPatientSession
}

export default defineScenario({
  name: 'Vaccination recording under VGDs and PSDs',
  description:
    'Three sessions happening today, each with different VGD and PSD settings, and a few children ready to vaccinate. Each link opens a child’s session page, where the form to record their vaccination depends on your role, so switch between a nurse and a healthcare assistant (HCA) to compare. Flu sessions only work during the flu season.',
  run(context, shared) {
    const links = sessionCases.flatMap((sessionCase) => {
      const session = createSchoolSession(context, {
        school: shared[sessionCase.schoolKey],
        nurse: shared.nurse,
        presetName: sessionCase.presetName,
        date: setMidday(today()),
        consentContacts: SessionConsentContacts.NonRefusers
      })
      session.setVgdProgrammes(
        sessionCase.nurseVgdProgramme_ids,
        sessionCase.hcaVgdProgramme_ids
      )
      session.psdUsage = sessionCase.psdUsage

      return sessionCase.childCases.map((childCase) => {
        const patientSession = addChildReadyToVaccinate(context, {
          shared,
          sessionCase,
          session,
          childCase
        })

        return {
          label: childCase.label,
          href: patientSession.uri,
          group: sessionCase.group,
          researchTags: childCase.researchTags
        }
      })
    })

    return {
      startUrl: links[0].href,
      links
    }
  }
})

/**
 * @import { PatientSession, Session } from '../../../app/models.js'
 * @import { SharedResources } from '../types.js'
 */
