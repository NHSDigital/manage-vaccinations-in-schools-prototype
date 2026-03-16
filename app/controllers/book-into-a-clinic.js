import wizard from '@x-govuk/govuk-prototype-wizard'

import _ from 'lodash'
import { fakerEN_GB as faker } from '@faker-js/faker'

import { ParentalRelationship, SessionPresets } from '../enums.js'
import { ClinicAppointment, ClinicBooking, Programme } from '../models.js'

import allProgrammesData from '../datasets/programmes.js'
import { kebabToCamelCase } from '../utils/string.js'
import { getHealthQuestionPaths } from '../utils/clinic-appointment.js'

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
    const { session_preset_slug, booking_uuid } = request.params
    let appointment_uuid = request.params.appointment_uuid
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
      booking = new ClinicBooking(ClinicBooking.findOne(booking_uuid, data?.wizard), data)
      response.locals.booking = booking

      if (appointment_uuid) {
        appointment = new ClinicAppointment((ClinicAppointment.findOne(appointment_uuid, data?.wizard)), data)
        response.locals.appointment = appointment
        response.locals.firstName = appointment.unmatchedFirstName || "your child"
      }
    }

    // If we've already been through the appointment journey (possibly multiple times), get the UUID of the first
    // appointment should we need to go through each child again for the health questions.
    // TEMPORARY: just pull the appointment UUID from the first appointment held in wizard data, as I've not got
    //            round to adding the appointment to the booking yet.
    if (!appointment_uuid && data?.wizard?.clinicAppointments?.[0]) {
      appointment_uuid = data.wizard.clinicAppointments[0].uuid
    }
    if (!appointment_uuid && booking?.appointments_ids?.length > 0) {
      appointment_uuid = booking.appointments_ids[0]
    }

    // Make sure the views have access to information about flow control e.g. "child 1 of 2" type of stuff
    let transaction
    if (data.wizard?.transaction) {
      transaction = data.wizard?.transaction
      response.locals.transaction = transaction
    }

    const journey = {
      [`/${session_preset_slug}`]: {},  // is this ever actually used? Suspect not...unless when going back from child-count.
      [`/${session_preset_slug}/${booking_uuid}/new/child-count`]: {},
      
      // Child journey
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/child`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/dob`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/address`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/parental-relationship`]: {
        [`/${session_preset_slug}/new/${appointment_uuid}/vaccination-choice`]: {
          data: 'appointment.parent.hasParentalResponsibility',
          value: 'true'
        },
      },
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/parental-relationship`]: {},  // allow the *booking* to continue, but stress that someone with responsibility must *attend*
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/vaccination-choice`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/extra-time`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/preferred-location`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-location`]: {
          data: 'transaction.preferredLocation',
          value: 'NE12 7ET'
        }
      },
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/preferred-location-matches`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/preferred-location`]: {
          data: 'transaction.preferredLocation',
          value: 'retry'
        }
      },
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-location`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-date`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/appointment-time-range`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/appointment-time`]: {},
      // TODO: logic to loop back if more than one appointment

      // Parent journey
      [`/${session_preset_slug}/${booking_uuid}/new/parent`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/offer-health-questions`]: () =>
          !booking?.parentTel
      },
      [`/${session_preset_slug}/${booking_uuid}/new/contact-preference`]: {},

      // Health questions (optional)
      [`/${session_preset_slug}/${booking_uuid}/new/offer-health-questions`]: {
        [`/${session_preset_slug}/${booking_uuid}/new/check-answers`]: {
          data: 'transaction.optedIntoHealthQuestions',
          value: "false"
        }
      },
      // TODO: Currently, `appointment` in this call to getHealthQuestionPaths is null because offer-health-questions is outside the appointment journey
      //       Should I put the offer into the journey too, and offer per-child, or should I just pass the first appointment on the booking?
      //...getHealthQuestionPaths(`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/`, appointment),
      // TODO: logic to loop back if more than one appointment

      // REMOVE: hard-coded health questions, and update showForm to reset to using generic health-question.njk view
      [`/${session_preset_slug}/${booking_uuid}/new/health-question-immune-system`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/health-question-allergy`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/health-question-bleeding`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/health-question-blood-thinning`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/health-question-previous-reaction`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/health-question-recent-men-acwy-vaccination`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/health-question-recent-td-ipv-vaccination`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/impairments`]: {},
      [`/${session_preset_slug}/${booking_uuid}/new/adjustments`]: {},

      // Check answers
      [`/${session_preset_slug}/${booking_uuid}/new/check-answers`]: {},

      // Confirmation! \o/
      [`/${session_preset_slug}/${booking_uuid}/new/confirmation`]: {}
    }

    const paths = wizard(journey, request)
    paths.back = referrer || paths.back
    response.locals.paths = paths   // used later to redirect in updateForm

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
    const { appointment } = response.locals
    let { view } = request.params

    // All health questions use the same view
    let key
    if (view.startsWith('health-question-')) {
      key = kebabToCamelCase(view.replace('health-question-', ''))
      view = 'health-question'  // TODO: reintroduce 
    }

    // Only ask for details if question does not have sub-questions
    const hasSubQuestions = appointment?.healthQuestionsForSelectedProgrammes[key]?.conditional

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

    // console.log("data.wizard: " + JSON.stringify(data.wizard, null, 2));
    // console.log("request.body: " + JSON.stringify(request.body, null, 2));
    
    // Harvest and store values from forms
    if (request.body.booking) {
      ClinicBooking.update(booking_uuid, request.body.booking, data.wizard)
    }
    if (request.body.appointment) {
      ClinicAppointment.update(appointment_uuid, request.body.appointment, data.wizard)
    }
    if (request.body.transaction) {
      // MAL: need to key this on the booking_uuid, not just have one transaction object shared by all users
      data.wizard.transaction = data.wizard.transaction ?? {}
      _.merge(data.wizard.transaction, request.body.transaction)
    }

    let redirectUrl = paths.next

    // If we've just set the child count, create the appointment to start the sub-journey and
    // put its uuid into the routes from this point on
    // TODO: but what about iterating to subsequent children? Can't help feeling the whole ask-up-front pattern is flawed.
    if (request.body.transaction?.childCount !== undefined) {
      const booking = new ClinicBooking(ClinicBooking.findOne(booking_uuid, data.wizard), data)
      const appointment = ClinicAppointment.createInContext({ primary_programme_ids: booking.primaryProgrammeIDs }, data.wizard)

      const bookingUri = booking.bookingUri
      redirectUrl = `${request.baseUrl}/${bookingUri}/new/${appointment.appointmentUri}/child`
    }

    response.redirect(redirectUrl)
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
