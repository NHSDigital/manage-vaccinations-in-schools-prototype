import express from 'express'

import { uploadController as upload } from '../controllers/upload.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', upload.readAll, upload.list)
router.post('/', upload.filterList)

router.get('/new', upload.new)

router.param('upload_id', upload.read)

router.all('/:upload_id/new/:view', upload.readForm('new'))
router.get('/:upload_id/new/:view', upload.showForm)
router.post('/:upload_id/new/file', upload.update('new'))
router.post('/:upload_id/new/:view', upload.updateForm)

router.all('/:upload_id/edit/:view', upload.readForm('edit'))
router.get('/:upload_id/edit/:view', upload.showForm)
router.post('/:upload_id/edit/file', upload.update('edit'))
router.post('/:upload_id/edit/:view', upload.updateForm)

router.get(
  '/:upload_id/remove-relationships',
  upload.action('bulk remove relationships')
)
router.post('/:upload_id/remove-relationships', upload.removeRelationships)

router.post('/:upload_id/approve', upload.approve)
router.post('/:upload_id/reject', upload.reject)
router.post('/:upload_id/delete', upload.delete)

router.get('/:upload_id{/:view}', upload.show)

export const uploadRoutes = router
