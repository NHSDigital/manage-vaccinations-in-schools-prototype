import wizard from '@x-govuk/govuk-prototype-wizard'

import _ from 'lodash'
import { fakerEN_GB as faker } from '@faker-js/faker'

import { ParentalRelationship, SessionPresets } from '../enums.js'
import { ClinicBooking, Programme } from '../models.js'

import allProgrammesData from '../datasets/programmes.js'

export const bookIntoClinicController = {

  // Load the preset into locals
  read(request, response, next, session_preset_slug) {

    // Record both the session preset (aka "primary programme" to the parent) and the programme types that comprises
    const sessionPreset = SessionPresets.find(preset => preset.slug === session_preset_slug) ?? SessionPresets[0]
    response.locals.sessionPreset = sessionPreset

    const programmes = sessionPreset.programmeTypes.map(pt => Programme.findOne(allProgrammesData[pt].id, request.session.data))
    response.locals.programmes = programmes

    response.locals.bookingPhoneNumber = request.session.data.teams[0]?.tel ?? faker.helpers.replaceSymbols('01### ######')

    next()
  },

  /**
   * Send to the start page
   * @param {*} request 
   * @param {*} response 
   */
  redirect(request, response) {
    const { sessionPreset } = response.locals

    response.redirect(`/book-into-a-clinic/${sessionPreset.slug}/start`)
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

    // MAL: will this let me drop the :child_index part of the routes? (It's not in use yet, mind)
    // Track which child we're entering details for
    const childIteration = {
      childIndex: 0,
      childCount: 1
    }
    data.wizard.clinicBookingChildIteration = childIteration

    // Redirect to the first page in the booking journey (after the start page, that is)
    const redirectUrl = `${request.baseUrl}/${booking.bookingUri}/new/child-count`
    response.redirect(redirectUrl)
  },

  /**
   * Prepare a form-based page of the clinic booking journey.
   * 
   * This includes code to set up radio button groups for various pages (we set them up
   * regardless of which specific page we're being asked for).
   * 
   * @param {*} request 
   * @param {*} response 
   * @param {*} next 
   */
  readForm(request, response, next) {
    console.log('controller.readForm\n. route: ' + request.path)
    const { session_preset_slug, booking_uuid, child_index } = request.params
    const { data, referrer } = request.session

    // MAL: do I need to put child_index into response.locals so that the view can use it?
    // response.locals.child_index = child_index

    const booking = new ClinicBooking(ClinicBooking.findOne(booking_uuid, data?.wizard), data)
    response.locals.booking = booking

    const journey = {
      [`/${session_preset_slug}`]: {},
      [`/${session_preset_slug}/new/child-count`]: {},
      
      // Child journey
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/child`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/dob`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/parental-relationship`]: {
        [`/${session_preset_slug}/new/${child_index}/vaccination-choice`]: {
          data: 'booking.appointments[child_index].parent.hasParentalResponsibility',
          value: 'true'
        },
      },
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/parental-responsibility`]: {},  // allow the *booking* to continue, but stress that someone with responsibility must *attend*
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/vaccination-choice`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/extra-time`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/preferred-location`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/clinic-location`]: {
          data: 'booking.appointments[child_index].preferredPostCode',
          value: 'true'
        }
      },
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/preferred-location-matches`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/clinic-location`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/clinic-date`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/appointment-time-range`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/appointment-time`]: {},
      // Optional sub-journey for child's health questions
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/health-questions`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/parent`]: {
          data: 'booking.appointments[child_index].optedIntoHealthQuestions',
          value: 'false'
        },
      },

      // TODO insert the series of health questions here, merging questions from all of a single child's
      //      selected vaccinations and removing duplicate questions
      [`/${session_preset_slug}/${booking_uuid}/new/${child_index}/dummy-health-question-journey`]: {},

      // Parent journey
      [`/${session_preset_slug}/${booking_uuid}/new/parent`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/check-answers`]: () =>
          !booking?.appointments[child_index]?.parent?.tel
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
    console.log('controller.showForm\n. route: ' + request.path)
    const { view } = request.params

    response.render(`book-into-a-clinic/form/${view}`)
  },

  /**
   * Store the latest values entered into a form in the booking journey
   * 
   * @param {*} request 
   * @param {*} response 
   */
  updateForm(request, response) {
    console.log('controller.updateForm\n. route: ' + request.path)
    const { booking_uuid } = request.params
    const { data } = request.session
    const { paths } = response.locals

    // MAL: the implication of this line is that all form values that need to be saved *into the model*
    //      must have a `decorate` property value that starts with 'clinicBooking.'
    ClinicBooking.update(booking_uuid, request.body.clinicBooking, data.wizard)

    response.redirect(paths.next)
  },

  /**
   * Catch-all for pages not needing to reference a given clinic booking
   * 
   * @param {*} request 
   * @param {*} response 
   */
  show(request, response) {
    console.log('controller.show\n. route: ' + request.path)

    const view = request.params.view || 'start'
    response.render(`book-into-a-clinic/${view}`)
  }
}
