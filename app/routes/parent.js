import express from 'express'

import { parentController as parent } from '../controllers/parent.js'

const router = express.Router({ strict: true })

router.get('/new', parent.new)

router.param('parent_uuid', parent.read)

router.get('/:parent_uuid/delete', parent.action('delete'))
router.post('/:parent_uuid/delete', parent.delete)

router.all('/:parent_uuid/new', parent.readForm('new'))
router.get('/:parent_uuid/new', parent.showForm)
router.post('/:parent_uuid/new', parent.updateForm, parent.update('new'))

router.all('/:parent_uuid/edit', parent.readForm('edit'))
router.get('/:parent_uuid/edit', parent.showForm)
router.post('/:parent_uuid/edit', parent.updateForm, parent.update('edit'))

export const parentRoutes = router
