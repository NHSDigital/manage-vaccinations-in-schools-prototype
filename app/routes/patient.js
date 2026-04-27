import express from 'express'

import { patientController as patient } from '../controllers/patient.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', patient.readAll, patient.list)
router.post('/', patient.filterList)

router.get('/invite-to-clinic', patient.readAll, patient.showInviteManyToClinic)
router.post('/invite-to-clinic', patient.inviteManyToClinic)

router.param('patient_uuid', patient.read)

router.get('/:patient_uuid/edit', patient.edit)
router.post('/:patient_uuid/edit', patient.update)

router.all('/:patient_uuid/edit/:view', patient.readForm)
router.get('/:patient_uuid/edit/:view', patient.showForm)
router.post('/:patient_uuid/edit/:view', patient.updateForm)

router.post('/:patient_uuid/new/note', patient.note)

router.post('/:patient_uuid/archive', patient.archive)
router.post('/:patient_uuid/invite-to-clinic', patient.inviteOneToClinic)

router.all('/:patient_uuid/programmes{/:programme_id}', patient.readProgramme)
router.get('/:patient_uuid/programmes{/:programme_id}', patient.showProgramme)

router.post('/:patient_uuid/programmes/:programme_id/record', patient.record)

router.get(
  '/:patient_uuid/programmes/:programme_id/new/vaccination',
  patient.vaccination('new')
)
router.get(
  '/:patient_uuid/programmes/:programme_id/new/ttcv',
  patient.vaccination('ttcv')
)

router.get('/:patient_uuid{/:view}', patient.show)

export const patientRoutes = router
