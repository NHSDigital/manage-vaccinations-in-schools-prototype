import { fakerEN_GB as faker } from '@faker-js/faker'
import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import { ParentalRelationship, SessionStatus, SessionType } from '../enums.js'
import { ClinicBooking, Session } from '../models.js'
import {
  getAllAppointmentPaths,
  getHealthQuestionPaths,
  getPreviousAddressItems,
  getPreviousSessionItems
} from '../utils/clinic-appointment.js'
import { setMidday } from '../utils/date.js'
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
import { formatHour, formatTime, kebabToCamelCase } from '../utils/string.js'

export const bookIntoClinicController = {
  setupServiceHeader(request, response, next) {
    const serviceName = 'Book into a clinic'

    response.locals.assetsName = 'public'
    response.locals.serviceName = serviceName
    response.locals.headerOptions = { service: { text: serviceName } }

    next()
  },

  readProgrammes(request, response) {
    const { data } = request.session

    // Read the invited programme IDs from the querystring and store them
    const { programme_id } = request.query
    let programme_ids
    if (programme_id) {
      programme_ids = Array.isArray(programme_id)
        ? programme_id
        : [programme_id]

      data.clinicInvite = {
        programme_ids,
        programmeNames: programmeNamesListForSentence(
          programme_ids,
          ConjunctionType.and,
          data
        )
      }
    }

    response.redirect(`/book-into-a-clinic/start`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  new(request, response) {
    const { data } = request.session

    // Create a new clinic booking in the wizard context
    const booking = ClinicBooking.create({}, data.wizard)
    booking.addAppointment()
    const firstAppointment = booking.appointments[0]

    // Redirect to the first page in the booking journey (after the start page, that is)
    const redirectUrl = `${firstAppointment.uri.new}/child`

    return response.redirect(redirectUrl)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readForm(request, response, next) {
    const { appointment_uuid, booking_uuid } = request.params
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
    let booking
    if (booking_uuid) {
      const wizardBooking = ClinicBooking.findOne(booking_uuid, data?.wizard)
      booking = new ClinicBooking(wizardBooking, data)
      response.locals.booking = booking

      if (appointment_uuid) {
        const currentAppointment = booking.findAppointment(appointment_uuid)
        response.locals.appointment = currentAppointment

        // Check answers needs a version of the appointment that can find its booking on the context
        response.locals.wizardAppointment =
          wizardBooking.findAppointment(appointment_uuid)

        response.locals.childNumber =
          booking.appointments.indexOf(currentAppointment) + 1
        response.locals.childCount = booking.appointments.length
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
      [`/`]: {},

      // Appointment journey; once per child
      ...getAllAppointmentPaths(
        booking_uuid,
        request.session.data,
        booking.appointments
      ),
      [`/${booking_uuid}/new/add-another`]: {},

      // Parent journey
      [`/${booking_uuid}/new/parent`]: {
        [`/${booking_uuid}/new/offer-health-questions`]: () =>
          !request.session.data.booking?.parent?.tel
      },
      [`/${booking_uuid}/new/contact-preference`]: {},

      // Check answers
      [`/${booking_uuid}/new/check-answers`]: {},

      // Health questions (optional)
      [`/${booking_uuid}/new/offer-health-questions`]: {
        [`/${booking_uuid}/new/confirmation`]: {
          data: 'transaction.optedIntoHealthQuestions',
          value: 'false'
        }
      },

      // For each child being booked in, and their selected vaccinations, ask the
      // relevant health questions and impairments/adjustments questions
      ...getHealthQuestionPaths(
        `/${booking_uuid}/new/`,
        String(booking_uuid),
        data.wizard,
        data
      ),

      // Confirmation! \o/
      [`/${booking_uuid}/new/confirmation`]: {}
    }

    const paths = wizard(journey, request)
    paths.back = referrer || paths.back
    response.locals.paths = paths // used later to redirect in updateForm

    return next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  showForm(request, response) {
    const { __, __mf, appointment } = response.locals
    const { data } = request.session
    let { booking_uuid } = request.params
    let view = String(request.params.view)

    if (view === 'child') {
      console.log(request.originalUrl)
      console.log(JSON.stringify(appointment, null, 2))
    } else if (view === 'address-selection') {
      // Build the options for the selection of a home address address from those already entered
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      response.locals.previousAddressItems = getPreviousAddressItems(
        booking.appointments
      )
    } else if (view === 'session-selection') {
      // Build the options for the selection of a clinic session from those already chosen for other appointments
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      response.locals.previousSessionItems = getPreviousSessionItems(
        booking.appointments,
        data
      )
    } else if (view === 'parental-relationship') {
      // Prepare the radio options for the parental relationship page
      response.locals.parentalRelationshipItems = Object.values(
        ParentalRelationship
      )
        .filter((relationship) => relationship !== ParentalRelationship.Unknown)
        .map((relationship) => ({
          text: relationship,
          value: relationship
        }))
    } else if (view === 'programmes') {
      response.locals.programmeItems = [
        {
          text: 'Flu',
          value: 'flu',
          hint: {
            text: 'Protects against flu, which can sometimes cause serious problems, such as pneumonia'
          }
        },
        {
          text: 'HPV',
          value: 'hpv',
          hint: {
            text: 'Protects against human papillomavirus, some types of which are linked to an increased risk of certain types of cancer'
          }
        },
        {
          text: 'MenACWY',
          value: 'menacwy',
          hint: {
            text: 'Protects against life-threatening illnesses like meningitis and sepsis'
          }
        },
        {
          text: 'Td/IPV',
          value: 'td-ipv',
          hint: { text: 'Protects against tetanus, diphtheria and polio' }
        },
        appointment.child.canBeOfferedMmrv
          ? {
              text: 'MMRV',
              value: 'mmr',
              hint: {
                text: 'Protects against measles, mumps, rubella and varicella (chickenpox)'
              }
            }
          : {
              text: 'MMR',
              value: 'mmr',
              hint: { text: 'Protects against measles, mumps and rubella' }
            }
      ].filter(({ value }) => ['flu', 'mmr'].includes(value)) // test with these for now
    } else if (view === 'clinic-location') {
      const scheduledClinics = Session.findAll(data).filter(
        (session) =>
          session.type === SessionType.Clinic &&
          session.status === SessionStatus.Planned
      )

      const sessionsByLocation = _.groupBy(
        scheduledClinics,
        (session) => session.clinic_id
      )
      let distanceToClinic = 0.5
      const clinicLocationItems = []
      Object.entries(sessionsByLocation).forEach(([clinic_id, sessions]) => {
        const firstSession = sessions.reduce((earliest, current) => {
          return current.date < earliest.date ? current : earliest
        })

        clinicLocationItems.push({
          text: sessions[0].formatted.location,
          value: clinic_id,
          hint: {
            text: `${distanceToClinic} miles away, next date is ${firstSession.formatted.date}`
          }
        })
        distanceToClinic += 2.1
      })
      response.locals.clinicLocationItems = clinicLocationItems
    } else if (view === 'clinic-date') {
      const scheduledClinicSessions = _.sortBy(
        Session.findAll(data).filter(
          (session) =>
            session.type === SessionType.Clinic &&
            session.status === SessionStatus.Planned &&
            session.clinic_id === data.transaction.clinic_id
        ),
        'date'
      )

      const clinicDateItems = []
      scheduledClinicSessions.forEach((session) => {
        const midday = new Date(session.date)
        setMidday(midday)

        const availableTimes = session.availableAppointmentTimes
        const morningAvailable = availableTimes.some((time) => time < midday)
        const afternoonAvailable = availableTimes.some((time) => time >= midday)
        const availability =
          morningAvailable && afternoonAvailable
            ? __('clinicBooking.clinicDate.hint.both')
            : morningAvailable
              ? __('clinicBooking.clinicDate.hint.morning')
              : __('clinicBooking.clinicDate.hint.afternoon')

        clinicDateItems.push({
          text: session.formatted.date,
          value: session.id,
          hint: {
            text: availability
          }
        })
      })
      response.locals.clinicDateItems = clinicDateItems
      response.locals.clinicSummary = {
        location: scheduledClinicSessions.at(0)?.formatted.location,
        date: 'To be decided'
      }
    } else if (view === 'appointment-time-range') {
      const session = Session.findOne(appointment.session_id, data)
      const availableTimesByHour = _.groupBy(
        session.availableAppointmentTimes,
        (time) => time.getHours()
      )

      const timeRangeItems = []
      Object.entries(availableTimesByHour).forEach(([hour, times]) => {
        if (times.length) {
          const startHourNumber = parseInt(hour)
          const endHourNumber = startHourNumber + 1

          timeRangeItems.push({
            text: `${formatHour(startHourNumber)} to ${formatHour(endHourNumber)}`,
            value: startHourNumber,
            hint: {
              text: __mf('clinicBooking.timeRange.range.slotsAvailable', {
                count: times.length
              })
            }
          })
        }
      })
      response.locals.timeRangeItems = timeRangeItems
      response.locals.clinicSummary = {
        location: session.formatted.location,
        date: session.formatted.date
      }
    } else if (view === 'appointment-time') {
      const session = Session.findOne(appointment.session_id, data)
      const availableTimesByHour = _.groupBy(
        session.availableAppointmentTimes,
        (time) => time.getHours()
      )

      const availabilityForChosenHour = {}
      for (const date of availableTimesByHour[data.transaction.timeRange]) {
        const key = formatTime(date, true)

        if (!availabilityForChosenHour[key]) {
          availabilityForChosenHour[key] = {
            date: new Date(date),
            count: 0
          }
        }

        availabilityForChosenHour[key].count++
      }

      const appointmentTimeItems = []
      Object.entries(availabilityForChosenHour).forEach(
        ([formattedTime, availability]) => {
          appointmentTimeItems.push({
            text: formattedTime,
            value: formatTime(availability.date, false),
            hint: {
              text: __mf('clinicBooking.time.nurses', {
                count: availability.count
              })
            }
          })
        }
      )
      response.locals.appointmentTimeItems = appointmentTimeItems
      response.locals.clinicSummary = {
        location: session.formatted.location,
        date: session.formatted.date
      }
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

    return response.render(`book-into-a-clinic/form/${view}`, {
      key,
      hasSubQuestions
    })
  },

  /**
   * @type {import("express").RequestHandler}
   */
  updateForm(request, response) {
    const { booking_uuid, appointment_uuid, view } = request.params
    const { data } = request.session
    const { paths } = response.locals

    // Store values from the posted form
    if (request.body.booking) {
      ClinicBooking.update(booking_uuid, request.body.booking, data.wizard)
    }
    if (request.body.appointment) {
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const appointment = booking?.findAppointment(appointment_uuid)
      _.merge(appointment, request.body.appointment)

      ClinicBooking.update(booking_uuid, booking, data.wizard)
    }
    if (request.body.transaction) {
      data.wizard.transaction = data.wizard.transaction ?? {}
      _.merge(data.wizard.transaction, request.body.transaction)
    }

    if (view === 'child-count') {
      // We've just set the child count, so create the appointments we'll need
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)

      let desiredCount = Number(data.wizard.transaction.childCount)
      desiredCount = isNaN(desiredCount) || desiredCount < 1 ? 1 : desiredCount
      const existingCount = booking.appointments.length

      const childrenToAdd = Math.max(0, desiredCount - existingCount)
      const childrenToRemove = Math.max(0, existingCount - desiredCount)
      Array.from({ length: childrenToAdd }).forEach(() =>
        booking.addAppointment()
      )
      Array.from({ length: childrenToRemove }).forEach(() =>
        booking.removeLastAppointment()
      )
      ClinicBooking.update(booking_uuid, booking, data.wizard)

      // Start the appointment journey for the first child
      const firstAppointment = booking.appointments[0]
      const firstAppointmentUrl = `${firstAppointment.uri.new}/child`
      paths.next = firstAppointmentUrl
    } else if (
      view === 'address-selection' &&
      request.body.transaction.addressChoice !== 'new'
    ) {
      // We've just selected a previous child's address for the current appointment, so copy
      // that detail to the child record
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)

      const previous_appointment_uuid = request.body.transaction.addressChoice
      const previousAppointment = booking?.findAppointment(
        previous_appointment_uuid
      )
      const currentAppointment = booking?.findAppointment(appointment_uuid)

      if (previousAppointment && currentAppointment) {
        currentAppointment.child.address = previousAppointment.child.address
        ClinicBooking.update(booking.uuid, booking, data.wizard)
      }
    } else if (
      view === 'session-selection' &&
      request.body.transaction.sessionChoice !== 'new'
    ) {
      // We've just selected a previous child's session choice for the current appointment;
      // in this case, the session ID is actually the radio value passed in request.body
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const currentAppointment = booking?.findAppointment(appointment_uuid)
      if (currentAppointment) {
        currentAppointment.session_id = request.body.transaction.sessionChoice
        ClinicBooking.update(booking.uuid, booking, data.wizard)
      }
    } else if (view === 'add-another') {
      // If the user elected to add another, create the new appointment and override the default redirect
      const addAnother = request.body.transaction.addAnother === 'true'
      if (addAnother) {
        const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
        const appointment = booking.addAppointment()
        ClinicBooking.update(booking.uuid, booking, data.wizard)

        // Clear out values we don't want pre-selected for the next child
        delete data.appointment
        delete data.transaction.addAnother
        delete data.transaction.addressChoice
        delete data.transaction.sessionChoice
        delete data.transaction.timeRange
        delete data.transaction.time

        paths.next = `${appointment.uri.new}/child`
      }
    } else if (view === 'remove-appointment') {
      // The user's chosen to remove an appointment
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      booking.removeAppointment(String(appointment_uuid))
      ClinicBooking.update(booking.uuid, booking, data.wizard)

      paths.next = `${booking.uri.new}/add-another`
    }

    // NB: request.session.save was needed to avoid race condition issues on heroku
    return request.session.save((error) => {
      if (!error) response.redirect(paths.next)
    })
  },

  /**
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    const view = request.params.view || 'start'

    // Allow us to offer a phone booking if not wanting online (start.njk)
    response.locals.bookingPhoneNumber =
      request.session.data.teams[0]?.tel ??
      faker.helpers.replaceSymbols('01### ######')

    return response.render(`book-into-a-clinic/${view}`)
  }
}
