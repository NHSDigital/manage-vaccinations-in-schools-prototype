import _ from 'lodash'

import { ClinicAppointment, ClinicBooking, Session } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const unmatchedAppointmentController = {
  read(request, response, next, appointment_uuid) {
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

    response.locals.appointmentPath = session_id
      ? `/sessions/${session_id}${appointment.uri.unmatched}`
      : appointment.uri.unmatched
    response.locals.appointmentsPath = session_id
      ? `/sessions/${session_id}/unmatched-appointments`
      : '/unmatched-appointments'

    next()
  },

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

    next()
  },

  show(request, response) {
    const view = request.params.view || 'show'

    response.render(`appointments/${view}`)
  },

  list(request, response) {
    response.render('appointments/list')
  },

  // readMatches(request, response, next) {
  //   let { hasMissingNhsNumber, page, limit, q } = request.query
  //   const { data } = request.session

  //   let patients = Patient.findAll(data)

  //   // Sort
  //   patients = _.sortBy(patients, 'lastName')

  //   // Paginate
  //   page = parseInt(page) || 1
  //   limit = parseInt(limit) || 50

  //   // Query
  //   if (q) {
  //     patients = patients.filter((patient) =>
  //       patient.tokenized.includes(String(q).toLowerCase())
  //     )
  //   }

  //   // Filter by missing NHS number
  //   if (hasMissingNhsNumber) {
  //     patients = patients.filter((patient) => patient.hasMissingNhsNumber)
  //   }

  //   // Toggle initial view
  //   response.locals.initial =
  //     Object.keys(request.query).filter((key) => key !== 'referrer').length ===
  //     0

  //   // Results
  //   response.locals.patients = patients
  //   response.locals.results = getResults(patients, page, limit)
  //   response.locals.pages = getPagination(patients, request.query)

  //   // Clean up session data
  //   delete data.hasMissingNhsNumber
  //   delete data.q

  //   next()
  // },

  // filterMatches(request, response) {
  //   const { hasMissingNhsNumber, q } = request.body
  //   const { consent } = response.locals
  //   const params = new URLSearchParams()

  //   if (q) {
  //     params.append('q', String(q))
  //   }

  //   if (hasMissingNhsNumber?.includes('true')) {
  //     params.append('hasMissingNhsNumber', 'true')
  //   }

  //   response.redirect(`${consent.uri}/match?${params}`)
  // },

  // link(request, response) {
  //   const { consent_uuid } = request.params
  //   const { data } = request.session
  //   const { __, consent, patient, consentsPath } = response.locals

  //   // Link consent with patient record
  //   consent.linkToPatient(patient)

  //   // Update session data
  //   Consent.update(consent_uuid, consent, data)
  //   Patient.update(patient.uuid, patient, data)

  //   request.flash('success', __(`consent.link.success`, { consent, patient }))

  //   response.redirect(consentsPath)
  // },

  // add(request, response) {
  //   const { consent_uuid } = request.params
  //   const { data } = request.session
  //   const { __, consent, consentsPath } = response.locals

  //   // Create patient
  //   const patient = Patient.create(consent.child, data)

  //   // Create and add patient session
  //   const patientSession = PatientSession.create(
  //     {
  //       patient_uuid: patient.uuid,
  //       programme_id: consent.programme_id,
  //       session_id: consent.session_id
  //     },
  //     data
  //   )

  //   // Add to session
  //   patient.addToSession(patientSession)

  //   // Invite contact to give consent
  //   patient.requestConsent(patientSession)

  //   // Link consent with patient record
  //   consent.linkToPatient(patient)

  //   // Update session data
  //   Consent.update(consent_uuid, consent, data)
  //   Patient.update(patient.uuid, patient, data)

  //   request.flash('success', __(`consent.add.success`, { consent, patient }))

  //   response.redirect(consentsPath)
  // },

  archive(request, response) {
    const { note } = request.body.appointment
    const { appointment_uuid } = request.params
    const { data } = request.session
    const { __, appointmentsPath } = response.locals

    // Clean up session data
    delete data.appointment

    // Update session data
    const booking_uuid = ClinicAppointment.findOne(
      appointment_uuid,
      data
    )?.booking_uuid
    if (booking_uuid) {
      const booking = ClinicBooking.findOne(booking_uuid, data)
      const appointment = booking.findAppointment(appointment_uuid)
      appointment.archived = true
      appointment.note = note

      ClinicBooking.update(booking_uuid, booking, data)

      data.counts.appointments--
      data.counts.review--

      request.flash(
        'success',
        __(`appointments.archive.success`, { appointment })
      )
    }

    response.redirect(appointmentsPath)
  }
}
