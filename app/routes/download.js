import express from 'express'

import { downloadController as download } from '../controllers/download.js'

const router = express.Router({ strict: true })

router.get('/', download.readAll, download.list)
router.post('/', download.filterList)

router.get('/new', download.new())

router.param('download_id', download.read)

router.all('/:download_id/new/:view', download.readForm)
router.get('/:download_id/new/:view', download.showForm)
router.post(
  [
    '/:download_id/new/cohort',
    '/:download_id/new/moves',
    '/:download_id/new/report',
    '/:download_id/new/session'
  ],
  download.updateForm,
  download.update
)
router.post('/:download_id/new/:view', download.updateForm)

router.get('/:download_id/download', download.download)

export const downloadRoutes = router
