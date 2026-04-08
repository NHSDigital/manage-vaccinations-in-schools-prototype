import express from 'express'

import { pdsController as pds } from '../controllers/pds.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', pds.redirect)

router.param('patient_uuid', pds.read)

router.get('/new/results', pds.readAll)

router.post('/new/start', pds.start)
router.post('/:patient_uuid/new/school', pds.updateForm, pds.update)

router.all(['/new/:view', '/:patient_uuid/new/:view'], pds.readForm)
router.get(['/new/:view', '/:patient_uuid/new/:view'], pds.showForm)
router.post(['/new/:view', '/:patient_uuid/new/:view'], pds.updateForm)

export const pdsRoutes = router
