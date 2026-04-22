import express from 'express'

import { downloadController as download } from '../controllers/download.js'
import { moveController as move } from '../controllers/move.js'
import { DownloadType } from '../enums.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', move.readAll, move.list)

router.get('/download', download.new(DownloadType.Moves))

router.param('move_uuid', move.read)

router.get('/:move_uuid', move.show)
router.post('/:move_uuid', move.update)

export const moveRoutes = router
