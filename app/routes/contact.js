import express from 'express'

import { contactPointController as contactPoint } from '../controllers/contact-point.js'
import { contactController as contact } from '../controllers/contact.js'
import { ContactPointType } from '../enums.js'

const router = express.Router({ strict: true })

// Only users in a SAIS team can change contacts
router.use(contact.checkCanChange)

router.get('/new', contact.new)

router.param('contact_uuid', contact.read)
router.param('contactPoint_uuid', contactPoint.read)

// Contact points
router.all('/:contact_uuid/contact-points/{*path}', contactPoint.setBack)

router.get(
  '/:contact_uuid/contact-points/new/tel',
  contactPoint.showForm(ContactPointType.Phone)
)
router.post(
  '/:contact_uuid/contact-points/new/tel',
  contactPoint.create(ContactPointType.Phone)
)

router.get(
  '/:contact_uuid/contact-points/new/email',
  contactPoint.showForm(ContactPointType.Email)
)
router.post(
  '/:contact_uuid/contact-points/new/email',
  contactPoint.create(ContactPointType.Email)
)

router.get(
  '/:contact_uuid/contact-points/:contactPoint_uuid/archive',
  contactPoint.showAction('archive')
)
router.post(
  '/:contact_uuid/contact-points/:contactPoint_uuid/archive',
  contactPoint.archive
)

router.get(
  '/:contact_uuid/contact-points/:contactPoint_uuid/restore',
  contactPoint.showAction('restore')
)
router.post(
  '/:contact_uuid/contact-points/:contactPoint_uuid/restore',
  contactPoint.restore
)

router.get('/:contact_uuid/archive', contact.action('archive'))
router.post('/:contact_uuid/archive', contact.archive)

router.get('/:contact_uuid/restore', contact.action('restore'))
router.post('/:contact_uuid/restore', contact.restore)

router.all('/:contact_uuid/new', contact.readForm('new'))
router.get('/:contact_uuid/new', contact.showForm)
router.post('/:contact_uuid/new', contact.updateForm, contact.update('new'))

router.all('/:contact_uuid/edit', contact.readForm('edit'))
router.get('/:contact_uuid/edit', contact.showForm)
router.post('/:contact_uuid/edit', contact.updateForm, contact.update('edit'))

export const contactRoutes = router
