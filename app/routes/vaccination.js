import express from 'express'

import { vaccinationController as vaccination } from '../controllers/vaccination.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', vaccination.redirect)

router.get('/new', vaccination.new)

router.param('vaccination_uuid', vaccination.read)

router.all('/:vaccination_uuid/new/:view', vaccination.readForm('new'))
router.get('/:vaccination_uuid/new/:view', vaccination.showForm('new'))
router.post('/:vaccination_uuid/new/check-answers', vaccination.update('new'))
router.post('/:vaccination_uuid/new/:view', vaccination.updateForm)

router.get('/:vaccination_uuid/edit', vaccination.edit)
router.post('/:vaccination_uuid/edit', vaccination.update('edit'))

router.all('/:vaccination_uuid/edit/:view', vaccination.readForm('edit'))
router.get('/:vaccination_uuid/edit/:view', vaccination.showForm('edit'))
router.post('/:vaccination_uuid/edit/:view', vaccination.updateForm)

router.get('/:vaccination_uuid/duplicates', vaccination.duplicates)

router.get('/:vaccination_uuid', vaccination.show)

export const vaccinationRoutes = router
