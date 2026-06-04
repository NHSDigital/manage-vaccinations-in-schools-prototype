import _ from 'lodash'

import {
  ClinicAppointment,
  ClinicBooking,
  Patient,
  PatientSession,
  Session
} from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const unmatchedAppointmentController = {
  /**
   * @type {import("express").RequestParamHandler}
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
   * @type {import("express").RequestHandler}
   */
  readAll(request, response, next) {
    const { session_id } = request.params
    let appointments = ClinicBooking.findAll(request.session.data)
      ?.flatMap(({ appointments }) => appointments)
      .filter(
        (appointment) => !appointment.patient_uuid && !appointment.archived
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
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`appointments/${view}`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  list(request, response) {
    return response.render('appointments/list')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readMatches(request, response, next) {
    let { hasMissingNhsNumber, q } = request.query
    const { data } = request.session

    let patients = Patient.findAll(data)

    // Sort
    patients = _.sortBy(patients, 'lastName')

    // Query
    if (q) {
      patients = patients.filter((patient) =>
        patient.tokenized.includes(String(q).toLowerCase())
      )
    }

    // Filter by missing NHS number
    if (hasMissingNhsNumber) {
      patients = patients.filter((patient) => patient.hasMissingNhsNumber)
    }

    // Toggle initial view
    response.locals.initial =
      Object.keys(request.query).filter((key) => key !== 'referrer').length ===
      0

    // Results
    response.locals.patients = patients
    response.locals.results = getResults(patients, request.query)
    response.locals.pages = getPagination(patients, request.query)

    // Clean up session data
    delete data.hasMissingNhsNumber
    delete data.q

    return next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  filterMatches(request, response) {
    const { hasMissingNhsNumber, q } = request.body
    const { appointment } = response.locals
    const params = new URLSearchParams()

    if (q) {
      params.append('q', String(q))
    }

    if (hasMissingNhsNumber?.includes('true')) {
      params.append('hasMissingNhsNumber', 'true')
    }

    return response.redirect(`${appointment.uri.unmatched}/match?${params}`)
  },

  /**
   * @type {import("express").RequestHandler}
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

    // Create and add patient session for each programme they've signed up for
    for (const programme_id of appointment.selected_programme_ids) {
      const patientSession = PatientSession.create(
        {
          patient_uuid: patient.uuid,
          programme_id: programme_id,
          session_id: appointment.session_id
        },
        data
      )

      // Add to session
      patient.addToSession(patientSession)
    }

    // Link appointment to patient record
    appointment.patient_uuid = patient.uuid

    // Update session data
    ClinicBooking.update(booking.uuid, booking, data)
    Patient.update(patient.uuid, patient, data)

    // Update the review badges
    data.counts.appointments--
    data.counts.review--

    request.flash(
      'success',
      __(`appointments.link.success`, { appointment, patient })
    )

    return response.redirect(appointmentsPath)
  },

  /**
   * @type {import("express").RequestHandler}
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

    // Create and add patient session for each programme they've signed up for
    for (const programme_id of appointment.selected_programme_ids) {
      const patientSession = PatientSession.create(
        {
          patient_uuid: patient.uuid,
          programme_id: programme_id,
          session_id: appointment.session_id
        },
        data
      )

      // Add to session
      patient.addToSession(patientSession)
    }

    // Link appointment to patient record
    appointment.patient_uuid = patient.uuid

    // Update session data
    ClinicBooking.update(booking.uuid, booking, data)
    Patient.update(patient.uuid, patient, data)

    // Update the review badges
    data.counts.appointments--
    data.counts.review--

    request.flash(
      'success',
      __(`appointments.add.success`, { appointment, patient })
    )

    return response.redirect(appointmentsPath)
  },

  /**
   * @type {import("express").RequestHandler}
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
      appointment.archived = true
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

    return response.redirect(appointmentsPath)
  }
}
