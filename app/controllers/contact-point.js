import { ContactPointSource, ContactPointType } from '../enums.js'
import { Contact } from '../models.js'
import { today } from '../utils/date.js'
import { saveAndRedirect } from '../utils/redirect.js'

/**
 * Get the value given in a contact point form
 *
 * @param {object} [body] - Contact point form data
 * @param {ContactPointType} type - Type of contact point
 * @returns {string|undefined} Phone number or email address
 */
const getValue = (body, type) =>
  (type === ContactPointType.Email ? body?.email : body?.tel)?.trim()

/**
 * Save a contact’s contact points, and return to the child’s contacts
 *
 * @param {import('express').Request} request - Request
 * @param {import('express').Response} response - Response
 * @param {string} type - Form or action type
 * @returns {void}
 */
const saveContactPoints = (request, response, type) => {
  const { data } = request.session
  const { __, contact, contactPoint } = response.locals

  Contact.update(contact.uuid, { contactPoints: contact.contactPoints }, data)

  // Clean up session data
  delete data.contactPoint

  request.flash('success', __(`contactPoint.${type}.success`, { contactPoint }))

  return saveAndRedirect(request, response, response.locals.back)
}

export const contactPointController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, contactPoint_uuid) {
    const { contact } = response.locals

    const contactPoint = contact?.contactPoints.find(
      ({ uuid }) => uuid === contactPoint_uuid
    )
    if (!contactPoint) {
      return response.sendStatus(404)
    }

    response.locals.contactPoint = contactPoint
    response.locals.type = contactPoint.type.toLowerCase()

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  setBack(request, response, next) {
    const { contact } = response.locals

    response.locals.back = `/patients/${contact.patient_uuid}/contacts`

    next()
  },

  /**
   * @param {ContactPointType} type - Type of contact point to add
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  showForm(type) {
    return (request, response) => {
      response.render('contact-point/form', {
        field: type === ContactPointType.Email ? 'email' : 'tel'
      })
    }
  },

  /**
   * @param {ContactPointType} type - Type of contact point to add
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  create(type) {
    return (request, response) => {
      const { account, contact } = response.locals
      const value = getValue(request.body.contactPoint, type)

      if (!value) {
        return response.redirect(request.originalUrl)
      }

      // Adds a source to a contact point with the same value, if there is one
      const contactPointCount = contact.contactPoints.length
      response.locals.contactPoint = contact.addContactPoint({
        createdAt: today(),
        createdBy_uid: account?.uid,
        type,
        value,
        sources: [ContactPointSource.Manual]
      })

      const wasAdded = contact.contactPoints.length > contactPointCount

      return saveContactPoints(request, response, wasAdded ? 'new' : 'update')
    }
  },

  /**
   * @param {string} type - Action type (archive or restore)
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  showAction(type) {
    return (request, response) => {
      response.render('contact-point/action', { actionType: type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  archive(request, response) {
    const { account, contactPoint } = response.locals

    contactPoint.archivedAt = today()
    contactPoint.archivedBy_uid = account?.uid

    return saveContactPoints(request, response, 'archive')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  restore(request, response) {
    const { contactPoint } = response.locals

    contactPoint.archivedAt = undefined
    contactPoint.archivedBy_uid = undefined

    return saveContactPoints(request, response, 'restore')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
