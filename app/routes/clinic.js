import express from 'express'

import { clinicController as clinic } from '../controllers/clinic.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/new', clinic.new)

router.param('clinic_id', clinic.read)

router.all('/:clinic_id/new/:view', clinic.readForm('new'))
router.get('/:clinic_id/new/:view', clinic.showForm)
router.post('/:clinic_id/new/check-answers', clinic.create)
router.post('/:clinic_id/new/:view', clinic.updateForm)

router.get('/:clinic_id/edit', clinic.edit)
router.post('/:clinic_id/edit', clinic.update)

router.all('/:clinic_id/edit/:view', clinic.readForm('edit'))
router.get('/:clinic_id/edit/:view', clinic.showForm)
router.post('/:clinic_id/edit/:view', clinic.updateForm)

router.get('/:clinic_id/delete', clinic.action('delete'))
router.post('/:clinic_id/delete', clinic.delete)

export const clinicRoutes = router
