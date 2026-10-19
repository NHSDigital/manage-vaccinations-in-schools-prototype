import express from 'express'

import { clinicInvitationController as clinicInvitation } from '../controllers/clinic-invitation.js'
import { patientController as patient } from '../controllers/patient.js'
import { schoolController as school } from '../controllers/school.js'
import { ClinicInvitationJourneyType } from '../enums.js'

/**
 * Record which invite journey a router is for, so the controller can tailor its pages
 *
 * @param {string} journeyType - Invite journey type, from `ClinicInvitationJourneyType`
 * @returns {import('express').RequestHandler} Middleware setting `response.locals.inviteJourneyType`
 */
const setJourneyType = (journeyType) => (request, response, next) => {
  response.locals.inviteJourneyType = journeyType
  next()
}

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
bulkRouter.use(setJourneyType(ClinicInvitationJourneyType.Bulk))
bulkRouter.get('/', patient.readAll, clinicInvitation.new)
addInviteJourneyRoutes(bulkRouter)

// JOURNEY: Invite a single child, from their child record
const patientRouter = express.Router({ strict: true, mergeParams: true })
patientRouter.use(setJourneyType(ClinicInvitationJourneyType.Patient))
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

// JOURNEY: Invite all children at the unknown school or home-educated
const schoolRouter = express.Router({ strict: true, mergeParams: true })
schoolRouter.use(setJourneyType(ClinicInvitationJourneyType.School))
// Populate `response.locals.school`
schoolRouter.use((request, response, next) =>
  school.read(request, response, next, request.params.school_id, 'school_id')
)
schoolRouter.get('/', clinicInvitation.new)
addInviteJourneyRoutes(schoolRouter)

// JOURNEY: Share a booking link that parents can use to book into clinics
const bookingLinkRouter = express.Router({ strict: true, mergeParams: true })
bookingLinkRouter.use(setJourneyType(ClinicInvitationJourneyType.BookingLink))
bookingLinkRouter.get('/', clinicInvitation.new)
addInviteJourneyRoutes(bookingLinkRouter)
bookingLinkRouter.get('/:invite_id/copy-link', clinicInvitation.showLink)

// Export the different routers for the different journey start points
export const clinicInvitationRoutes = bulkRouter
export const patientClinicInvitationRoutes = patientRouter
export const schoolClinicInvitationRoutes = schoolRouter
export const bookingLinkClinicInvitationRoutes = bookingLinkRouter
