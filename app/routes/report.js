import express from 'express'

import { reportController as report } from '../controllers/report.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', report.list)

router.all('/:view', report.readAll)
router.get('/:view', report.show)
router.post('/:view', report.filterList)

export const reportRoutes = router
