import express from 'express'

import { activityController as activity } from '../controllers/activity.js'

const router = express.Router({ strict: true })

router.get('/', activity.list)

export const activityRoutes = router
