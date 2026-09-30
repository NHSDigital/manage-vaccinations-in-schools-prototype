import express from 'express'

import { bookIntoClinicController as bookIntoClinic } from '../controllers/book-into-a-clinic.js'

const router = express.Router({ strict: true, mergeParams: true })

// Read and expose properties of the appointment and the booking it belongs to
router.param('appointment_uuid', bookIntoClinic.readBookingAndAppointment)

// Viewing an appointment
router.get('/:appointment_uuid', bookIntoClinic.showAppointment)

// Editing an appointment
router.get('/:appointment_uuid/edit', bookIntoClinic.edit)
router.post('/:appointment_uuid/edit', bookIntoClinic.update('edit'))

router.all('/:appointment_uuid/edit/:view', bookIntoClinic.readForm('edit'))
router.get('/:appointment_uuid/edit/:view', bookIntoClinic.showForm)
router.post('/:appointment_uuid/edit/:view', bookIntoClinic.updateForm('edit'))

// Cancelling an appointment
router.get('/:appointment_uuid/cancel', bookIntoClinic.startCancel)
router.get('/:appointment_uuid/cancel/:view', bookIntoClinic.showCancel)
router.post('/:appointment_uuid/cancel/:view', bookIntoClinic.updateCancel)

export const sessionAppointmentRoutes = router
