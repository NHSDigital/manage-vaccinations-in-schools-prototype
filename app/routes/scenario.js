import express from 'express'

import { scenarioController as scenario } from '../controllers/scenario.js'

const router = express.Router({ strict: true })

router.get('/', scenario.list)

export const scenarioRoutes = router
