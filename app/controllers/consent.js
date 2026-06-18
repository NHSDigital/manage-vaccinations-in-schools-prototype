import _ from 'lodash'

import { Consent, PatientSession, Patient, Session } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'
import { getFilterParams } from '../utils/url.js'

export const consentController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, consent_uuid) {
    const { patient_uuid } = request.query
    const { session_id } = request.params
    const { referrer } = request.session

    const consent = Consent.findOne(consent_uuid, request.session.data)
    const back = session_id
      ? `/sessions/${consent.session_id}/consents`
      : '/consents'

    response.locals.back = referrer || back
    response.locals.consent = consent
    response.locals.patient = Patient.findOne(
      String(patient_uuid),
      request.session.data
    )
    response.locals.consentPath = session_id
      ? `/sessions/${consent.session_id}${consent.uri}`
      : consent.uri
    response.locals.consentsPath = session_id
      ? `/sessions/${session_id}/consents`
      : '/consents'

    delete request.session.referrer

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    const { session_id } = request.params
    let consents = Consent.findAll(request.session.data)

    // Sort
    consents = _.sortBy(consents, 'createdAt')

    // Session consents
    if (session_id) {
      const session = Session.findOne(session_id, request.session.data)
      consents = session.consents
      response.locals.session = session
    }

    response.locals.consents = consents
    response.locals.consentsPath = session_id
      ? `/sessions/${session_id}/consents`
      : '/consents'
    response.locals.results = getResults(consents, request.query)
    response.locals.pages = getPagination(consents, request.query)

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`consent/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.render('consent/list')
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
    const { consent } = response.locals

    const params = getFilterParams(request, ['q'], ['option'])

    return response.redirect(`${consent.uri}/match?${params}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  link(request, response) {
    const { consent_uuid } = request.params
    const { data } = request.session
    const { __, consent, patient, consentsPath } = response.locals

    // Link consent with patient record
    consent.linkToPatient(patient)

    // Update session data
    Consent.update(consent_uuid, consent, data)
    Patient.update(patient.uuid, patient, data)

    request.flash('success', __(`consent.link.success`, { consent, patient }))

    return response.redirect(consentsPath)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  add(request, response) {
    const { consent_uuid } = request.params
    const { data } = request.session
    const { __, consent, consentsPath } = response.locals

    // Create patient
    const patient = Patient.create(consent.child, data)

    // Create and add patient session
    const patientSession = PatientSession.create(
      {
        patient_uuid: patient.uuid,
        programme_id: consent.programme_id,
        session_id: consent.session_id
      },
      data
    )

    // Add to session
    patient.addToSession(patientSession)

    // Invite contact to give consent
    patient.requestConsent(patientSession)

    // Link consent with patient record
    consent.linkToPatient(patient)

    // Update session data
    Consent.update(consent_uuid, consent, data)
    Patient.update(patient.uuid, patient, data)

    request.flash('success', __(`consent.add.success`, { consent, patient }))

    return response.redirect(consentsPath)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  invalidate(request, response) {
    const { note } = request.body.consent
    const { consent_uuid } = request.params
    const { data } = request.session
    const { __, consentsPath } = response.locals

    // Clean up session data
    delete data.consent

    // Update session data
    const consent = Consent.update(consent_uuid, { invalid: true, note }, data)

    data.counts.consents--
    data.counts.review--

    request.flash('success', __(`consent.invalidate.success`, { consent }))

    return response.redirect(consentsPath)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 * @import { PatientFilterQuery } from '../../typings/index.d.ts'
 */
