import { fakerEN_GB as faker } from '@faker-js/faker'
import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import {
  AppointmentAbandonmentReason,
  AppointmentLengthType,
  ClinicAppointmentStatus,
  ClinicBookingJourneyType,
  ProgrammeType,
  RelationshipType,
  ReplyDecision
} from '../enums.js'
import {
  Clinic,
  ClinicAppointment,
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
  getAppointmentChangePaths,
  getJourneyPathBuilder,
  getRequiredSlotCount,
  getPreviousAddressItems,
  getPreviousSessionItems
} from '../utils/clinic-appointment.js'
import {
  getBookableClinicSessions,
  getBookableClinicDateItems,
  getBookableClinicLocationItems
} from '../utils/clinic-booking.js'
import { getAdditionalNeeds } from '../utils/feature-flags.js'
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

      // We don't know anything yet about specifc vaccine choices, but we can at least
      // check that there are clinics serving the right programmes
      const vaccinationChoices = {
        selected_programme_ids: programme_ids,
        fluDecision: undefined,
        fluAlternative: undefined,
        mmrAlternative: undefined
      }

      // Do we need to tell the user that there are no suitable clinics at all?
      nextPath = getBookableClinicSessions(
        data,
        vaccinationChoices,
        false,
        false
      ).length
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

      // We don't know anything yet about specifc vaccine choices, but we can at least
      // check that there are clinics serving the right programmes
      programme_ids = Array.isArray(programme_id)
        ? programme_id
        : [programme_id]
      const vaccinationChoices = {
        selected_programme_ids: programme_ids,
        fluDecision: undefined,
        fluAlternative: undefined,
        mmrAlternative: undefined
      }

      // Do we need to tell the user that there are no suitable clinics at all?
      nextPath = getBookableClinicSessions(
        data,
        vaccinationChoices,
        false,
        true
      ).length
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

    // Redirect relative to where this router's mounted, so it works whether or not the URL has a trailing slash
    return saveAndRedirect(request, response, `${request.baseUrl}/${nextPath}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { data } = request.session
    const { patient_uuid, session_id } = request.params

    // Create a new clinic booking in the wizard context
    const booking = ClinicBooking.create({}, data.wizard)

    // Track various metadata about the journey that we don't record in the booking itself
    const journeyType = patient_uuid
      ? ClinicBookingJourneyType.PhoneBooking
      : session_id
        ? ClinicBookingJourneyType.DataMigration
        : ClinicBookingJourneyType.ParentOnline
    if (!data.journeyData) data.journeyData = {}
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
        appointment.startAt = new Date(slot)

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

    // Give access to the booking on a global context
    let booking = ClinicBooking.findOne(booking_uuid, data)
    if (!booking) {
      booking = new ClinicBooking(
        ClinicBooking.findOne(booking_uuid, data.wizard),
        data
      )
    }
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

    // Track the (possibly session- or child-record-based) path to the new appointment's pages, but only on the
    // booking-based routes used for new bookings, as it's meaningless anywhere else
    if (request.params.booking_uuid) {
      const newAppointmentPath = appointment.uri.new.replace(
        '/book-into-a-clinic',
        ''
      )
      response.locals.newAppointmentPath = `${request.baseUrl}${newAppointmentPath}`
    }

    // For multi-child bookings
    response.locals.childNumber = booking.appointments.indexOf(appointment) + 1
    response.locals.childCount = booking.appointments.length

    // TODO: tidy up this hangover from multi-child bookings (make pages use only one form?)
    response.locals.firstName = isParentFacing ? 'your child' : 'the child'
    response.locals.fullName = isParentFacing ? 'your child' : 'the child'

    next()
  },

  /**
   * For routes that identify an appointment without its booking, read both the booking and the appointment
   *
   * @type {RequestParamHandler}
   */
  readBookingAndAppointment(request, response, next, appointment_uuid) {
    const { data } = request.session

    const appointment = ClinicAppointment.findOne(appointment_uuid, data)
    if (!appointment) {
      return next('route')
    }

    // Base the editing paths on the saved appointment, so they stay in the same session
    // while the appointment's being moved to another one
    response.locals.editPath = appointment.uri.edit
    response.locals.matchedPath = appointment.uri.matched

    bookIntoClinicController.readBooking(
      request,
      response,
      () =>
        bookIntoClinicController.readAppointment(
          request,
          response,
          next,
          appointment_uuid,
          'appointment_uuid'
        ),
      appointment.booking_uuid,
      'booking_uuid'
    )
  },

  /**
   * Show an appointment, which lives on the patient session page if it's been matched to a patient
   *
   * @type {RequestHandler<Record<string, string>>}
   */
  showAppointment(request, response) {
    const { appointment } = response.locals

    const appointmentPath = appointment.patient_uuid
      ? appointment.uri.matched
      : `/sessions/${appointment.session_id}${appointment.uri.unmatched}`

    return saveAndRedirect(request, response, appointmentPath)
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
    const { newAppointmentPath } = response.locals

    const params = getFilterParams(request, ['q'], ['option'])
    const resultsUri = `${newAppointmentPath}/find-child?${params}`
    return saveAndRedirect(request, response, resultsUri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  linkChild(request, response) {
    const { patient_uuid } = /** @type {{ patient_uuid?: string }} */ (
      request.query
    )
    const { appointment_uuid } = request.params
    const { data } = request.session
    const { newAppointmentPath, booking } = response.locals
    const booking_uuid = booking.uuid

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
      nextPage = `${newAppointmentPath}/programmes`
    } else {
      nextPage = `${newAppointmentPath}/not-eligible`
    }

    return saveAndRedirect(request, response, nextPage)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  edit(request, response) {
    const { appointment_uuid } = request.params
    const { data } = request.session
    const { __ } = response.locals
    const booking_uuid = response.locals.booking.uuid

    // Copy the existing booking to the wizard context, if not already there
    let booking = ClinicBooking.findOne(booking_uuid, data.wizard)
    if (!booking) {
      const existingBooking = ClinicBooking.findOne(booking_uuid, data)
      booking = ClinicBooking.create(existingBooking, data.wizard)
    }

    // Give access to the data needed for the summaryRows
    const bookingWithFullContext = new ClinicBooking(booking, data)
    const appointment = bookingWithFullContext.findAppointment(appointment_uuid)
    response.locals.booking = bookingWithFullContext
    response.locals.appointment = appointment

    // Track various metadata about the journey that we don't record in the booking itself, including the values
    // that the change pages need (and show as selected) but that are otherwise only recorded while booking
    // Note: this is reset each time the edit page is shown, so each change starts afresh
    const startAt = new Date(appointment.startAt)
    if (!data.journeyData) data.journeyData = {}

    // Clear auto-stored answers from previous journeys, but keep any live booking-specific journey data
    delete data.appointment
    for (const key of Object.keys(data.journeyData)) {
      if (!ClinicBooking.findOne(key, data.wizard)) {
        delete data.journeyData[key]
      }
    }

    data.journeyData[booking.uuid] = {
      journeyType: ClinicBookingJourneyType.TeamEditing,
      clinic_id: appointment.session?.clinic_id,
      timeRange: startAt.getHours(),
      time: startAt.toISOString()
    }

    // Show the child context in the caption
    response.locals.appointmentCaption = __(
      'clinicBooking.appointment.caption',
      appointment?.fullName
    )

    // Show back link to patient session page
    response.locals.back = response.locals.matchedPath

    return response.render('book-into-a-clinic/edit')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  startCancel(request, response) {
    const { appointment_uuid } = request.params

    request.session.data.cancellation = {}

    return saveAndRedirect(
      request,
      response,
      `${request.baseUrl}/${appointment_uuid}/cancel/rebooking`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showCancel(request, response) {
    const { appointment_uuid, view } = request.params
    const { appointment, matchedPath } = response.locals

    response.locals.appointmentSummary = `${appointment.formatted.programmeNames} clinic appointment for ${appointment.patient.fullName}`

    response.locals.back =
      view === 'rebooking'
        ? matchedPath
        : `${request.baseUrl}/${appointment_uuid}/cancel/rebooking`

    return response.render(`book-into-a-clinic/cancel/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateCancel(request, response) {
    const { data } = request.session
    const { appointment_uuid, view } = request.params
    const { __, account, booking, session } = response.locals

    // Where next?
    const nextPage =
      view === 'rebooking'
        ? `${request.baseUrl}/${appointment_uuid}/cancel/confirm`
        : session.uri

    if (view === 'rebooking') {
      // Sanitise the boolean from the radio
      data.cancellation.offerRebooking = stringToBoolean(
        data.cancellation.offerRebooking
      )
    } else if (view === 'confirm') {
      // Carry out the cancellation
      const appointment = booking.findAppointment(appointment_uuid)
      appointment.cancelAppointment(account, data.cancellation.offerRebooking)
      ClinicBooking.update(booking.uuid, booking, data)

      // Tidy up
      delete data.cancellation

      request.flash(
        'success',
        __('patientSession.clinicAppointment.cancel.confirm.success', {
          patientName: appointment.patient.fullName,
          clinicName: appointment.session.formatted.clinic
        })
      )
    }

    return saveAndRedirect(request, response, nextPage)
  },

  /**
   * Abandon any changes made while editing an appointment, and return to the appointment's page
   *
   * @type {RequestHandler<Record<string, string>>}
   */
  discardEdit(request, response) {
    const { data } = request.session
    const { booking, matchedPath } = response.locals

    ClinicBooking.delete(booking.uuid, data.wizard)
    delete data.journeyData?.[booking.uuid]

    return saveAndRedirect(request, response, matchedPath)
  },

  /**
   * @param {string} action - action being carried out i.e. create new vs edit existing
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(action) {
    return (request, response) => {
      const { appointment_uuid } = request.params
      const { data } = request.session
      const { __, paths, patient, session } = response.locals
      let { booking } = response.locals
      const booking_uuid = booking.uuid

      let successMessageKey = 'success'
      // When editing, it's the copy in the wizard context that holds the changes; discard that copy once saved, so
      // it isn't picked up by the next edit
      if (action === 'edit') {
        // Keep a copy of the updated appointment/booking, but clean up the wizard context
        booking = new ClinicBooking(
          ClinicBooking.findOne(booking_uuid, data.wizard),
          data
        )
        ClinicBooking.delete(booking_uuid, data.wizard)

        // Move patient sessions, if the user has selected a different session
        const originalAppointment = ClinicAppointment.findOne(
          appointment_uuid,
          data
        )
        const updatedAppointment = booking.findAppointment(appointment_uuid)
        if (originalAppointment.session_id !== updatedAppointment.session_id) {
          updatedAppointment.moveBetweenSessions(originalAppointment.session_id)
          successMessageKey = 'success.moved'
        } else {
          successMessageKey = 'success.updated'
        }
      }

      // Save to the global context
      ClinicBooking.update(booking_uuid, booking, data)
      const appointment = booking.findAppointment(appointment_uuid)

      // Finalise things for SAIS team journeys
      if (patient) {
        // Create the patient-session records for a new appointment
        if (action === 'new') {
          appointment.addToSession()
        }

        request.flash(
          'success',
          __(`clinicBooking.${action}.${successMessageKey}`, {
            fullName: patient.fullName,
            sessionName: appointment.session.name
          })
        )
      }

      // Get back to where we started, if this isn't the parent journey
      let nextPage = paths?.next
      if (action === 'edit') {
        nextPage = appointment.uri.matched
      } else if (session) {
        const journeyStart = data.journeyData[booking_uuid].preselectedSlot
          ? 'appointments'
          : 'patients'
        nextPage = `${session.uri}/${journeyStart}`
      } else if (patient) {
        nextPage = patient.uri
      }

      // Clean up session data
      delete data.booking
      delete data.appointment
      delete data.journeyData[booking_uuid]
      delete data.programmesToOffer

      return saveAndRedirect(request, response, nextPage)
    }
  },

  /**
   * @param {string} action - action being carried out i.e. create new vs edit existing
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  updateFeedback(action) {
    action // unused so far
    return (request, response) => {
      const { appointment_uuid } = request.params
      const { data } = request.session
      const { booking, paths } = response.locals
      const booking_uuid = booking.uuid

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
    }
  },

  /**
   * @param {string} action - action being carried out i.e. create new vs edit existing
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(action) {
    return (request, response, next) => {
      const { appointment_uuid, view } = request.params
      const { data, referrer } = request.session
      const booking_uuid = response.locals.booking.uuid

      // Make sure the pages are working with the values from the wizard context,
      // but with access to the global context e.g. for the appointment's patient
      const booking = new ClinicBooking(
        ClinicBooking.findOne(booking_uuid, data.wizard),
        data
      )
      response.locals.booking = booking
      response.locals.appointment =
        appointment_uuid && booking.findAppointment(appointment_uuid)

      // If we took a shortcut to the clinic location page by the user entering a preferred postcode, make sure
      // that postcode is pushed to the appointment
      if (
        view === 'clinic-location' &&
        data.appointment?.['preferredPostcode']
      ) {
        const wizardBooking = ClinicBooking.findOne(booking_uuid, data.wizard)
        const appointment = wizardBooking.findAppointment(appointment_uuid)
        appointment.preferredPostcode = data.appointment?.['preferredPostcode']
        ClinicBooking.update(booking_uuid, wizardBooking, data.wizard)
      }

      const getPath = getJourneyPathBuilder(request, action)

      if (action === 'edit') {
        // The change links on the edit page carry a referrer back to it, marking the page at which this change started
        const journeyData = data.journeyData[booking_uuid]
        const { referrer: changeReferrer } =
          /** @type {{ referrer?: string }} */ (request.query)
        if (changeReferrer) {
          journeyData.firstChangeView = view
        }
        delete request.session.referrer

        const journey = getAppointmentChangePaths(
          response.locals.appointment,
          data,
          getPath,
          journeyData.firstChangeView
        )

        // Start and finish the change at the edit page, so the user can review the changes before saving them
        const { editPath } = response.locals
        const paths = wizard(journey, request)
        paths.back = paths.back || editPath
        paths.next = (paths.next || editPath).split('?')[0]
        response.locals.paths = paths // used later to redirect in updateForm

        return next()
      }

      const journey = {
        // Appointment journey; once per child
        ...getAllAppointmentPaths(
          booking_uuid,
          request.session.data,
          booking.appointments,
          getPath
        ),

        // Confirmation! \o/
        [getPath('confirmation')]: {}
      }

      const paths = wizard(journey, request)
      paths.back = referrer || paths.back
      response.locals.paths = paths // used later to redirect in updateForm

      return next()
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { __mf, appointment, patient } = response.locals
    const { data } = request.session
    let { view } = request.params
    const booking_uuid = response.locals.booking.uuid

    // Adapt content in the views for the journey's audience
    const journeyType =
      data.journeyData[booking_uuid]?.journeyType ??
      ClinicBookingJourneyType.ParentOnline
    response.locals.isParentFacing =
      journeyType === ClinicBookingJourneyType.ParentOnline

    // Simplify access to the journey data in the views
    response.locals.journeyData = data.journeyData[booking_uuid]

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
        RelationshipType
      )
        .filter((relationship) => relationship !== RelationshipType.Unknown)
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
        session.bookableStartTimesForAppointment(appointment),
        (time) => time.getHours()
      )

      const timeRangeItems = []
      Object.entries(availableTimesByHour).forEach(([hour, times]) => {
        if (times.length) {
          const startHourNumber = parseInt(hour)
          const endHourNumber = startHourNumber + 1
          const uniqueTimesCount = new Set(times.map((time) => time.getTime()))
            .size

          timeRangeItems.push({
            text: `${formatHour(startHourNumber)} to ${formatHour(endHourNumber)}`,
            value: startHourNumber,
            hint: __mf('clinicBooking.timeRange.range.timesAvailable', {
              count: uniqueTimesCount
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
        session.bookableStartTimesForAppointment(appointment),
        (time) => time.getHours()
      )

      const availabilityForChosenHour = {}
      for (const date of availableTimesByHour[
        data.journeyData[booking_uuid].timeRange
      ]) {
        const key = formatTime(date, { isHour12: true })

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
            value: availability.date.toISOString()
          })
        }
      )
      response.locals.appointmentTimeItems = appointmentTimeItems
      response.locals.clinicSummary = {
        location: session.clinic.formatted.nameAndAddress,
        date: session.formatted.date
      }
    } else if (view === 'appointment-length') {
      const session = Session.findOne(appointment.session_id, data)
      response.locals.clinicSummary = {
        location: session.clinic.formatted.nameAndAddress,
        date: session.formatted.date
      }

      response.locals.defaultLengthInSlots =
        session.calculateSlotCount(appointment)
      response.locals.defaultLengthInMinutes =
        response.locals.defaultLengthInSlots * session.slotLength
      response.locals.slotLengthInMinutes = session.slotLength

      data.journeyData['appointmentLengthType'] = appointment.editedSlotCount
        ? AppointmentLengthType.Specific
        : AppointmentLengthType.Default
    } else if (view === 'shorten-appointment') {
      const session = Session.findOne(appointment.session_id, data)
      const requiredSlots = appointment.slotCount

      // Look for space at the appointment's time only if it's been preselected; otherwise (including when editing,
      // where the time is chosen after the length) look anywhere in the session
      const { preselectedSlot } = data.journeyData[booking_uuid]
      const availableSlots = session.longestAvailableAppointment(
        preselectedSlot ? appointment.startAt : undefined,
        appointment.uuid
      )

      response.locals.requiredSlots = requiredSlots
      response.locals.requiredMinutes = requiredSlots * session.slotLength
      response.locals.availableSlots = availableSlots
      response.locals.availableMinutes = availableSlots * session.slotLength

      if (data.journeyData[booking_uuid].preselectedSlot) {
        response.locals.slotStartTime = formatTime(appointment.startAt, {
          isHour12: true
        })
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

    response.locals.additionalNeedsFeatureFlag = getAdditionalNeeds()

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
      appointment?.getUnansweredHealthQuestions(data)[key]?.conditional

    return response.render(`book-into-a-clinic/form/${view}`, {
      key,
      hasSubQuestions
    })
  },

  /**
   * @param {string} action - action being carried out i.e. create new vs edit existing
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  updateForm(action) {
    return (request, response) => {
      const { appointment_uuid, view } = request.params
      const { data } = request.session
      const { paths } = response.locals
      const booking_uuid = response.locals.booking.uuid

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

      if (view === 'shorten-appointment') {
        // Must've decided to shorten and continue
        const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
        const appointment = booking.findAppointment(appointment_uuid)
        const session = Session.findOne(appointment.session_id, data)

        // Remember the length the appointment should have been, so it shows as 'might overrun' (and, when
        // booking, so the shortening's kept for as long as that's still the length required)
        const { preselectedSlot } = data.journeyData[booking_uuid]
        appointment.preferredSlotCount = appointment.slotCount
        appointment.editedSlotCount = session.longestAvailableAppointment(
          preselectedSlot ? appointment.startAt : undefined,
          appointment.uuid
        )

        ClinicBooking.update(booking_uuid, booking, data.wizard)

        // When editing, update the answers auto-stored from the appointment-length page to match, so that this page
        // drops out of the journey and the length page shows the shortened length
        if (action === 'edit') {
          data.journeyData['appointmentLengthType'] =
            AppointmentLengthType.Specific
          data.appointment = Object.assign({}, data.appointment, {
            editedSlotCount: appointment.editedSlotCount
          })
        }
      } else if (view === 'child-count') {
        // We've just set the child count, so create the appointments we'll need
        const booking = ClinicBooking.findOne(booking_uuid, data.wizard)

        let desiredCount = Number(data.journeyData[booking_uuid].childCount)
        desiredCount =
          isNaN(desiredCount) || desiredCount < 1 ? 1 : desiredCount
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

        const previous_appointment_uuid =
          data.journeyData[booking_uuid].addressChoice
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

          ClinicBooking.update(booking.uuid, booking, data.wizard)
        }
      } else if (
        action === 'new' &&
        ((view === 'additional-support' &&
          data.journeyData[booking_uuid].journeyType ===
            ClinicBookingJourneyType.DataMigration) ||
          view === 'clinic-date')
      ) {
        // Now that we have all appointment length determiners nailed down, finalise
        // the appointment length (when editing, keep the existing length, including any
        // extension or shortening)
        const booking = new ClinicBooking(
          ClinicBooking.findOne(booking_uuid, data.wizard),
          data
        )
        const appointment = booking.findAppointment(appointment_uuid)
        const requiredSlotCount = getRequiredSlotCount(
          appointment,
          stringToBoolean(data.journeyData[booking_uuid].extendForSupportNeeds)
        )

        // Keep any shortening to fit that the team has already accepted for this length, but otherwise use the
        // length required
        if (appointment.preferredSlotCount !== requiredSlotCount) {
          const defaultSlotCount =
            appointment.session.calculateSlotCount(appointment)
          appointment.preferredSlotCount = undefined
          appointment.editedSlotCount =
            requiredSlotCount === defaultSlotCount
              ? undefined
              : requiredSlotCount
        }

        ClinicBooking.update(booking.uuid, booking, data.wizard)
      } else if (view === 'appointment-length') {
        const booking = ClinicBooking.findOne(booking_uuid, data.wizard)
        const appointment = booking.findAppointment(appointment_uuid)

        // A newly chosen length replaces any earlier shortening to fit
        appointment.preferredSlotCount = undefined

        if (
          data.journeyData[booking_uuid].appointmentLengthType ===
          AppointmentLengthType.Default
        ) {
          // Clear out any previous team-defined length
          appointment.editedSlotCount = 0
        }

        ClinicBooking.update(booking_uuid, booking, data.wizard)
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
    }
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
