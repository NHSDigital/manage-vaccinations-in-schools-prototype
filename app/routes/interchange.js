import express from 'express'

import { interchangeController as interchange } from '../controllers/interchange.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', interchange.list)

export const interchangeRoutes = router
