import wizard from '@x-govuk/govuk-prototype-wizard'

import _ from 'lodash'
import { fakerEN_GB as faker } from '@faker-js/faker'

import { ParentalRelationship, SessionPresets } from '../enums.js'
import { ClinicAppointment, ClinicBooking, Programme } from '../models.js'

import allProgrammesData from '../datasets/programmes.js'

export const bookIntoClinicController = {

  // Load the preset into locals
  read(request, response, next, session_preset_slug) {

    // Record both the session preset (aka "primary programme" to the parent) and the programme types that comprises
    const sessionPreset = SessionPresets.find(preset => preset.slug === session_preset_slug) ?? SessionPresets[0]
    response.locals.sessionPreset = sessionPreset

    // Allow us to list the programmes for which the parent's been invited to book an appointment
    const programmes = sessionPreset.programmeTypes.map(pt => Programme.findOne(allProgrammesData[pt].id, request.session.data))
    response.locals.programmes = programmes

    // Allow us to offer a phone booking if not wanting online
    response.locals.bookingPhoneNumber = request.session.data.teams[0]?.tel ?? faker.helpers.replaceSymbols('01### ######')

    next()
  },

  /**
   * Send to the start page
   * @param {*} request 
   * @param {*} response 
   */
  redirect(request, response) {
    console.log('controller.redirect\n  route: ' + request.path)
    const { sessionPreset } = response.locals

    const redirectTo = `${request.baseUrl}/${sessionPreset.slug}/start`
    console.log('   -> redirect: ' + (redirectTo || '<empty>'))
    response.redirect(redirectTo)
  },

  /**
   * Start a new clinic booking for clinics with the primary programme we've been given
   * 
   * @param {*} request 
   * @param {*} response 
   */
  new(request, response) {
    console.log('controller.new\n  route: ' + request.path)
    const { data } = request.session
    const { sessionPreset } = response.locals

    // TODO:
    //  [X] Add a SessionPreset property to the ClinicBooking model, so that we know what type of session the children have been invited to.
    //  [ ] Update the generators to make sure things are created right
    //  [ ] Create enough different clinic sessions of the right types to cover the different presets?

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
    console.log('controller.readForm\n  route: ' + request.path)
    const { session_preset_slug, booking_uuid, appointment_uuid } = request.params
    const { data, referrer } = request.session

    // Create objects on the global context to allow us to check branching conditions, etc.
    let booking, appointment
    if (booking_uuid) {
      booking = new ClinicBooking(ClinicBooking.findOne(booking_uuid, data?.wizard), data)
      response.locals.booking = booking

      if (appointment_uuid) {
        appointment = new ClinicAppointment((ClinicAppointment.findOne(appointment_uuid, data?.wizard)), data)
        response.locals.appointment = appointment
      }
    }

    const journey = {
      [`/${session_preset_slug}`]: {},  // is this ever actually used? Suspect not...unless when going back from child-count.
      [`/${session_preset_slug}/${booking_uuid}/new/child-count`]: {},
      
      // Child journey
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/child`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/dob`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/parental-relationship`]: {
        [`/${session_preset_slug}/new/${appointment_uuid}/vaccination-choice`]: {
          data: 'booking.appointments[appointment_uuid].parent.hasParentalResponsibility',
          value: 'true'
        },
      },
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/parental-relationship`]: {},  // allow the *booking* to continue, but stress that someone with responsibility must *attend*
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/vaccination-choice`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/extra-time`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/preferred-location`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-location`]: {
          data: 'booking.appointments[appointment_uuid].preferredPostCode',
          value: 'true'
        }
      },
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/preferred-location-matches`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-location`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-date`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/appointment-time-range`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/appointment-time`]: {},
      // Optional sub-journey for child's health questions
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/health-questions`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/parent`]: {
          data: 'booking.appointments[appointment_uuid].optedIntoHealthQuestions',
          value: 'false'
        },
      },

      // TODO insert the series of health questions here, merging questions from all of a single child's
      //      selected vaccinations and removing duplicate questions
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/dummy-health-question-journey`]: {},

      // Parent journey
      [`/${session_preset_slug}/${booking_uuid}/new/parent`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/check-answers`]: () =>
          !booking?.appointments[appointment_uuid]?.parent?.tel
      },
      [`/${session_preset_slug}/${booking_uuid}/new/contact-preference`]: {},

      // Check answers
      [`/${session_preset_slug}/${booking_uuid}/new/check-answers`]: {}
    }

    const paths = wizard(journey, request)
    paths.back = referrer || paths.back
    response.locals.paths = paths

    // Prepare the radio options for the parental relationship page
    response.locals.parentalRelationshipItems = Object.values(ParentalRelationship)
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
    console.log('controller.showForm\n  route: ' + request.path)
    const { view } = request.params

    const viewPath = `book-into-a-clinic/form/${view}`
    console.log('   -> render: ' + viewPath + '.njk')
    response.render(viewPath)
  },

  /**
   * Store the latest values entered into a form in the booking journey
   * 
   * @param {*} request 
   * @param {*} response 
   */
  updateForm(request, response) {
    console.log('controller.updateForm\n  route: ' + request.path)
    const { booking_uuid, appointment_uuid } = request.params
    const { data } = request.session
    const { paths } = response.locals

    // MAL: the implication of this line is that all form values that need to be saved *into the model*
    //      must have a `decorate` property value that starts with 'booking.' or 'appointment.'
    if (request.body.booking) {
      ClinicBooking.update(booking_uuid, request.body.booking, data.wizard)
    }
    if (request.body.appointment) {
      ClinicAppointment.update(appointment_uuid, request.body.appointment, data.wizard)
    }

    // If we've just set the child count, create the appointment to start the sub-journey and
    // put its uuid into the routes from this point on
    let redirectUrl = paths.next
    if (request.body.booking?.childCount !== undefined) {
      const booking = new ClinicBooking(ClinicBooking.findOne(booking_uuid, data.wizard), data)
      const appointment = ClinicAppointment.createInContext({ primary_programme_ids: booking.primaryProgrammeIDs }, data.wizard)

      const bookingUri = booking.bookingUri
      redirectUrl = `${request.baseUrl}/${bookingUri}/new/${appointment.appointmentUri}/child`
    }

    console.log('   -> redirect: ' + (redirectUrl || '<empty>'))
    response.redirect(redirectUrl)
  },

  /**
   * Catch-all for pages not needing to reference a given clinic booking
   * 
   * @param {*} request 
   * @param {*} response 
   */
  show(request, response) {
    console.log('controller.show\n  route: ' + request.path)

    const view = request.params.view || 'start'

    const viewPath = `book-into-a-clinic/${view}`
    console.log('   -> render: ' + viewPath + '.njk')
    response.render(viewPath)
  }
}
