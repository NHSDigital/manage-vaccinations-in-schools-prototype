import express from 'express'

import { patientSessionController as patientSession } from '../controllers/patient-session.js'

const router = express.Router({ strict: true, mergeParams: true })

router.param('nhsn', patientSession.read)

router.get('/:nhsn/:programme_id/cancel', patientSession.startCancel)
router.get('/:nhsn/:programme_id/cancel/:view', patientSession.showCancel)
router.post('/:nhsn/:programme_id/cancel/:view', patientSession.updateCancel)

router.all('/:nhsn/:programme_id/new/:view', patientSession.readForm)
router.get('/:nhsn/:programme_id/new/:view', patientSession.showForm('new'))

router.post('/:nhsn/:programme_id/new/gillick', patientSession.gillick('new'))
router.post('/:nhsn/:programme_id/new/pre-screen', patientSession.preScreen)
router.post('/:nhsn/:programme_id/new/invite', patientSession.invite)
router.post('/:nhsn/:programme_id/new/remind', patientSession.remind)
router.post('/:nhsn/:programme_id/new/note', patientSession.note)

router.all('/:nhsn/:programme_id/edit/:view', patientSession.readForm)
router.get('/:nhsn/:programme_id/edit/:view', patientSession.showForm('edit'))

router.post('/:nhsn/:programme_id/edit/gillick', patientSession.gillick('edit'))
router.post('/:nhsn/:programme_id/edit/registration', patientSession.register)

router.get('/:nhsn/:programme_id{/:view}', patientSession.show)

export const patientSessionRoutes = router
