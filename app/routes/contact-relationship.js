import express from 'express'

import { contactRelationshipController as contactRelationship } from '../controllers/contact-relationship.js'
import { contactController as contact } from '../controllers/contact.js'
import { ContactType } from '../enums.js'

const router = express.Router({ strict: true })

// Only users in a SAIS team can change contacts
router.use(contactRelationship.checkCanChange)

router.get('/new', contactRelationship.new)

router.param('contactRelationship_uuid', contactRelationship.read)
router.param('contact_uuid', contact.read)

// Contact points
router.all('/:contactRelationship_uuid/contacts/{*path}', contact.setBack)

router.get(
  '/:contactRelationship_uuid/contacts/new/tel',
  contact.showForm(ContactType.Phone)
)
router.post(
  '/:contactRelationship_uuid/contacts/new/tel',
  contact.create(ContactType.Phone)
)

router.get(
  '/:contactRelationship_uuid/contacts/new/email',
  contact.showForm(ContactType.Email)
)
router.post(
  '/:contactRelationship_uuid/contacts/new/email',
  contact.create(ContactType.Email)
)

router.get(
  '/:contactRelationship_uuid/contacts/:contact_uuid/archive',
  contact.showAction('archive')
)
router.post(
  '/:contactRelationship_uuid/contacts/:contact_uuid/archive',
  contact.archive
)

router.get(
  '/:contactRelationship_uuid/contacts/:contact_uuid/restore',
  contact.showAction('restore')
)
router.post(
  '/:contactRelationship_uuid/contacts/:contact_uuid/restore',
  contact.restore
)

router.get(
  '/:contactRelationship_uuid/archive',
  contactRelationship.action('archive')
)
router.post('/:contactRelationship_uuid/archive', contactRelationship.archive)

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
