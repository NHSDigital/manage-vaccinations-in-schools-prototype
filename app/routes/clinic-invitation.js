import express from 'express'

import { clinicInvitationController as clinicInvitation } from '../controllers/clinic-invitation.js'
import { patientController as patient } from '../controllers/patient.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', patient.readAll, clinicInvitation.new)

router.all('/new/:view', clinicInvitation.readForm)
router.get('/new/:view', clinicInvitation.showForm)
router.post('/new/check-answers', clinicInvitation.update)
router.post('/new/:view', clinicInvitation.updateForm)

export const clinicInvitationRoutes = router
