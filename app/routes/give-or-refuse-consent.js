import express from 'express'

import { giveOrRefuseConsentController as controller } from '../controllers/give-or-refuse-consent.js'

const router = express.Router({ strict: true })

router.param('session_id', controller.read)

router.get(['/:session_id', '/:session_id/'], controller.redirect)

router.get('/:session_id/new', controller.new)

router.all('/:session_id/:consent_uuid/new/:view', controller.readForm)
router.get('/:session_id/:consent_uuid/new/:view', controller.showForm)
router.post('/:session_id/:consent_uuid/new/check-answers', controller.update)
router.post('/:session_id/:consent_uuid/new/:view', controller.updateForm)

router.get('/:session_id{/:view}', controller.show)

export const giveOrRefuseConsentRoutes = router
