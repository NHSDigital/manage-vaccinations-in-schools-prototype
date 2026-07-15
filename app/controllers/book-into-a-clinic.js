import { fakerEN_GB as faker } from '@faker-js/faker'
import wizard from '@x-govuk/govuk-prototype-wizard'
import { addMinutes } from 'date-fns'
import _ from 'lodash'

import {
  AppointmentAbandonmentReason,
  ClinicAppointmentStatus,
  ClinicBookingJourneyType,
  ParentalRelationship,
  PatientClinicStatus,
  ProgrammeType,
  ReplyDecision,
  SessionStatus,
  SessionType
} from '../enums.js'
import {
  ClinicBooking,
  Contact,
  Patient,
  Programme,
  Session
} from '../models.js'
import {
  getAllAppointmentPaths,
  getPreviousAddressItems,
  getPreviousSessionItems
} from '../utils/clinic-appointment.js'
import {
  getBookableClinicSessions,
  getScheduledClinicLocationItems
} from '../utils/clinic-booking.js'
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
import { saveAndRedirect } from '../utils/redirect.js'
import {
  formatHour,
  formatOther,
  formatTime,
  kebabToCamelCase,
  stringToBoolean
} from '../utils/string.js'

export const bookIntoClinicController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  setupServiceHeader(request, response, next) {
    const { patient_uuid, session_id } = request.params
    const { __ } = response.locals

    // Set up the parent-facing service name and header
    if (!patient_uuid && !session_id) {
      const serviceName = __('clinicBooking.start.title')

      response.locals.assetsName = 'public'
      response.locals.serviceName = serviceName
      response.locals.headerOptions = { service: { text: serviceName } }
    }

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readProgrammes(request, response) {
    const { programme_id } = /** @type {{ programme_id?: string }} */ (
      request.query
    )
    const { data } = request.session
    const { patient_uuid, session_id } = request.params

    let programme_ids
    if (patient_uuid) {
      // Starting the booking process from the child record, so no querystring with invited
      // programmes; use the child's clinic-ready programmes as the basis instead
      const patient = Patient.findOne(patient_uuid, data)
      if (patient) {
        const canBeOfferedMmrv = patient.canBeOfferedMmrv
        programme_ids = Object.values(patient.programmes)
          .filter(({ clinicStatus }) =>
            [PatientClinicStatus.Ready, PatientClinicStatus.Invited].includes(
              String(clinicStatus)
            )
          )
          .map(({ programme_id }) =>
            programme_id === 'mmr' && canBeOfferedMmrv ? 'mmrv' : programme_id
          )
      }
    } else if (session_id) {
      // Starting from a session, so likely migrating data from another system. Use the
      // session's programmes as the ones that we offer, on the assumption it's been set
      // up to match what was booked elsewhere.
      const session = Session.findOne(session_id, data)

      // We'll have to wait till we have a patient before we can decide on MMR vs. MMRV
      programme_ids = session.programme_ids
    } else {
      // Starting the booking from the parent's invite link; read the invited programme IDs
      // from the querystring
      if (programme_id) {
        programme_ids = Array.isArray(programme_id)
          ? programme_id
          : [programme_id]
      }
    }

    // Default to all programmes if none supplied
    if (!programme_ids) {
      programme_ids = Programme.findAll(data)
        .filter(({ isHidden }) => !isHidden)
        .map(({ id }) => id)
    }

    // Strip out mmrv as a programme id, but keep memory of it so we can adapt content
    const useMmrv = programme_ids.includes('mmrv')
    programme_ids = programme_ids.map((id) => (id === 'mmrv' ? 'mmr' : id))
    const programmes = Programme.findAll(data)
      .map((programme) => {
        delete programme.context
        return programme
      })
      .filter(({ id }) => programme_ids.includes(id))
    if (useMmrv) {
      const mmrProgramme = programmes.find(({ id }) => id === 'mmr')
      mmrProgramme.name = 'MMRV'
      mmrProgramme.id = 'mmrv'
      mmrProgramme.information.hint = mmrProgramme.information.hintMmrv
    }

    // Track details of the invite for pages that need to show the invited programmes
    data.clinicInvite = {
      programmes,
      programmeNames: programmes.map(({ name }) => name),
      eligibleForMmrv: useMmrv
    }

    let nextPath = 'new'
    if (!session_id) {
      // Need to check if there are any clinic sessions available to book into
      const bookableSessions = getBookableClinicSessions(
        data,
        programme_ids,
        !patient_uuid
      )
      if (bookableSessions.length === 0) {
        nextPath = 'availability'
      } else if (!patient_uuid) {
        nextPath = 'start'
      }
    }

    return saveAndRedirect(request, response, nextPath)
  },

  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, booking_uuid) {
    const { patient_uuid, session_id, appointment_uuid } = request.params
    const { data } = request.session
    const { __ } = response.locals

    // Started from the child record e.g. booking an appointment over the phone
    if (patient_uuid) {
      const patient = Patient.findOne(String(patient_uuid), data)
      response.locals.patient = patient

      // Show the child context in the caption
      response.locals.appointmentCaption = __(
        'clinicBooking.appointment.caption',
        patient?.fullName
      )
    }

    // Started from the session e.g. migrating data from another system
    if (session_id) {
      const session = Session.findOne(String(session_id), data)
      response.locals.session = session

      // Show the session context in the caption
      response.locals.appointmentCaption = `Clinic at ${session.location.name} on ${session.formatted.dateShort}`
    }

    // Started from the parent's invite link
    if (!response.locals.appointmentCaption && appointment_uuid) {
      // For the parent's booking, show the current child's name if more than one
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const appointment = booking.findAppointment(String(appointment_uuid))
      if (appointment?.booking?.appointments?.length > 1) {
        response.locals.appointmentCaption = __(
          'clinicBooking.appointment.caption',
          appointment?.child?.fullFriendlyName
        )
      }
    }

    // Track the journey type to help us build the wizard and adapt content
    if (!data.journeyData[booking_uuid].journeyType) {
      data.journeyData[booking_uuid].journeyType = patient_uuid
        ? ClinicBookingJourneyType.PhoneBooking
        : session_id
          ? ClinicBookingJourneyType.DataMigration
          : ClinicBookingJourneyType.ParentOnline
    }

    response.locals.journeyData = data.journeyData[booking_uuid]
    response.locals.isParentFacing =
      data.journeyData[booking_uuid].journeyType ===
      ClinicBookingJourneyType.ParentOnline

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { data } = request.session
    const { patient_uuid } = request.params

    // Create a new clinic booking in the wizard context
    const booking = ClinicBooking.create(
      {
        invited_programme_ids: data.clinicInvite.programmes.map(({ id }) => id)
      },
      data.wizard
    )
    const firstAppointment = booking.addAppointment()
    if (patient_uuid) {
      firstAppointment.patient_uuid = patient_uuid
      ClinicBooking.update(booking.uuid, booking, data.wizard)
    }

    if (!data.journeyData) data.journeyData = {}
    data.journeyData[booking.uuid] = {}

    // Redirect to the first page in the booking journey (after the start page, that is)
    const relativePath = firstAppointment.uri.new.replace(
      '/book-into-a-clinic',
      ''
    )
    const redirectUrl = `${request.baseUrl}${relativePath}/programmes`

    return saveAndRedirect(request, response, redirectUrl)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { appointment_uuid, booking_uuid } = request.params
    const { data } = request.session
    const { __, booking, paths, patient } = response.locals

    // Clean up session data
    delete data.booking
    delete data.appointment
    delete data.journeyData[booking_uuid]
    delete data.clinicInvite

    // Save to the global context
    ClinicBooking.update(booking_uuid, booking, data)

    if (patient) {
      // Create the patient-session records for this appointment
      const appointment = booking.findAppointment(appointment_uuid)
      appointment.addToSession()

      request.flash(
        'success',
        __('clinicBooking.success', {
          fullName: patient.fullName,
          sessionName: appointment.session.name
        })
      )

      paths.next = patient.uri
    }

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateFeedback(request, response) {
    const { booking_uuid, appointment_uuid } = request.params
    const { data } = request.session
    const { booking, paths } = response.locals

    // Clean up session data
    delete data.booking
    delete data.appointment
    delete data.journeyData[booking_uuid]
    delete data.clinicInvite

    // Record the abandonment
    const appointment = booking.findAppointment(appointment_uuid)
    appointment.status = ClinicAppointmentStatus.Abandoned

    // Save to the global context
    ClinicBooking.update(booking_uuid, booking, data)

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readForm(request, response, next) {
    const { appointment_uuid, booking_uuid, view, patient_uuid } =
      request.params
    const { data, referrer } = request.session

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

        response.locals.childNumber =
          booking.appointments.indexOf(currentAppointment) + 1
        response.locals.childCount = booking.appointments.length
        response.locals.firstName = patient_uuid ? 'the child' : 'your child' // TODO: use currentAppointment.firstName if multi-child bookings
        response.locals.fullName = patient_uuid ? 'the child' : 'your child' // TODO: use currentAppointment.fullFriendlyName if multi-child bookings

        // If we took a shortcut to the clinic location page by the user entering a preferred postcode, make sure
        // that postcode is pushed to the appointment
        if (view === 'clinic-location') {
          currentAppointment.preferredPostcode =
            data.appointment['preferredPostcode']
          ClinicBooking.update(booking_uuid, booking, data.wizard)
        }
      }
    }

    const journey = {
      // Appointment journey; once per child
      ...getAllAppointmentPaths(
        booking_uuid,
        request.session.data,
        booking.appointments
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
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { __, __mf, appointment, patient } = response.locals
    const { data } = request.session
    let { booking_uuid, view } = request.params

    if (view === 'address-selection') {
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
    } else if (view === 'parental-relationship' || view === 'contact') {
      // Prepare the radio options for the parental relationship
      response.locals.parentalRelationshipItems = Object.values(
        ParentalRelationship
      )
        .filter((relationship) => relationship !== ParentalRelationship.Unknown)
        .map((relationship) => ({
          text: relationship,
          value: relationship
        }))
    } else if (view === 'programmes') {
      // Create radio options for the programmes invited to (or flu if we've got none)
      response.locals.programmeItems = data.clinicInvite.programmes.map(
        (programme) => {
          return {
            text: programme.name,
            value: programme.id === 'mmrv' ? 'mmr' : programme.id,
            hint: {
              text: programme.information.hint
            }
          }
        }
      )
    } else if (view === 'availability') {
      // Note: replace usual MMR content with MMRV as necessary
      response.locals.programmeNames = programmeNamesListForSentence(
        appointment.selected_programme_ids,
        data.clinicInvite.eligibleForMmrv,
        ConjunctionType.or,
        data
      )
    } else if (view === 'clinic-location') {
      const clinicLocationItems = getScheduledClinicLocationItems(
        data,
        appointment.selected_programme_ids,
        patient ? false : true,
        data.journeyData[booking_uuid].outOfArea
      )
      response.locals.clinicLocationItems = clinicLocationItems
    } else if (view === 'clinic-date') {
      const scheduledClinicSessions = _.sortBy(
        Session.findAll(data).filter(
          (session) =>
            session.type === SessionType.Clinic &&
            session.status === SessionStatus.Planned &&
            session.clinic_id === data.journeyData[booking_uuid].clinic_id
        ),
        'date'
      )

      const clinicDateItems = []
      scheduledClinicSessions.forEach((session) => {
        const midday = new Date(session.date)

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
        date: '—'
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
              text: __mf(
                'clinicBooking.timeRange.range.appointmentsAvailable',
                {
                  count: times.length
                }
              )
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
      for (const date of availableTimesByHour[
        data.journeyData[booking_uuid].timeRange
      ]) {
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
            value: availability.date.toISOString(),
            hint: {
              text: __mf('clinicBooking.time.appointmentsAvailable', {
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
    } else if (view === 'fully-booked') {
      // Note: replace usual MMR content with MMRV as necessary
      response.locals.programmeNames = programmeNamesListForSentence(
        appointment.selected_programme_ids,
        data.clinicInvite.eligibleForMmrv,
        ConjunctionType.and,
        data
      )
    } else if (view === 'least-convenient') {
      const reasonItems = appointment.abandonmentReasons.map((reason) => ({
        text:
          reason === AppointmentAbandonmentReason.Other
            ? formatOther(
                AppointmentAbandonmentReason.Other,
                appointment.abandonmentReasonOther
              )
            : reason,
        value: reason
      }))

      response.locals.reasonItems = reasonItems
    }

    // All health questions use the same view
    let key
    if (view.startsWith('health-question-')) {
      key = kebabToCamelCase(view.replace('health-question-', ''))
      view = 'health-question'

      // The immuneSystem health question, if asked, needs to say which programmes apply
      if (key == 'immuneSystem') {
        const mmrVariant = appointment.child.canBeOfferedMmrv ? 'MMRV' : 'MMR'
        const fluCanBeNasal =
          appointment.fluDecision !== ReplyDecision.OnlyAlternativeInjection
        const possibleLiveProgrammeTypes = [
          ProgrammeType.MMR,
          ...(fluCanBeNasal ? [ProgrammeType.Flu] : [])
        ]
        const selectedLiveVaccineProgrammeNames =
          appointment.selected_programme_ids
            .map((id) => Programme.findOne(id, data))
            .filter(({ type }) => possibleLiveProgrammeTypes.includes(type))
            .map(({ name }) =>
              name.replace('MMR', mmrVariant).replace('Flu', 'nasal spray flu')
            )

        response.locals.liveVaccines = {
          count: selectedLiveVaccineProgrammeNames.length,
          vaccineNames: selectedLiveVaccineProgrammeNames.join(' and ')
        }
      }
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
   * @type {RequestHandler<Record<string, string>>}
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
    if (request.body.journeyData) {
      _.merge(data.journeyData[booking_uuid], request.body.journeyData)
    }

    if (view === 'child-count') {
      // We've just set the child count, so create the appointments we'll need
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)

      let desiredCount = Number(data.journeyData[booking_uuid].childCount)
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
    } else if (view === 'child') {
      if (
        !stringToBoolean(data.journeyData[booking_uuid]?.preferredNameChoice)
      ) {
        // If the parent's backed out of using the child's preferred name (say, from the check answers page), then
        // clear it out of the appointment
        const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
        const currentAppointment = booking?.findAppointment(appointment_uuid)
        delete currentAppointment?.child?.preferredFirstName
        delete currentAppointment?.child?.preferredLastName

        ClinicBooking.update(booking_uuid, booking, data.wizard)
      }
    } else if (
      view === 'address-selection' &&
      data.journeyData[booking_uuid].addressChoice !== 'new'
    ) {
      // We've just selected a previous child's address for the current appointment, so copy
      // that detail to the child record
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)

      const previous_appointment_uuid = request.body.journeyData.addressChoice
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
      data.journeyData[booking_uuid].sessionChoice !== 'new'
    ) {
      // We've just selected a previous child's session choice for the current appointment;
      // in this case, the session ID is actually the radio value passed in request.body
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const currentAppointment = booking?.findAppointment(appointment_uuid)
      if (currentAppointment) {
        currentAppointment.session_id =
          data.journeyData[booking_uuid].sessionChoice
        ClinicBooking.update(booking.uuid, booking, data.wizard)
      }
    } else if (view === 'appointment-time') {
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const appointment = booking?.findAppointment(appointment_uuid)
      const appointmentLengthInMinutes =
        Session.findOne(appointment.session_id, data)?.appointmentLength ?? 10

      const startAt = new Date(data.journeyData[booking_uuid].time)
      const endAt = addMinutes(startAt, appointmentLengthInMinutes)
      _.merge(appointment, { startAt, endAt })

      ClinicBooking.update(booking_uuid, booking, data.wizard)
    } else if (view === 'add-another') {
      // If the user elected to add another, create the new appointment and override the default redirect
      const addAnother = data.journeyData[booking_uuid].addAnother === 'true'
      if (addAnother) {
        const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
        const appointment = booking.addAppointment()
        ClinicBooking.update(booking.uuid, booking, data.wizard)

        // Clear out values we don't want pre-selected for the next child
        delete data.appointment
        delete data.journeyData[booking_uuid].addAnother
        delete data.journeyData[booking_uuid].addressChoice
        delete data.journeyData[booking_uuid].sessionChoice
        delete data.journeyData[booking_uuid].timeRange
        delete data.journeyData[booking_uuid].time

        paths.next = `${appointment.uri.new}/child`
      }
    } else if (view === 'contact-selection') {
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      if (booking.contact.uuid !== 'new') {
        // Just selected an existing parent, so load it into the booking and appointment
        booking.contact = Contact.findOne(booking.contact.uuid, data)
        const appointment = booking.findAppointment(appointment_uuid)
        appointment.parentalRelationship = booking.contact.relationship
        appointment.parentalRelationshipOther =
          booking.contact.relationshipOther
        appointment.parentHasParentalResponsibility =
          booking.contact.hasParentalResponsibility
      } else {
        // Reset the contact ready for new details
        booking.contact = new Contact({ uuid: 'new' })
      }
      ClinicBooking.update(booking_uuid, booking, data.wizard)
    } else if (view === 'contact') {
      // If we've just recorded a new contact for an existing patient, give it a proper UUID
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      if (booking.contact?.uuid === 'new') {
        booking.contact.uuid = faker.string.uuid()
        ClinicBooking.update(booking_uuid, booking, data.wizard)
      }
    } else if (view === 'delete-appointment') {
      // The user's chosen to remove an appointment
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      booking.removeAppointment(appointment_uuid)
      ClinicBooking.update(booking.uuid, booking, data.wizard)

      paths.next = `${booking.uri.new}/add-another`
    }

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    const view = request.params.view || 'start'

    return response.render(`book-into-a-clinic/${view}`)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
