import { Parent, Patient } from '../models.js'

export const parentController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, parent_uuid) {
    response.locals.parent = Parent.findOne(parent_uuid, request.session.data)

    next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  new(request, response) {
    const { patient_uuid } = request.query
    const { data } = request.session

    const parent = Parent.create(
      {
        patient_uuid
      },
      data.wizard
    )

    return response.redirect(`${parent.uri}/new`)
  },

  /**
   * @param {string} [type] - Form type
   * @returns {import("express").RequestHandler} - Request handler
   */
  update(type) {
    return (request, response) => {
      const { parent_uuid } = request.params
      const { data } = request.session
      const { __, back } = response.locals

      // Update session data
      let parent
      if (type === 'new') {
        parent = Parent.create(data.wizard.parents[String(parent_uuid)], data)

        // Add parent to patient contacts
        const patient = Patient.findOne(parent.patient_uuid, data)
        patient.addContact(parent)
      } else {
        parent = Parent.update(
          parent_uuid,
          data.wizard.parents[String(parent_uuid)],
          data
        )
      }

      // Clean up session data
      delete data.parent
      delete data.wizard

      request.flash('success', __(`parent.${type}.success`, { parent }))

      return response.redirect(back)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { parent_uuid } = request.params
      const { data } = request.session

      // Setup wizard if not already setup
      let parent = Parent.findOne(parent_uuid, data.wizard)
      if (!parent) {
        parent = Parent.create(response.locals.parent, data.wizard)
      }

      response.locals.parent = new Parent(parent, data)
      response.locals.back = `/patients/${parent.patient_uuid}/contacts`
      response.locals.type = type

      next()
    }
  },

  /**
   * @type {import("express").RequestHandler}
   */
  showForm(request, response) {
    return response.render(`parent/form/edit`)
  },

  updateForm(request, response, next) {
    const { parent_uuid } = request.params
    const { data } = request.session

    Parent.update(parent_uuid, request.body.parent, data.wizard)

    return next()
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
   */
  action(type) {
    return (request, response) => {
      const { parent } = response.locals

      response.render('parent/action', {
        back: `/patients/${parent.patient_uuid}/contacts`,
        type
      })
    }
  },

  /**
   * @type {import("express").RequestHandler}
   */
  delete(request, response) {
    const { parent_uuid } = request.params
    const { data } = request.session
    const { __, parent } = response.locals

    Parent.delete(parent_uuid, data)

    request.flash('success', __(`parent.delete.success`))

    return response.redirect(`/patients/${parent.patient_uuid}/contacts`)
  }
}
