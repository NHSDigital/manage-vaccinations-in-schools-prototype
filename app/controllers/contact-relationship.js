import { RelationshipType } from '../enums.js'
import { ContactRelationship, Patient } from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const contactRelationshipController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, contactRelationship_uuid) {
    response.locals.contactRelationship = ContactRelationship.findOne(
      contactRelationship_uuid,
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

    const contactRelationship = ContactRelationship.create(
      {
        patient_uuid
      },
      data.wizard
    )

    return saveAndRedirect(request, response, `${contactRelationship.uri}/new`)
  },

  /**
   * @param {string} [type] - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(type) {
    return (request, response) => {
      const { contactRelationship_uuid } = request.params
      const { data } = request.session
      const { __, back } = response.locals

      // Update session data
      let contactRelationship
      if (type === 'new') {
        contactRelationship = ContactRelationship.create(
          data.wizard.contactRelationships[contactRelationship_uuid],
          data
        )

        // Add contact to patient contacts
        const patient = Patient.findOne(contactRelationship.patient_uuid, data)
        patient.addContactRelationship(contactRelationship)
      } else {
        contactRelationship = ContactRelationship.update(
          contactRelationship_uuid,
          data.wizard.contactRelationships[contactRelationship_uuid],
          data
        )
      }

      // Clean up session data
      delete data.contactRelationship
      delete data.wizard

      request.flash(
        'success',
        __(`contactRelationship.${type}.success`, { contactRelationship })
      )

      return saveAndRedirect(request, response, back)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { contactRelationship_uuid } = request.params
      const { data } = request.session

      // Setup wizard if not already setup
      let contactRelationship = ContactRelationship.findOne(
        contactRelationship_uuid,
        data.wizard
      )
      if (!contactRelationship) {
        contactRelationship = ContactRelationship.create(
          response.locals.contactRelationship,
          data.wizard
        )
      }

      response.locals.contactRelationship = new ContactRelationship(
        contactRelationship,
        data
      )
      response.locals.back = `/patients/${contactRelationship.patient_uuid}/contacts`
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

    return response.render(`contact-relationship/form/edit`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response, next) {
    const { contactRelationship_uuid } = request.params
    const { data } = request.session

    ContactRelationship.update(
      contactRelationship_uuid,
      request.body.contactRelationship,
      data.wizard
    )

    return next()
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      const { contactRelationship } = response.locals

      response.render('contact-relationship/action', {
        back: `/patients/${contactRelationship.patient_uuid}/contacts`,
        type
      })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  delete(request, response) {
    const { contactRelationship_uuid } = request.params
    const { data } = request.session
    const { __, contactRelationship } = response.locals

    // Remove contact from the child’s record, so it doesn’t point to nothing
    const patient = Patient.findOne(contactRelationship.patient_uuid, data)
    if (patient) {
      const contactRelationship_uuids =
        patient.contactRelationship_uuids.filter(
          (uuid) => uuid !== contactRelationship_uuid
        )
      Patient.update(patient.uuid, { contactRelationship_uuids }, data)
    }

    ContactRelationship.delete(contactRelationship_uuid, data)

    request.flash('success', __(`contactRelationship.delete.success`))

    return saveAndRedirect(
      request,
      response,
      `/patients/${contactRelationship.patient_uuid}/contacts`
    )
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
