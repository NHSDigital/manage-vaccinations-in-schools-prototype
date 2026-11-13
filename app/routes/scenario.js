import express from 'express'

import { scenarioController as scenario } from '../controllers/scenario.js'

const router = express.Router({ strict: true })

router.get('/', scenario.list)
router.get('/research/:tag', scenario.showResearchSession)

export const scenarioRoutes = router
