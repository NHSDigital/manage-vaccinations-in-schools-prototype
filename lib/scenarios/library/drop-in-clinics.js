import {
  ClinicType,
  SessionPresetName,
  SessionType
} from '../../../app/enums.js'
import { addDays, setMidday, today } from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'
import { createClinicSession } from '../helpers.js'

const dropInClinics = [
  {
    presetName: SessionPresetName.Flu,
    clinic_id: 'M86005', // Hillfields Health Centre
    daysAhead: 0 // Happening today, so the Children tab is shown
  },
  {
    presetName: SessionPresetName.Flu,
    clinic_id: 'M86045', // Paradise Medical Centre
    daysAhead: 14
  },
  {
    presetName: SessionPresetName.HPV,
    clinic_id: 'M86014', // The Forum Health Centre
    daysAhead: 21
  },
  {
    presetName: SessionPresetName.Doubles,
    clinic_id: 'M86020', // Wood End Health Centre
    daysAhead: 28
  }
]

export default defineScenario({
  name: 'Drop-in clinics',
  description:
    'Drop-in clinics for flu, HPV and Doubles: one happening today and the rest in the next few weeks. Parents can’t book into these, so none have any appointments.',
  run(context, shared) {
    const { nurse } = shared

    const sessions = dropInClinics.map(({ presetName, clinic_id, daysAhead }) =>
      createClinicSession(context, {
        clinic_id,
        nurse,
        presetName,
        clinicType: ClinicType.DropIn,
        date: setMidday(addDays(today(), daysAhead))
      })
    )

    // Return links to useful places for UR related to this scenario
    return {
      startUrl: `/sessions?${new URLSearchParams({ type: SessionType.Clinic, clinicType: ClinicType.DropIn })}`,
      links: sessions.map((session) => ({
        label: session.shortName + (session.isActive ? ' (today)' : ''),
        href: session.uri
      }))
    }
  }
})
