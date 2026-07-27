import express from 'express'

import { bookIntoClinicController as bookIntoClinic } from '../controllers/book-into-a-clinic.js'

const router = express.Router({ strict: true, mergeParams: true })

router.use(bookIntoClinic.setupServiceHeader)

router.get('/', bookIntoClinic.readProgrammes)

router.get('/new', bookIntoClinic.new)

router.param('booking_uuid', bookIntoClinic.readBooking)
router.param('appointment_uuid', bookIntoClinic.readAppointment)

// Start of the data migration booking journey
router.get(
  '/:booking_uuid/new/:appointment_uuid/find-child',
  bookIntoClinic.readChildren
)
router.post(
  '/:booking_uuid/new/:appointment_uuid/find-child',
  bookIntoClinic.filterChildren
)
router.get(
  '/:booking_uuid/new/:appointment_uuid/link-child',
  bookIntoClinic.linkChild
)

// General booking journey routes
router.all(
  '/:booking_uuid/new/:appointment_uuid/:view',
  bookIntoClinic.readForm('new')
)
router.all('/:booking_uuid/new/:view', bookIntoClinic.readForm('new'))

router.get(
  '/:booking_uuid/new/:appointment_uuid/:view',
  bookIntoClinic.showForm('new')
)
router.get('/:booking_uuid/new/:view', bookIntoClinic.showForm('new'))

router.post(
  '/:booking_uuid/new/:appointment_uuid/check-answers',
  bookIntoClinic.update('new')
)

router.post(
  '/:booking_uuid/new/:appointment_uuid/check-feedback',
  bookIntoClinic.updateFeedback('new')
)

router.post(
  '/:booking_uuid/new/:appointment_uuid/:view',
  bookIntoClinic.updateForm('new')
)
router.post('/:booking_uuid/new/:view', bookIntoClinic.updateForm('new'))

// Editing an appointment
router.post(
  '/:booking_uuid/new/:appointment_uuid/edit',
  bookIntoClinic.update('edit')
)

router.get('{/:view}', bookIntoClinic.show)

export const bookIntoClinicRoutes = router
