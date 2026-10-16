import express from 'express'

import { clinicInvitationController as clinicInvitation } from '../controllers/clinic-invitation.js'
import { patientController as patient } from '../controllers/patient.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', patient.readAll, clinicInvitation.new)

router.all('/:invite_id/new/:view', clinicInvitation.readForm)
router.get('/:invite_id/new/:view', clinicInvitation.showForm)
router.post('/:invite_id/new/check-answers', clinicInvitation.update)
router.post('/:invite_id/new/:view', clinicInvitation.updateForm)

export const clinicInvitationRoutes = router
