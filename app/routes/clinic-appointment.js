import express from 'express'

import { clinicAppointmentController as clinicAppointment } from '../controllers/clinic-appointment.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', clinicAppointment.readAll, clinicAppointment.list)

router.param('clinic_appointment_uuid', clinicAppointment.read)

router.get('/:clinic_appointment_uuid', clinicAppointment.show)

export const clinicAppointmentRoutes = router
