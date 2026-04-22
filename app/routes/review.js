import express from 'express'

import { reviewController as review } from '../controllers/review.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', review.list)

export const reviewRoutes = router
