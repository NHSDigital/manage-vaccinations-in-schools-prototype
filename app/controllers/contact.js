import activity from '../datasets/activity.js'
import { ContactPointSource, RelationshipType } from '../enums.js'
import { Contact, Patient } from '../models.js'
import { today } from '../utils/date.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const contactController = {
  /**
   * Only users in a SAIS team (not school users) can change contacts
   *
   * @type {RequestHandler<Record<string, string>>}
   */
  checkCanChange(request, response, next) {
    if (response.locals.account?.isSchoolUser) {
      return response.sendStatus(403)
    }

    next()
  },

  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, contact_uuid) {
    response.locals.contact = Contact.findOne(
      contact_uuid,
      request.session.data
    )

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { patient_uuid } = request.query
    const { data } = request.session

    const contact = Contact.create(
      {
        patient_uuid
      },
      data.wizard
    )

    return saveAndRedirect(request, response, `${contact.uri}/new`)
  },

  /**
   * @param {string} [type] - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(type) {
    return (request, response) => {
      const { contact_uuid } = request.params
      const { data } = request.session
      const { __, account, back } = response.locals

      // Update session data
      let contact
      if (type === 'new') {
        // Phone numbers and email addresses given were added manually
        contact = new Contact(data.wizard.contacts[contact_uuid], data)
        for (const contactPoint of contact.contactPoints) {
          contactPoint.sources = [ContactPointSource.Manual]
          contactPoint.createdBy_uid = account?.uid
        }

        contact = Contact.create(contact, data)

        // Add contact to patient contacts
        const patient = Patient.findOne(contact.patient_uuid, data)
        patient.addContact(contact)
      } else {
        contact = Contact.update(
          contact_uuid,
          data.wizard.contacts[contact_uuid],
          data
        )
      }

      // Clean up session data
      delete data.contact
      delete data.wizard

      request.flash('success', __(`contact.${type}.success`, { contact }))

      return saveAndRedirect(request, response, back)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { contact_uuid } = request.params
      const { data } = request.session

      // Setup wizard if not already setup
      let contact = Contact.findOne(contact_uuid, data.wizard)
      if (!contact) {
        contact = Contact.create(response.locals.contact, data.wizard)
      }

      response.locals.contact = new Contact(contact, data)
      response.locals.back = `/patients/${contact.patient_uuid}/contacts`
      response.locals.type = type

      next()
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    // Prepare the radio options for the parental relationship
    response.locals.parentalRelationshipItems = Object.values(RelationshipType)
      .filter((relationship) => relationship !== RelationshipType.Unknown)
      .map((relationship) => ({
        text: relationship,
        value: relationship
      }))

    return response.render(`contact/form/edit`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response, next) {
    const { contact_uuid } = request.params
    const { data } = request.session

    Contact.update(contact_uuid, request.body.contact, data.wizard)

    return next()
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      const { contact } = response.locals

      response.render('contact/action', {
        back: `/patients/${contact.patient_uuid}/contacts`,
        type
      })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  archive(request, response) {
    const { contact_uuid } = request.params
    const { data } = request.session
    const { __, account, contact } = response.locals

    Contact.update(
      contact_uuid,
      { archivedAt: today(), archivedBy_uid: account?.uid },
      data
    )

    contact.patient?.addContactEvent(
      activity.patient.contactArchived(contact),
      account?.uid
    )

    request.flash('success', __(`contact.archive.success`, { contact }))

    return saveAndRedirect(
      request,
      response,
      `/patients/${contact.patient_uuid}/contacts`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  restore(request, response) {
    const { contact_uuid } = request.params
    const { data } = request.session
    const { __, account, contact } = response.locals

    // Contact model’s `update` merges values, so remove these directly
    delete data.contacts[contact_uuid].archivedAt
    delete data.contacts[contact_uuid].archivedBy_uid

    contact.patient?.addContactEvent(
      activity.patient.contactRestored(contact),
      account?.uid
    )

    request.flash('success', __(`contact.restore.success`, { contact }))

    return saveAndRedirect(
      request,
      response,
      `/patients/${contact.patient_uuid}/contacts`
    )
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
