import { fakerEN_GB as faker } from '@faker-js/faker'
import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import {
  AppointmentAbandonmentReason,
  ClinicAppointmentStatus,
  ClinicBookingJourneyType,
  ParentalRelationship,
  ProgrammeType,
  ReplyDecision
} from '../enums.js'
import {
  Clinic,
  ClinicBooking,
  Contact,
  Patient,
  Programme,
  Session
} from '../models.js'
import {
  getClinicBookableProgrammeIDs,
  getAppointmentProgrammeOptions,
  getAllAppointmentPaths,
  getPreviousAddressItems,
  getPreviousSessionItems
} from '../utils/clinic-appointment.js'
import {
  getBookableClinicSessions,
  getBookableClinicDateItems,
  getBookableClinicLocationItems
} from '../utils/clinic-booking.js'
import { getResults, getPagination } from '../utils/pagination.js'
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
import { getFilterParams } from '../utils/url.js'

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
    const { data } = request.session
    const { patient_uuid, session_id } = request.params

    let nextPath, programme_ids
    if (patient_uuid) {
      // Starting the booking process from a child record
      programme_ids = getClinicBookableProgrammeIDs(patient_uuid, data)
      nextPath = getBookableClinicSessions(data, programme_ids, null, false)
        .length
        ? 'new'
        : 'availability'
    } else if (session_id) {
      // Starting the booking process from a session; pass on specific slot if present
      const { slot } = /** @type {{ slot?: string }} */ (request.query)
      if (slot) {
        const params = new URLSearchParams()
        params.append('slot', slot)
        nextPath = `new?${params.toString()}`
      } else {
        nextPath = 'new'
      }
    } else {
      // Starting the booking from the parent's invite link
      const { programme_id } = /** @type {{ programme_id?: string }} */ (
        request.query
      )
      programme_ids = Array.isArray(programme_id)
        ? programme_id
        : [programme_id]
      nextPath = getBookableClinicSessions(data, programme_ids, null, true)
        .length
        ? 'start'
        : 'availability'
    }

    // If we already know what programmes we're going to offer, save that now
    if (programme_ids) {
      data.programmesToOffer = getAppointmentProgrammeOptions(
        programme_ids,
        data
      )
    }

    return saveAndRedirect(request, response, nextPath)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { data } = request.session
    const { patient_uuid, session_id } = request.params

    if (!data.journeyData) {
      data.journeyData = {}
    }

    // Create a new clinic booking in the wizard context
    const booking = ClinicBooking.create({}, data.wizard)

    // Track various metadata about the journey that we don't record in the booking itself
    const journeyType = patient_uuid
      ? ClinicBookingJourneyType.PhoneBooking
      : session_id
        ? ClinicBookingJourneyType.DataMigration
        : ClinicBookingJourneyType.ParentOnline
    data.journeyData[booking.uuid] = { journeyType }

    // Set up the first appointment
    const appointment = booking.addAppointment()
    if (patient_uuid) {
      appointment.patient_uuid = patient_uuid
      ClinicBooking.update(booking.uuid, booking, data.wizard)
    } else if (session_id) {
      appointment.session_id = session_id

      // Already selected a specific time slot?
      const { slot } = /** @type {{ slot?: string }} */ (request.query)
      if (slot) {
        const session = Session.findOne(session_id, data)
        appointment.startAt = new Date(slot)
        appointment.appointmentLength =
          session.calculateAppointmentLength(appointment)

        data.journeyData[booking.uuid].preselectedSlot = appointment.startAt
      }

      ClinicBooking.update(booking.uuid, booking, data.wizard)
    }

    // Redirect to the first page in the booking journey (after the start page, that is)
    const relativePath = appointment.uri.new.replace('/book-into-a-clinic', '')
    const firstView = session_id ? 'find-child' : 'programmes'
    const redirectUrl = `${request.baseUrl}${relativePath}/${firstView}`

    return saveAndRedirect(request, response, redirectUrl)
  },

  /**
   * @type {RequestParamHandler}
   */
  readBooking(request, response, next, booking_uuid) {
    const { patient_uuid, session_id } = request.params
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

    // Adapt content in the views for the journey's audience
    const journeyType =
      data.journeyData[booking_uuid]?.journeyType ??
      ClinicBookingJourneyType.ParentOnline
    response.locals.isParentFacing =
      journeyType === ClinicBookingJourneyType.ParentOnline

    // Simplify access to the journey data in the views
    response.locals.journeyData = data.journeyData[booking_uuid]

    const wizardBooking = ClinicBooking.findOne(booking_uuid, data?.wizard)
    const booking = new ClinicBooking(wizardBooking, data)
    response.locals.booking = booking

    next()
  },

  /**
   * @type {RequestParamHandler}
   */
  readAppointment(request, response, next, appointment_uuid) {
    const { __, booking, isParentFacing } = response.locals

    // Give pages access to the appointment and the patient (if one is matched)
    const appointment = booking.findAppointment(appointment_uuid)
    response.locals.appointment = appointment
    response.locals.patient = appointment.patient

    // For the parent's booking, show the current child's name in the caption (but only if more than one)
    if (isParentFacing && booking?.appointments?.length > 1) {
      response.locals.appointmentCaption = __(
        'clinicBooking.appointment.caption',
        appointment?.child?.fullFriendlyName
      )
    }

    // Track the (possibly session- or child-record-based) appointment path
    let appointmentPath = appointment.uri.new.replace('/book-into-a-clinic', '')
    appointmentPath = `${request.baseUrl}${appointmentPath}`
    response.locals.appointmentPath = appointmentPath

    // For multi-child bookings
    response.locals.childNumber = booking.appointments.indexOf(appointment) + 1
    response.locals.childCount = booking.appointments.length

    // TODO: tidy up this hangover from multi-child bookings (make pages use only one form?)
    response.locals.firstName = isParentFacing ? 'your child' : 'the child'
    response.locals.fullName = isParentFacing ? 'your child' : 'the child'

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>, Record<string, unknown>, Record<string, unknown>, PatientFilterQuery>}
   */
  readChildren(request, response, next) {
    let { option, q } = request.query
    const { data } = request.session

    const patients = Patient.findAll(data)

    // Sort
    let results = _.sortBy(patients, 'lastName')

    // Query
    if (q) {
      results = results.filter((patient) =>
        patient.tokenized.includes(String(q).toLowerCase())
      )
    }

    // Filter by display option
    for (const key of [
      'agedOutOfProgrammes',
      'archived',
      'hasImpairment',
      'hasAdjustment',
      'hasMissingNhsNumber'
    ]) {
      if (option?.includes(key)) {
        results = results.filter((patient) => patient[key])
      }
    }

    // Toggle initial view
    response.locals.noFiltersApplied =
      Object.keys(request.query).filter((key) => key !== 'referrer').length ===
      0

    // Results
    response.locals.patients = patients
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)

    // Clean up session data
    delete data.option
    delete data.q

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  filterChildren(request, response) {
    const params = getFilterParams(request, ['q'], ['option'])

    const appointmentPath = response.locals.appointmentPath
    const resultsUri = `${appointmentPath}/find-child?${params}`
    return saveAndRedirect(request, response, resultsUri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  linkChild(request, response) {
    const { patient_uuid } = /** @type {{ patient_uuid?: string }} */ (
      request.query
    )
    const { appointment_uuid, booking_uuid } = request.params
    const { data } = request.session
    const { appointmentPath } = response.locals

    const wizardBooking = ClinicBooking.findOne(booking_uuid, data.wizard)
    const appointment = wizardBooking.findAppointment(appointment_uuid)
    appointment.patient_uuid = patient_uuid
    ClinicBooking.update(booking_uuid, wizardBooking, data.wizard)

    // Check the programmes we can offer this child
    let nextPage
    const programme_ids = getClinicBookableProgrammeIDs(patient_uuid, data)
    if (programme_ids.length) {
      data.programmesToOffer = getAppointmentProgrammeOptions(
        programme_ids,
        data
      )
      nextPage = `${appointmentPath}/programmes`
    } else {
      nextPage = `${appointmentPath}/not-eligible`
    }

    return saveAndRedirect(request, response, nextPage)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { appointment_uuid, booking_uuid } = request.params
    const { data } = request.session
    const { __, booking, paths, patient, session, journeyData } =
      response.locals

    // Clean up session data
    delete data.booking
    delete data.appointment
    delete data.journeyData[booking_uuid]
    delete data.programmesToOffer

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
    }

    // Get back to where we started, if this isn't the parent journey
    if (session) {
      paths.next = `${session.uri}${journeyData.preselectedSlot ? '/appointments' : '/patients'}`
    } else if (patient) {
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
    delete data.programmesToOffer

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
    const { appointment_uuid, booking_uuid, view } = request.params
    const { data, referrer } = request.session
    const { booking } = response.locals

    // If we took a shortcut to the clinic location page by the user entering a preferred postcode, make sure
    // that postcode is pushed to the appointment
    if (view === 'clinic-location') {
      const wizardBooking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const appointment = wizardBooking.findAppointment(appointment_uuid)
      appointment.preferredPostcode = data.appointment['preferredPostcode']
      ClinicBooking.update(booking_uuid, wizardBooking, data.wizard)
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
    const { __mf, appointment, patient } = response.locals
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
      response.locals.programmeItems = data.programmesToOffer.programmes.map(
        (programme) => {
          return {
            text: programme.name,
            value: programme.id === 'mmrv' ? 'mmr' : programme.id,
            hint: programme.information.hint
          }
        }
      )
    } else if (view === 'availability') {
      // Note: replace usual MMR content with MMRV as necessary
      response.locals.programmeNames = programmeNamesListForSentence(
        appointment.selected_programme_ids,
        data.programmesToOffer.eligibleForMmrv,
        ConjunctionType.or,
        data
      )
    } else if (view === 'clinic-location') {
      const clinicLocationItems = getBookableClinicLocationItems(
        data,
        appointment,
        patient ? false : true,
        data.journeyData[booking_uuid].outOfArea
      )
      response.locals.clinicLocationItems = clinicLocationItems
    } else if (view === 'clinic-date') {
      const clinic_id = data.journeyData[booking_uuid].clinic_id
      const clinicDateItems = getBookableClinicDateItems(
        data,
        clinic_id,
        appointment,
        patient ? false : true
      )
      const clinic = Clinic.findOne(clinic_id, data)
      const clinicLocation = clinic.formatted.nameAndAddress

      response.locals.clinicDateItems = clinicDateItems
      response.locals.clinicSummary = {
        location: clinicLocation,
        date: '—'
      }
    } else if (view === 'appointment-time-range') {
      const session = Session.findOne(appointment.session_id, data)
      const availableTimesByHour = _.groupBy(
        session.bookableSlotStartTimesFor(appointment),
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
            hint: __mf('clinicBooking.timeRange.range.appointmentsAvailable', {
              count: times.length
            })
          })
        }
      })
      response.locals.timeRangeItems = timeRangeItems
      response.locals.clinicSummary = {
        location: session.clinic.formatted.nameAndAddress,
        date: session.formatted.date
      }
    } else if (view === 'appointment-time') {
      const session = Session.findOne(appointment.session_id, data)
      const availableTimesByHour = _.groupBy(
        session.bookableSlotStartTimesFor(appointment),
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
            hint: __mf('clinicBooking.time.appointmentsAvailable', {
              count: availability.count
            })
          })
        }
      )
      response.locals.appointmentTimeItems = appointmentTimeItems
      response.locals.clinicSummary = {
        location: session.clinic.formatted.nameAndAddress,
        date: session.formatted.date
      }
    } else if (view === 'fully-booked') {
      // Note: replace usual MMR content with MMRV as necessary
      response.locals.programmeNames = programmeNamesListForSentence(
        appointment.selected_programme_ids,
        data.programmesToOffer.eligibleForMmrv,
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

    if (
      [
        'programmes',
        'flu-choice',
        'flu-alternative',
        'mmr-alternative'
      ].includes(view)
    ) {
      // If we already know the session, we can update the default appointment length now
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const appointment = booking.findAppointment(appointment_uuid)
      if (appointment.session_id) {
        const session = Session.findOne(appointment.session_id, data)
        appointment.appointmentLength =
          session.calculateAppointmentLength(appointment)

        ClinicBooking.update(booking_uuid, booking, data.wizard)
      }
    } else if (view === 'child-count') {
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
      const currentAppointment = booking.findAppointment(appointment_uuid)
      if (currentAppointment) {
        currentAppointment.session_id =
          data.journeyData[booking_uuid].sessionChoice

        const session = Session.findOne(currentAppointment.session_id, data)
        currentAppointment.appointmentLength =
          session.calculateAppointmentLength(currentAppointment)

        ClinicBooking.update(booking.uuid, booking, data.wizard)
      }
    } else if (view === 'clinic-date') {
      // We now know the session and so can calculate the appointment length
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const appointment = booking.findAppointment(appointment_uuid)
      const session = Session.findOne(appointment.session_id, data)
      appointment.appointmentLength =
        session.calculateAppointmentLength(appointment)

      ClinicBooking.update(booking.uuid, booking, data.wizard)
    } else if (view === 'appointment-time') {
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const appointment = booking.findAppointment(appointment_uuid)

      const startAt = new Date(data.journeyData[booking_uuid].time)
      _.merge(appointment, { startAt })

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
    } else if (view === 'remove-preferred-location') {
      // The user doesn't want their preferred location included in clinic convenience feedback
      const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
      const appointment = booking.findAppointment(appointment_uuid)
      appointment.preferredPostcode = undefined
      ClinicBooking.update(booking.uuid, booking, data.wizard)

      paths.next = `${appointment.uri.new}/check-feedback`
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
 * @import { PatientFilterQuery } from '../../typings/index.d.ts'
 */
