import express from 'express'

import { unmatchedAppointmentController as controller } from '../controllers/unmatched-appointment.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', controller.readAll, controller.list)

router.param('appointment_uuid', controller.read)

// router.all('/:appointment_uuid/match', controller.readMatches)
// router.post('/:appointment_uuid/match', controller.filterMatches)

// router.post('/:appointment_uuid/invalidate', controller.invalidate)
// router.post('/:appointment_uuid/link', controller.link)
// router.post('/:appointment_uuid/add', controller.add)

router.get('/:appointment_uuid{/:view}', controller.show)

export const unmatchedAppointmentRoutes = router
