import express from 'express'

import { bookIntoClinicController as bookIntoClinic } from '../controllers/book-into-a-clinic.js'

const router = express.Router({ strict: true, mergeParams: true })

router.param('session_preset_slug', bookIntoClinic.read)

router.get(['/:session_preset_slug', '/:session_preset_slug/'], bookIntoClinic.redirect)

router.get('/:session_preset_slug/new', bookIntoClinic.new)

// TODO
router.all('/:session_preset_slug/:booking_uuid/new/:child_index/:view', bookIntoClinic.readForm)
router.all('/:session_preset_slug/:booking_uuid/new/:view', bookIntoClinic.readForm)

router.get('/:session_preset_slug/:booking_uuid/new/:child_index/:view', bookIntoClinic.showForm)
router.get('/:session_preset_slug/:booking_uuid/new/:view', bookIntoClinic.showForm)

// Not convinced I need this special case for clinic bookings...
// router.post('/:session_preset_slug/:booking_uuid/new/check-answers', bookIntoClinic.update)

router.post('/:session_preset_slug/:booking_uuid/new/:child_index/:view', bookIntoClinic.updateForm)
router.post('/:session_preset_slug/:booking_uuid/new/:view', bookIntoClinic.updateForm)

router.get('/:session_preset_slug{/:view}', bookIntoClinic.show)

export const bookIntoClinicRoutes = router


