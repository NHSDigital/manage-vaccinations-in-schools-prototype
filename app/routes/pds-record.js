import express from 'express'

import { pdsRecordController as pdsRecord } from '../controllers/pds-record.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', pdsRecord.redirect)

router.param('pdsRecord_uuid', pdsRecord.read)

router.get('/new/results', pdsRecord.readAll)

router.post('/new/start', pdsRecord.start)
router.post(
  '/:pdsRecord_uuid/new/school',
  pdsRecord.updateForm,
  pdsRecord.update
)

router.all(['/new/:view', '/:pdsRecord_uuid/new/:view'], pdsRecord.readForm)
router.get(['/new/:view', '/:pdsRecord_uuid/new/:view'], pdsRecord.showForm)
router.post(['/new/:view', '/:pdsRecord_uuid/new/:view'], pdsRecord.updateForm)

export const pdsRecordRoutes = router
