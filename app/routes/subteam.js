import express from 'express'

import { subteamController as subteam } from '../controllers/subteam.js'

const router = express.Router({ strict: true, mergeParams: true })

router.use(subteam.readTeam)

router.get('/new', subteam.new)

router.param('subteam_id', subteam.read)

router.all('/:subteam_id/new/:view', subteam.readForm('new'))
router.get('/:subteam_id/new/:view', subteam.showForm)
router.post('/:subteam_id/new/check-answers', subteam.create)
router.post('/:subteam_id/new/:view', subteam.updateForm)

router.get('/:subteam_id/edit', subteam.edit)
router.post('/:subteam_id/edit', subteam.update)

router.all('/:subteam_id/edit/:view', subteam.readForm('edit'))
router.get('/:subteam_id/edit/:view', subteam.showForm)
router.post('/:subteam_id/edit/:view', subteam.updateForm)

router.get('/:subteam_id/delete', subteam.action('delete'))
router.post('/:subteam_id/delete', subteam.delete)

export const subteamRoutes = router
