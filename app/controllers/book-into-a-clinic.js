import { fakerEN_GB as faker } from '@faker-js/faker'
import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import { ParentalRelationship, SessionPresets } from '../enums.js'
import { ClinicAppointment, ClinicBooking } from '../models.js'
import {
  getAllAppointmentPaths,
  getHealthQuestionPaths
} from '../utils/clinic-appointment.js'
import { kebabToCamelCase } from '../utils/string.js'

export const bookIntoClinicController = {
  /**
   * Record the session preset
   *
   * @param {*} request
   * @param {*} response
   * @param {*} next
   * @param {*} session_preset_slug
   */
  read(request, response, next, session_preset_slug) {
    const serviceName = 'Book into a clinic'

    response.locals.assetsName = 'public'
    response.locals.serviceName = serviceName
    response.locals.headerOptions = { service: { text: serviceName } }

    // Record the session preset (aka "primary programme" to the parent)
    const sessionPreset =
      SessionPresets.find((preset) => preset.slug === session_preset_slug) ??
      SessionPresets[0]
    response.locals.sessionPreset = sessionPreset

    // Allow us to offer a phone booking if not wanting online (start.njk)
    response.locals.bookingPhoneNumber =
      request.session.data.teams[0]?.tel ??
      faker.helpers.replaceSymbols('01### ######')

    next()
  },

  /**
   * Send to the start page
   *
   * @param {*} request
   * @param {*} response
   */
  redirect(request, response) {
    const { sessionPreset } = response.locals

    response.redirect(`${request.baseUrl}/${sessionPreset.slug}/start`)
  },

  /**
   * Start a new clinic booking for clinics with the primary programme we've been given
   *
   * @param {*} request
   * @param {*} response
   */
  new(request, response) {
    const { data } = request.session
    const { sessionPreset } = response.locals

    // Create a new clinic booking in the wizard context
    const booking = ClinicBooking.createInContext(
      {
        sessionPreset
      },
      data.wizard
    )

    // Redirect to the first page in the booking journey (after the start page, that is)
    const redirectUrl = `${request.baseUrl}/${booking.bookingUri}/new/child-count`
    response.redirect(redirectUrl)
  },

  /**
   * Prepare a form-based page of the clinic booking journey.
   *
   * This includes code to set up radio button groups for various pages (we set them up
   * regardless of which specific route we're handling).
   *
   * @param {*} request
   * @param {*} response
   * @param {*} next
   */
  readForm(request, response, next) {
    const { session_preset_slug, booking_uuid } = request.params
    const appointment_uuid = request.params.appointment_uuid
    const { data, referrer } = request.session

    /** NOTE:
     *
     * The nature of the journey here is complex, as there are two separate sections in which we need to
     * iterate over children. Or over appointments, if you want to think of it that way (each child has
     * their own appointment).
     *
     * So, it goes:
     * - Start page
     * - How many children?
     *   - Child name         <-- first page of the per-child appointment journey
     *   - Child DOB
     *   - ...
     *   - Appointment time   <-- final page of the per-child appointment journey; iterate to next child if required
     * - Parent info
     * - Health questions?
     *   - Health question 1  <-- first page of the per-child health question journey
     *   - ...
     *   - Health question n  <-- final page of the per-child health question journey; iterate to next child if required
     * - Check answers
     * - Confirmation
     *
     * So, at the point where we start the health questions journey, we need to set up the iteration again, overriding
     * the default paths.next given to us by the wizard() function so that we can re-inject the appointment_uuid into
     * the path (the "Health questions?" page won't have that parameter).
     *
     * */

    // Create objects on the global context to allow us to check branching conditions, etc.
    // And make them available to the view.
    let booking, appointment
    if (booking_uuid) {
      booking = new ClinicBooking(
        ClinicBooking.findOne(booking_uuid, data?.wizard),
        data
      )
      response.locals.booking = booking

      if (appointment_uuid) {
        appointment = new ClinicAppointment(
          ClinicAppointment.findOne(appointment_uuid, data?.wizard),
          data
        )
        response.locals.appointment = appointment
        response.locals.childNumber =
          booking.appointments_ids.indexOf(appointment.uuid) + 1
        response.locals.childCount = booking.appointments_ids.length
        response.locals.firstName =
          appointment.unmatchedFirstName || 'your child'
        response.locals.fullName = appointment.fullName || 'your child'
      }
    }

    // Make sure the views have access to information about flow control e.g. for narrowing down a clinic search
    let transaction
    if (data.wizard?.transaction) {
      transaction = data.wizard?.transaction
      response.locals.transaction = transaction
    }

    const journey = {
      [`/${session_preset_slug}`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/child-count`]: {},

      // Appointment journey; once per child
      ...getAllAppointmentPaths(booking),

      // Parent journey
      [`/${session_preset_slug}/${booking_uuid}/new/parent`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/offer-health-questions`]:
          () => !request.session.data.booking?.parent?.tel
      },
      [`/${session_preset_slug}/${booking_uuid}/new/contact-preference`]: {},

      // Health questions (optional)
      [`/${session_preset_slug}/${booking_uuid}/new/offer-health-questions`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/check-answers`]: {
          data: 'transaction.optedIntoHealthQuestions',
          value: 'false'
        }
      },

      // For each child being booked in, and their selected vaccinations, ask the
      // relevant health questions and impairments/adjustments questions
      ...getHealthQuestionPaths(
        `/${session_preset_slug}/${booking_uuid}/new/`,
        booking_uuid,
        data.wizard,
        data
      ),

      // Check answers
      [`/${session_preset_slug}/${booking_uuid}/new/check-answers`]: {},

      // Confirmation! \o/
      [`/${session_preset_slug}/${booking_uuid}/new/confirmation`]: {}
    }

    const paths = wizard(journey, request)
    paths.back = referrer || paths.back
    response.locals.paths = paths // used later to redirect in updateForm

    // Prepare the radio options for the parental relationship page
    response.locals.parentalRelationshipItems = Object.values(
      ParentalRelationship
    )
      .filter((relationship) => relationship !== ParentalRelationship.Unknown)
      .map((relationship) => ({
        text: relationship,
        value: relationship
      }))

    next()
  },

  /**
   * Render the requested form page
   *
   * @param {*} request
   * @param {*} response
   */
  showForm(request, response) {
    const { appointment } = response.locals
    let { view } = request.params

    // All health questions use the same view
    let key
    if (view.startsWith('health-question-')) {
      key = kebabToCamelCase(view.replace('health-question-', ''))
      view = 'health-question'
    }

    // Only ask for details if question does not have sub-questions
    const hasSubQuestions =
      appointment?.getHealthQuestionsForSelectedProgrammes(
        request.session.data
      )[key]?.conditional

    response.render(`book-into-a-clinic/form/${view}`, { key, hasSubQuestions })
  },

  /**
   * Store the latest values entered into a form in the booking journey
   *
   * @param {*} request
   * @param {*} response
   */
  updateForm(request, response) {
    const { booking_uuid, appointment_uuid } = request.params
    const { data } = request.session
    const { paths } = response.locals

    // Store values from the posted form
    if (request.body.booking) {
      ClinicBooking.update(booking_uuid, request.body.booking, data.wizard)
    }
    if (request.body.appointment) {
      ClinicAppointment.update(
        appointment_uuid,
        request.body.appointment,
        data.wizard
      )
    }
    if (request.body.transaction) {
      data.wizard.transaction = data.wizard.transaction ?? {}
      _.merge(data.wizard.transaction, request.body.transaction)
    }

    // If we've just set the child count, create the appointments we'll need
    if (request.originalUrl.endsWith('/new/child-count')) {
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)

      let desiredCount = Number(data.wizard.transaction.childCount)
      desiredCount = isNaN(desiredCount) || desiredCount < 1 ? 1 : desiredCount
      const existingCount = booking.appointments_ids.length

      const childrenToAdd = Math.max(0, desiredCount - existingCount)
      const childrenToRemove = Math.max(0, existingCount - desiredCount)
      for (let index = 0; index < childrenToAdd; index++) {
        const appointment = ClinicAppointment.createInContext(
          { primary_programme_ids: booking.primaryProgrammeIDs },
          data.wizard
        )

        booking.addAppointment(appointment)
      }
      for (let index = 0; index < childrenToRemove; index++) {
        const appointment_uuid = booking.removeLastAppointment()
        ClinicAppointment.delete(appointment_uuid, data.wizard)
      }

      // Start the appointment journey for the first child
      const firstAppointment = booking.appointments[0]
      response.redirect(
        `${request.baseUrl}/${booking.bookingUri}/new/${firstAppointment.appointmentUri}/child`
      )
    } else {
      // Continue to the next page in the journey
      response.redirect(paths.next)
    }
  },

  /**
   * Catch-all for pages not needing to reference a given clinic booking
   *
   * @param {*} request
   * @param {*} response
   */
  show(request, response) {
    const view = request.params.view || 'start'

    response.render(`book-into-a-clinic/${view}`)
  }
}
