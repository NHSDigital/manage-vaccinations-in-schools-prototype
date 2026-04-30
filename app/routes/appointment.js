import express from 'express'

import { appointmentController as appointment } from '../controllers/appointment.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', appointment.readAll, appointment.list)

router.param('appointment_uuid', appointment.read)

// router.all('/:appointment_uuid/match', appointment.readMatches)
// router.post('/:appointment_uuid/match', appointment.filterMatches)

// router.post('/:appointment_uuid/invalidate', appointment.invalidate)
// router.post('/:appointment_uuid/link', appointment.link)
// router.post('/:appointment_uuid/add', appointment.add)

// router.get('/:appointment_uuid{/:view}', appointment.show)

export const appointmentRoutes = router
