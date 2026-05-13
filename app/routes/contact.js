import express from 'express'

import { contactController as contact } from '../controllers/contact.js'

const router = express.Router({ strict: true })

router.get('/new', contact.new)

router.param('contact_uuid', contact.read)

router.get('/:contact_uuid/delete', contact.action('delete'))
router.post('/:contact_uuid/delete', contact.delete)

router.all('/:contact_uuid/new', contact.readForm('new'))
router.get('/:contact_uuid/new', contact.showForm)
router.post('/:contact_uuid/new', contact.updateForm, contact.update('new'))

router.all('/:contact_uuid/edit', contact.readForm('edit'))
router.get('/:contact_uuid/edit', contact.showForm)
router.post('/:contact_uuid/edit', contact.updateForm, contact.update('edit'))

export const contactRoutes = router
