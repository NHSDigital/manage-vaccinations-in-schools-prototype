import activity from '../datasets/activity.js'
import { ContactSource, ContactType } from '../enums.js'
import { ContactRelationship } from '../models.js'
import { today } from '../utils/date.js'
import { saveAndRedirect } from '../utils/redirect.js'

/**
 * Get the value given in a contact point form
 *
 * @param {object} [body] - Contact point form data
 * @param {ContactType} type - Type of contact point
 * @returns {string|undefined} Phone number or email address
 */
const getValue = (body, type) =>
  (type === ContactType.Email ? body?.email : body?.tel)?.trim()

/**
 * Save a contact’s contact points, and return to the child’s contacts
 *
 * @param {import('express').Request} request - Request
 * @param {import('express').Response} response - Response
 * @param {string} type - Form or action type
 * @returns {void}
 */
const saveContacts = (request, response, type) => {
  const { data } = request.session
  const { __, account, contactRelationship, contact } = response.locals

  ContactRelationship.update(
    contactRelationship.uuid,
    { contacts: contactRelationship.contacts },
    data
  )

  // Record the change in the child’s activity log
  const events = {
    new: activity.patient.contactAdded,
    update: activity.patient.contactUpdated,
    archive: activity.patient.contactArchived,
    restore: activity.patient.contactRestored
  }
  contactRelationship.patient?.addContactRelationshipEvent(
    events[type](contactRelationship, contact),
    account?.uid
  )

  // Clean up session data
  delete data.contact

  request.flash('success', __(`contact.${type}.success`, { contact }))

  return saveAndRedirect(request, response, response.locals.back)
}

export const contactController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, contact_uuid) {
    const { contactRelationship } = response.locals

    const contact = contactRelationship?.contacts.find(
      ({ uuid }) => uuid === contact_uuid
    )
    if (!contact) {
      return response.sendStatus(404)
    }

    response.locals.contact = contact
    response.locals.type = contact.type.toLowerCase()

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  setBack(request, response, next) {
    const { contactRelationship } = response.locals

    response.locals.back = `/patients/${contactRelationship.patient_uuid}/contacts`

    next()
  },

  /**
   * @param {ContactType} type - Type of contact point to add
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  showForm(type) {
    return (request, response) => {
      response.render('contact/form', {
        field: type === ContactType.Email ? 'email' : 'tel'
      })
    }
  },

  /**
   * @param {ContactType} type - Type of contact point to add
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  create(type) {
    return (request, response) => {
      const { account, contactRelationship } = response.locals
      const value = getValue(request.body.contact, type)

      if (!value) {
        return response.redirect(request.originalUrl)
      }

      // Adds a source to a contact point with the same value, if there is one
      const contactPointCount = contactRelationship.contacts.length
      response.locals.contact = contactRelationship.addContact({
        createdAt: today(),
        createdBy_uid: account?.uid,
        type,
        value,
        sources: [ContactSource.Manual]
      })

      const wasAdded = contactRelationship.contacts.length > contactPointCount

      return saveContacts(request, response, wasAdded ? 'new' : 'update')
    }
  },

  /**
   * @param {string} type - Action type (archive or restore)
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  showAction(type) {
    return (request, response) => {
      response.render('contact/action', { actionType: type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  archive(request, response) {
    const { account, contact } = response.locals

    contact.archivedAt = today()
    contact.archivedBy_uid = account?.uid

    return saveContacts(request, response, 'archive')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  restore(request, response) {
    const { contact } = response.locals

    contact.archivedAt = undefined
    contact.archivedBy_uid = undefined

    return saveContacts(request, response, 'restore')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
