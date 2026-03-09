import express from 'express'

import { bookIntoClinicController as bookIntoClinic } from '../controllers/book-into-a-clinic.js'

const router = express.Router({ strict: true, mergeParams: true })

router.param('session_preset_slug', bookIntoClinic.read)

router.get(['/:session_preset_slug', '/:session_preset_slug/'], bookIntoClinic.redirect)

router.get('/:session_preset_slug/new', bookIntoClinic.new)

router.all('/:session_preset_slug/:booking_uuid/new/:view', bookIntoClinic.readForm)
router.get('/:session_preset_slug/:booking_uuid/new/:view', bookIntoClinic.showForm)
router.post('/:session_preset_slug/:booking_uuid/new/check-answers', bookIntoClinic.update)
router.post('/:session_preset_slug/:booking_uuid/new/:view', bookIntoClinic.updateForm)

router.get('/:session_preset_slug{/:view}', bookIntoClinic.show)

export const bookIntoClinicRoutes = router


