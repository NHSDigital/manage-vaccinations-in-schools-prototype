import {
  ClinicType,
  SessionPresetName,
  SessionPresets,
  TeamDefaults
} from '../../../app/enums.js'
import { generateClinicVaccinationPeriods } from '../../../app/generators/clinic-vaccination-periods.js'
import { generateSession } from '../../../app/generators/session.js'
import { Session } from '../../../app/models.js'
import {
  addDays,
  getCurrentAcademicYear,
  removeDays,
  setMidday,
  today
} from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'

const restrictedClinics = [
  {
    presetName: SessionPresetName.Flu,
    clinic_id: 'M86005', // Hillfields Health Centre
    daysAhead: 14,
    clinicAudience: 'Local Muslim community'
  },
  {
    presetName: SessionPresetName.Flu,
    clinic_id: 'M86045', // Paradise Medical Centre
    daysAhead: 21,
    clinicAudience: 'Local Muslim community'
  },
  {
    presetName: SessionPresetName.HPV,
    clinic_id: 'M86014', // The Forum Health Centre
    daysAhead: 28,
    clinicAudience: 'Year 8 children'
  },
  {
    presetName: SessionPresetName.Doubles,
    clinic_id: 'Q00255', // The Kenilworth Centre
    daysAhead: 35,
    clinicAudience: 'Children in Kenilworth'
  }
]

export default defineScenario({
  name: 'Restricted invitation clinics ready for invites',
  description:
    'Upcoming restricted invitation clinics for flu, HPV and Doubles, each with a different audience, that children can be invited to. None have any appointments yet.',
  run(context, shared) {
    const { nurse } = shared

    const sessions = restrictedClinics.map(
      ({ presetName, clinic_id, daysAhead, clinicAudience }) => {
        const preset = SessionPresets.find(({ name }) => name === presetName)
        const session = generateSession(preset, nurse, { clinic_id })

        session.academicYear = getCurrentAcademicYear()
        session.date = setMidday(addDays(today(), daysAhead))
        session.consentOpenAt = removeDays(
          session.date,
          TeamDefaults.SessionOpenWeeks * 7
        )
        session.clinicType = ClinicType.Restricted
        session.clinicAudience = clinicAudience
        generateClinicVaccinationPeriods(session)

        return Session.create(session, context)
      }
    )

    // Return links to useful places for UR related to this scenario
    return {
      startUrl: '/patients?clinicStatus=Eligible+for+clinic',
      links: sessions.map((session) => ({
        label: `${session.shortName} (audience: ${session.clinicAudience})`,
        href: session.uri
      }))
    }
  }
})
