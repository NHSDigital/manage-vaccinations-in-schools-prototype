import _ from 'lodash'

import { ClinicBooking, Session } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const appointmentController = {
  read(request, response, next, appointment_uuid) {
    console.log(`read: ${appointment_uuid}`)

    next()
  },

  readAll(request, response, next) {
    const { session_id } = request.params
    let appointments = ClinicBooking.findAll(request.session.data)
      ?.flatMap(({ appointments }) => appointments)
      .filter(({ patient_uuid }) => !patient_uuid)

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
      ? `/sessions/${session_id}/appointments`
      : '/appointments'
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
  }

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

  //   // Invite parent to give consent
  //   patient.requestConsent(patientSession)

  //   // Link consent with patient record
  //   consent.linkToPatient(patient)

  //   // Update session data
  //   Consent.update(consent_uuid, consent, data)
  //   Patient.update(patient.uuid, patient, data)

  //   request.flash('success', __(`consent.add.success`, { consent, patient }))

  //   response.redirect(consentsPath)
  // },

  // invalidate(request, response) {
  //   const { note } = request.body.consent
  //   const { consent_uuid } = request.params
  //   const { data } = request.session
  //   const { __, consentsPath } = response.locals

  //   // Clean up session data
  //   delete data.consent

  //   // Update session data
  //   const consent = Consent.update(consent_uuid, { invalid: true, note }, data)

  //   request.flash('success', __(`consent.invalidate.success`, { consent }))

  //   response.redirect(consentsPath)
  // }
}
