import express from 'express'

import { bookIntoClinicController as bookIntoClinic } from '../controllers/book-into-a-clinic.js'

const router = express.Router({ strict: true, mergeParams: true })

router.use(bookIntoClinic.setupServiceHeader)

router.get('/', bookIntoClinic.readProgrammes)

router.get('/new', bookIntoClinic.new)

router.param('booking_uuid', bookIntoClinic.read)

router.all(
  '/:booking_uuid/new/:appointment_uuid/:view',
  bookIntoClinic.readForm
)
router.all('/:booking_uuid/new/:view', bookIntoClinic.readForm)

router.get(
  '/:booking_uuid/new/:appointment_uuid/:view',
  bookIntoClinic.showForm
)
router.get('/:booking_uuid/new/:view', bookIntoClinic.showForm)

router.post(
  '/:booking_uuid/new/:appointment_uuid/check-answers',
  bookIntoClinic.update
)

router.post(
  '/:booking_uuid/new/:appointment_uuid/check-feedback',
  bookIntoClinic.updateFeedback
)

router.post(
  '/:booking_uuid/new/:appointment_uuid/:view',
  bookIntoClinic.updateForm
)
router.post('/:booking_uuid/new/:view', bookIntoClinic.updateForm)

router.get('{/:view}', bookIntoClinic.show)

export const bookIntoClinicRoutes = router
