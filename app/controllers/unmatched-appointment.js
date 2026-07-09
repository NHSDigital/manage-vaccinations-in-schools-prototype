import _ from 'lodash'

import { ClinicAppointmentStatus } from '../enums.js'
import {
  ClinicAppointment,
  ClinicBooking,
  Patient,
  Session
} from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { getFilterParams } from '../utils/url.js'

export const unmatchedAppointmentController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, appointment_uuid) {
    const { patient_uuid } = request.query
    const { session_id } = request.params
    const { referrer } = request.session

    const appointment = ClinicAppointment.findOne(
      appointment_uuid,
      request.session.data
    )
    const back = session_id
      ? `/sessions/${session_id}/unmatched-appointments`
      : '/unmatched-appointments'

    response.locals.back = referrer || back
    response.locals.appointment = appointment
    response.locals.patient = Patient.findOne(
      String(patient_uuid),
      request.session.data
    )

    response.locals.appointmentPath = session_id
      ? `/sessions/${session_id}${appointment.uri.unmatched}`
      : appointment.uri.unmatched
    response.locals.appointmentsPath = session_id
      ? `/sessions/${session_id}/unmatched-appointments`
      : '/unmatched-appointments'

    delete request.session.referrer

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    const { session_id } = request.params
    let appointments = ClinicBooking.findAll(request.session.data)
      ?.flatMap(({ appointments }) => appointments)
      .filter(
        (appointment) =>
          !appointment.patient_uuid &&
          appointment.status === ClinicAppointmentStatus.Booked
      )

    // Sort
    appointments = _.sortBy(appointments, 'startAt')

    // Session appointments
    if (session_id) {
      const session = Session.findOne(session_id, request.session.data)
      response.locals.session = session

      appointments = appointments.filter(
        (appointment) => appointment.session_id === session_id
      )
    }

    response.locals.appointments = appointments
    response.locals.appointmentsPath = session_id
      ? `/sessions/${session_id}/unmatched-appointments`
      : '/unmatched-appointments'
    response.locals.results = getResults(appointments, request.query)
    response.locals.pages = getPagination(appointments, request.query)

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`appointments/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.render('appointments/list')
  },

  /**
   * @type {RequestHandler<Record<string, string>, Record<string, unknown>, Record<string, unknown>, PatientFilterQuery>}
   */
  readMatches(request, response, next) {
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
      'hasAdjustment',
      'hasImpairment',
      'hasMissingNhsNumber',
      'isArchived'
    ]) {
      if (option?.includes(key)) {
        results = results.filter((patient) => patient[key])
      }
    }

    // Toggle initial view
    response.locals.initial =
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
  filterMatches(request, response) {
    const { appointment } = response.locals

    const params = getFilterParams(request, ['q'], ['option'])

    return saveAndRedirect(
      request,
      response,
      `${appointment.uri.unmatched}/match?${params}`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  link(request, response) {
    const { appointment_uuid } = request.params
    const { data } = request.session
    const { __, patient, appointmentsPath } = response.locals

    // Get the booking we'll need to update
    const booking = ClinicBooking.findOne(
      response.locals.appointment.booking_uuid,
      data
    )
    const appointment = booking.findAppointment(appointment_uuid)

    // Link appointment to patient record
    appointment.patient_uuid = patient.uuid

    // Create and add patient session for each programme they've signed up for
    appointment.addToSession()

    // Update session data
    ClinicBooking.update(booking.uuid, booking, data)

    // Update the review badges
    data.counts.appointments--
    data.counts.review--

    request.flash(
      'success',
      __(`appointments.link.success`, { appointment, patient })
    )

    return saveAndRedirect(request, response, appointmentsPath)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  add(request, response) {
    const { appointment_uuid } = request.params
    const { data } = request.session
    const { __, appointmentsPath } = response.locals

    // Get the booking we'll need to update
    const booking = ClinicBooking.findOne(
      response.locals.appointment.booking_uuid,
      data
    )
    const appointment = booking.findAppointment(appointment_uuid)

    // Create patient
    const patient = Patient.create(appointment.child, data)

    // Link appointment to patient record
    appointment.patient_uuid = patient.uuid

    // Create and add patient session for each programme they've signed up for
    appointment.addToSession()

    // Update session data
    ClinicBooking.update(booking.uuid, booking, data)

    // Update the review badges
    data.counts.appointments--
    data.counts.review--

    request.flash(
      'success',
      __(`appointments.add.success`, { appointment, patient })
    )

    return saveAndRedirect(request, response, appointmentsPath)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  archive(request, response) {
    const { note } = request.body.appointment
    const { appointment_uuid } = request.params
    const { data } = request.session
    const { __, appointmentsPath } = response.locals

    // Clean up session data
    delete data.appointment

    const booking_uuid = ClinicAppointment.findOne(
      appointment_uuid,
      data
    )?.booking_uuid
    if (booking_uuid) {
      // Update session data
      const booking = ClinicBooking.findOne(booking_uuid, data)
      const appointment = booking.findAppointment(appointment_uuid)
      appointment.status = ClinicAppointmentStatus.Archived
      appointment.note = note

      ClinicBooking.update(booking_uuid, booking, data)

      // Update the review badges
      data.counts.appointments--
      data.counts.review--

      request.flash(
        'success',
        __(`appointments.archive.success`, { appointment })
      )
    }

    return saveAndRedirect(request, response, appointmentsPath)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 * @import { PatientFilterQuery } from '../../typings/index.d.ts'
 */
