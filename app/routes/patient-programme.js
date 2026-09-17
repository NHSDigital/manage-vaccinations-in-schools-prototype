import express from 'express'

import { patientProgrammeController as patientProgramme } from '../controllers/patient-programme.js'
import { patientController as patient } from '../controllers/patient.js'

const router = express.Router({ strict: true, mergeParams: true })

// Populate `response.locals.patient`
router.use((request, response, next) =>
  patient.read(
    request,
    response,
    next,
    request.params.patient_uuid,
    'patient_uuid'
  )
)

router.param('programme_id', patientProgramme.read)

router.post('/:programme_id/clinics', patientProgramme.addToSession)
router.post('/:programme_id/visit', patientProgramme.newSession)

router.get(
  '/:programme_id/new/previous-vaccination',
  patientProgramme.vaccinate('previous')
)
router.get('/:programme_id/new/tetanus', patientProgramme.vaccinate('tetanus'))
router.post('/:programme_id/new/triage', patientProgramme.triage)

router.all('/:programme_id/new/:view', patientProgramme.readForm)
router.get('/:programme_id/new/:view', patientProgramme.showForm('new'))

router.get('/:programme_id{/:view}', patientProgramme.show)

export const patientProgrammeRoutes = router
