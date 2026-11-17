import express from 'express'

import { contactRelationshipController as contactRelationship } from '../controllers/contact-relationship.js'

const router = express.Router({ strict: true })

router.get('/new', contactRelationship.new)

router.param('contactRelationship_uuid', contactRelationship.read)

router.get(
  '/:contactRelationship_uuid/delete',
  contactRelationship.action('delete')
)
router.post('/:contactRelationship_uuid/delete', contactRelationship.delete)

router.all(
  '/:contactRelationship_uuid/new',
  contactRelationship.readForm('new')
)
router.get('/:contactRelationship_uuid/new', contactRelationship.showForm)
router.post(
  '/:contactRelationship_uuid/new',
  contactRelationship.updateForm,
  contactRelationship.update('new')
)

router.all(
  '/:contactRelationship_uuid/edit',
  contactRelationship.readForm('edit')
)
router.get('/:contactRelationship_uuid/edit', contactRelationship.showForm)
router.post(
  '/:contactRelationship_uuid/edit',
  contactRelationship.updateForm,
  contactRelationship.update('edit')
)

export const contactRelationshipRoutes = router
