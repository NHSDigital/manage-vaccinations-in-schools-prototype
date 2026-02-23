import express from 'express'

import { downloadController as download } from '../controllers/download.js'

const router = express.Router({ strict: true })

router.get('/', download.readAll, download.list)
router.post('/', download.filterList)

router.get('/new', download.form)
router.post('/new', download.create)

router.param('download_id', download.read)

router.get('/:download_id/download', download.download)

export const downloadRoutes = router
