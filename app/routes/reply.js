import express from 'express'

import { replyController as reply } from '../controllers/reply.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', reply.readAll, reply.list)

router.get('/new', reply.new)

router.param('reply_uuid', reply.read)

router.all('/:reply_uuid/new/:view', reply.readForm('new'))
router.get('/:reply_uuid/new/:view', reply.showForm)
router.post('/:reply_uuid/new/check-answers', reply.update('new'))
router.post('/:reply_uuid/new/:view', reply.updateForm)

router.all('/:reply_uuid/edit/:view', reply.readForm('edit'))
router.get('/:reply_uuid/edit/:view', reply.showForm)
router.post('/:reply_uuid/edit/follow-up', reply.followUp)
router.post('/:reply_uuid/edit/invalidate', reply.invalidate)
router.post('/:reply_uuid/edit/withdraw', reply.withdraw)
router.post('/:reply_uuid/edit/:view', reply.update('edit'))

router.get('/:reply_uuid', reply.show)

export const replyRoutes = router
