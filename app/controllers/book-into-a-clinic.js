import { fakerEN_GB as faker } from '@faker-js/faker'
import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import { ParentalRelationship, SessionPresets } from '../enums.js'
import { ClinicAppointment, ClinicBooking } from '../models.js'
import {
  getAllAppointmentPaths,
  getHealthQuestionPaths,
  getPreviousAddressItems
} from '../utils/clinic-appointment.js'
import { kebabToCamelCase } from '../utils/string.js'

export const bookIntoClinicController = {
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

  redirect(request, response) {
    const { sessionPreset } = response.locals

    response.redirect(`${request.baseUrl}/${sessionPreset.slug}/start`)
  },

  new(request, response) {
    const { data } = request.session
    const { sessionPreset } = response.locals

    // Create a new clinic booking in the wizard context
    const booking = ClinicBooking.create(
      {
        sessionPreset
      },
      data.wizard
    )

    // Redirect to the first page in the booking journey (after the start page, that is)
    const redirectUrl = `${request.baseUrl}/${booking.bookingUri}/new/child-count`
    response.redirect(redirectUrl)
  },

  readForm(request, response, next) {
    const { session_preset_slug, booking_uuid } = request.params
    const appointment_uuid = request.params.appointment_uuid
    const { data, referrer } = request.session

    /**
     * NOTE:
     *
     * The nature of the journey here is complex, as there are two separate sections in which we need to
     * iterate over children. Or over appointments, if you want to think of it that way (each child has
     * their own appointment). And the second iteration - the health questions - has pages that are
     * dependent on the answers given during the appointment booking (specifically, the choice of vaccines
     * per child).
     *
     * So, it goes:
     * - Start page
     * - How many children?
     *   - Child name         <-- first page of the per-child appointment journey
     *   - Child DOB
     *   - ...
     *   - Appointment time   <-- final page of the per-child appointment journey; iterate to next child if required
     * - Parent info
     * - Check answers
     * - Health questions?
     *   - Health question 1  <-- first page of the per-child health question journey
     *   - ...
     *   - Health question n  <-- final page of the per-child health question journey; iterate to next child if required
     * - Confirmation
     *
     */

    // Create objects on the global context to allow us to check branching conditions, etc.
    // And make them available to the view.
    let booking, appointments, currentAppointment
    if (booking_uuid) {
      const wizardBooking = ClinicBooking.findOne(booking_uuid, data?.wizard)
      appointments = wizardBooking.appointments
      booking = new ClinicBooking(wizardBooking, data)
      response.locals.booking = booking

      if (appointment_uuid) {
        currentAppointment = new ClinicAppointment(
          ClinicAppointment.findOne(appointment_uuid, data?.wizard),
          data
        )
        response.locals.appointment = currentAppointment
        response.locals.childNumber =
          booking.appointments_ids.indexOf(currentAppointment.uuid) + 1
        response.locals.childCount = booking.appointments_ids.length
        response.locals.firstName = currentAppointment.firstName || 'your child'
        response.locals.fullName = currentAppointment.fullName || 'your child'
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
      ...getAllAppointmentPaths(
        session_preset_slug,
        booking_uuid,
        request.session.data,
        appointments
      ),

      // Parent journey
      [`/${session_preset_slug}/${booking_uuid}/new/parent`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/offer-health-questions`]:
          () => !request.session.data.booking?.parent?.tel
      },
      [`/${session_preset_slug}/${booking_uuid}/new/contact-preference`]: {},

      // Check answers
      [`/${session_preset_slug}/${booking_uuid}/new/check-answers`]: {},

      // Health questions (optional)
      [`/${session_preset_slug}/${booking_uuid}/new/offer-health-questions`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/confirmation`]: {
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

  showForm(request, response) {
    const { appointment } = response.locals
    const { data } = request.session
    let { booking_uuid, view } = request.params

    // Build the options for the selection of a home address address from those already entered
    if (view === 'address-selection') {
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      response.locals.previousAddressItems = getPreviousAddressItems(
        booking.appointments
      )
    }

    // All health questions use the same view
    let key
    if (view.startsWith('health-question-')) {
      key = kebabToCamelCase(view.replace('health-question-', ''))
      view = 'health-question'
    }

    // Only ask for details if question does not have sub-questions
    const hasSubQuestions =
      appointment?.getHealthQuestionsForSelectedProgrammes(data)[key]
        ?.conditional

    response.render(`book-into-a-clinic/form/${view}`, { key, hasSubQuestions })
  },

  updateForm(request, response) {
    const { booking_uuid, appointment_uuid, view } = request.params
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

    let nextUrl = paths.next

    if (view === 'child-count') {
      // We've just set the child count, so create the appointments we'll need
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)

      let desiredCount = Number(data.wizard.transaction.childCount)
      desiredCount = isNaN(desiredCount) || desiredCount < 1 ? 1 : desiredCount
      const existingCount = booking.appointments_ids.length

      const childrenToAdd = Math.max(0, desiredCount - existingCount)
      const childrenToRemove = Math.max(0, existingCount - desiredCount)
      Array.from({ length: childrenToAdd }).forEach(() => {
        const appointment = ClinicAppointment.create(
          { primary_programme_ids: booking.primaryProgrammeIDs },
          data.wizard
        )

        booking.addAppointment(appointment)
      })
      Array.from({ length: childrenToRemove }).forEach(() => {
        const appointment_uuid = booking.removeLastAppointment()
        ClinicAppointment.delete(appointment_uuid, data.wizard)
      })

      // Start the appointment journey for the first child
      const firstAppointment = booking.appointments[0]
      const firstAppointmentUrl = `${request.baseUrl}/${booking.bookingUri}/new/${firstAppointment.appointmentUri}/child`
      nextUrl = firstAppointmentUrl
    } else if (
      view === 'address-selection' &&
      request.body.transaction.addressChoice !== 'new'
    ) {
      // We've just selected a previous child's address for the current appointment, so copy
      // that detail to the child record
      const previous_appointment_uuid = request.body.transaction.addressChoice
      const previousAppointment = ClinicAppointment.findOne(
        previous_appointment_uuid,
        data.wizard
      )
      const currentAppointment = ClinicAppointment.findOne(
        appointment_uuid,
        data.wizard
      )

      if (previousAppointment && currentAppointment) {
        currentAppointment.child.address = previousAppointment.child.address
        ClinicAppointment.update(
          currentAppointment.uuid,
          currentAppointment,
          currentAppointment.context
        )
      }
    }

    // NB: request.session.save was needed to avoid race condition issues on heroku
    request.session.save((error) => {
      if (!error) response.redirect(nextUrl)
    })
  },

  show(request, response) {
    const view = request.params.view || 'start'

    response.render(`book-into-a-clinic/${view}`)
  }
}
