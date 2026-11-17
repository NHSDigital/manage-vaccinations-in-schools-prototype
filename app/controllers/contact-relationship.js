import activity from '../datasets/activity.js'
import { ContactSource, RelationshipType } from '../enums.js'
import { ContactRelationship, Patient } from '../models.js'
import { today } from '../utils/date.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const contactRelationshipController = {
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
      const { __, account, back } = response.locals

      // Update session data
      let contactRelationship
      if (type === 'new') {
        // Phone numbers and email addresses given were added manually
        contactRelationship = new ContactRelationship(
          data.wizard.contactRelationships[contactRelationship_uuid],
          data
        )
        for (const contact of contactRelationship.contacts) {
          contact.sources = [ContactSource.Manual]
          contact.createdBy_uid = account?.uid
        }

        contactRelationship = ContactRelationship.create(
          contactRelationship,
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
  archive(request, response) {
    const { contactRelationship_uuid } = request.params
    const { data } = request.session
    const { __, account, contactRelationship } = response.locals

    ContactRelationship.update(
      contactRelationship_uuid,
      { archivedAt: today(), archivedBy_uid: account?.uid },
      data
    )

    contactRelationship.patient?.addContactRelationshipEvent(
      activity.patient.contactRelationshipArchived(contactRelationship),
      account?.uid
    )

    request.flash(
      'success',
      __(`contactRelationship.archive.success`, { contactRelationship })
    )

    return saveAndRedirect(
      request,
      response,
      `/patients/${contactRelationship.patient_uuid}/contacts`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  restore(request, response) {
    const { contactRelationship_uuid } = request.params
    const { data } = request.session
    const { __, account, contactRelationship } = response.locals

    // Contact model’s `update` merges values, so remove these directly
    delete data.contactRelationships[contactRelationship_uuid].archivedAt
    delete data.contactRelationships[contactRelationship_uuid].archivedBy_uid

    contactRelationship.patient?.addContactRelationshipEvent(
      activity.patient.contactRelationshipRestored(contactRelationship),
      account?.uid
    )

    request.flash(
      'success',
      __(`contactRelationship.restore.success`, { contactRelationship })
    )

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
