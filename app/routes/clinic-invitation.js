import express from 'express'

import { clinicInvitationController as clinicInvitation } from '../controllers/clinic-invitation.js'
import { patientController as patient } from '../controllers/patient.js'

/**
 * Add the routes for the pages of the journey, shared by every way of inviting to clinic
 *
 * @param {import('express').Router} router - Router to add the routes to
 */
const addInviteJourneyRoutes = (router) => {
  router.all('/:invite_id/new/:view', clinicInvitation.readForm)
  router.get('/:invite_id/new/:view', clinicInvitation.showForm)
  router.post('/:invite_id/new/check-answers', clinicInvitation.update)
  router.post('/:invite_id/new/:view', clinicInvitation.updateForm)
}

// JOURNEY: Bulk invite, for the cohort of children in the filtered Children list
const bulkRouter = express.Router({ strict: true, mergeParams: true })
bulkRouter.get('/', patient.readAll, clinicInvitation.new)
addInviteJourneyRoutes(bulkRouter)

// JOURNEY: Invite a single child, from their child record
const patientRouter = express.Router({ strict: true, mergeParams: true })
// Populate `response.locals.patient`
patientRouter.use((request, response, next) =>
  patient.read(
    request,
    response,
    next,
    request.params.patient_uuid,
    'patient_uuid'
  )
)
patientRouter.get('/', clinicInvitation.new)
addInviteJourneyRoutes(patientRouter)

// Export the different routers for the different journey start points
export const clinicInvitationRoutes = bulkRouter
export const patientClinicInvitationRoutes = patientRouter
