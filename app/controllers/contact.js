import { Contact, Patient } from '../models.js'

export const contactController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, contact_uuid) {
    response.locals.contact = Contact.findOne(
      contact_uuid,
      request.session.data
    )

    next()
  },

  /**
   * @type {import("express").RequestHandler}
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

    return response.redirect(`${contact.uri}/new`)
  },

  /**
   * @param {string} [type] - Form type
   * @returns {import("express").RequestHandler} - Request handler
   */
  update(type) {
    return (request, response) => {
      const { contact_uuid } = request.params
      const { data } = request.session
      const { __, back } = response.locals

      // Update session data
      let contact
      if (type === 'new') {
        contact = Contact.create(
          data.wizard.contacts[String(contact_uuid)],
          data
        )

        // Add contact to patient contacts
        const patient = Patient.findOne(contact.patient_uuid, data)
        patient.addContact(contact)
      } else {
        contact = Contact.update(
          contact_uuid,
          data.wizard.contacts[String(contact_uuid)],
          data
        )
      }

      // Clean up session data
      delete data.contact
      delete data.wizard

      request.flash('success', __(`contact.${type}.success`, { contact }))

      return response.redirect(back)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
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
   * @type {import("express").RequestHandler}
   */
  showForm(request, response) {
    return response.render(`contact/form/edit`)
  },

  updateForm(request, response, next) {
    const { contact_uuid } = request.params
    const { data } = request.session

    Contact.update(contact_uuid, request.body.contact, data.wizard)

    return next()
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
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
   * @type {import("express").RequestHandler}
   */
  delete(request, response) {
    const { contact_uuid } = request.params
    const { data } = request.session
    const { __, contact } = response.locals

    Contact.delete(contact_uuid, data)

    request.flash('success', __(`contact.delete.success`))

    return response.redirect(`/patients/${contact.patient_uuid}/contacts`)
  }
}
