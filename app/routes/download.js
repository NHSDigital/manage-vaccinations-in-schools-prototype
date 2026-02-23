import express from 'express'

import { downloadController as download } from '../controllers/download.js'

const router = express.Router({ strict: true })

router.get('/', download.list)

router.get('/new', download.form)
router.post('/new', download.create)

export const downloadRoutes = router
