import express from 'express'

import { teamController as team } from '../controllers/team.js'

const router = express.Router({ strict: true })

router.param('team_id', team.read)

router.get('/:team_id', team.redirect)

router.all('/:team_id/edit/:view', team.readForm)
router.get('/:team_id/edit/:view', team.showForm)
router.post('/:team_id/edit/:view', team.updateForm)

router.get('/:team_id{/:view}', team.show)

export const teamRoutes = router
