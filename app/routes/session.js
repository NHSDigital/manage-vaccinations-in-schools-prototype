import express from 'express'

import { downloadController as download } from '../controllers/download.js'
import { sessionController as session } from '../controllers/session.js'
import { DownloadType } from '../enums.js'

const router = express.Router({ strict: true })

router.get('/', session.readAll, session.list)
router.post('/', session.filter)

router.get('/new', session.new)

router.get('/advertise', session.advertise)
router.post('/advertise', session.updateAdvertLink)
router.get('/advert-link', session.showAdvertLink)
router.post('/advert-link', session.copyAdvertLink)

router.param('session_id', session.read)

router.get('/:session_id/download', download.new(DownloadType.Session))

router.all('/:session_id/new/:view', session.readForm('new'))
router.get('/:session_id/new/:view', session.showForm)
router.post('/:session_id/new/check-answers', session.update('new'))
router.post('/:session_id/new/:view', session.updateForm)

router.get('/:session_id/edit', session.edit)
router.post('/:session_id/edit', session.update('edit'))

router.all('/:session_id/edit/:view', session.readForm('edit'))
router.get('/:session_id/edit/:view', session.showForm)
router.post('/:session_id/edit/:view', session.updateForm)

router.post('/:session_id/invite-to-clinic', session.inviteToClinic)
router.post('/:session_id/instructions', session.giveInstructions)
router.post('/:session_id/reminders', session.sendReminders)
router.post('/:session_id/cancel', session.cancelSession)
router.post('/:session_id/status', session.makeActive)

router.all('/:session_id/:view', session.readPatientSessions)
router.post('/:session_id/:view', session.filterPatientSessions)

router.get('/:session_id/appointments', session.showAppointments)

router.get('/:session_id{/:view}', session.show)

export const sessionRoutes = router
