import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import { generateChild } from '../generators/child.js'
import { Patient } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const pdsController = {
  redirect(request, response) {
    response.redirect('/patients')
  },

  start(request, response) {
    const { data } = request.session

    if (request.body.nhsn) {
      const child = generateChild()
      const newPatient = new Patient({ ...child }, data)

      // Add entered NHS number
      newPatient.nhsn = request.body.nhsn.replaceAll(' ', '')

      // Remove school (PDS doesn’t contain information about school attendance)
      delete newPatient.school_id

      // Add patient to wizard data
      Patient.create(newPatient, data.wizard)

      response.redirect(`/pds/${newPatient.uuid}/new/result`)
    } else {
      response.redirect(`/pds/new/search`)
    }
  },

  read(request, response, next, patient_uuid) {
    const { data } = request.session

    response.locals.patient = Patient.findOne(patient_uuid, data)

    next()
  },

  update(request, response) {
    const { patient_uuid } = request.params
    const { data } = request.session
    const { __ } = response.locals

    // Update session data
    let patient = Patient.update(
      patient_uuid,
      data.wizard.patients[patient_uuid],
      data.wizard
    )

    patient = Patient.create(patient, data)

    // Clean up session data
    delete data.hasNhsNumber
    delete data.nhs
    delete data.school_id
    delete data.patient
    delete data.wizard

    request.flash('success', __(`pds.new.success`, { patient }))

    response.redirect(patient.uri)
  },

  readAll(request, response, next) {
    const { q } = request.query
    const { data } = request.session

    // TODO: Seed patient’s with details from search results form
    const patients = [
      new Patient(generateChild(), data),
      new Patient(generateChild(), data),
      new Patient(generateChild(), data),
      new Patient(generateChild(), data),
      new Patient(generateChild(), data)
    ]

    // Sort
    let results = _.sortBy(patients, 'lastName')

    // Query
    if (q) {
      results = results.filter((patient) =>
        patient.tokenized.includes(String(q).toLowerCase())
      )
    }

    // Results
    response.locals.patients = patients
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)

    // Clean up session data
    delete data.q

    next()
  },

  readForm(request, response, next) {
    const { patient_uuid } = request.params
    const { data, referrer } = request.session

    // Setup wizard if not already setup
    let patient = Patient.findOne(patient_uuid, data.wizard)
    if (!patient) {
      patient = Patient.create(response.locals.patient, data.wizard)
    }
    response.locals.patient = new Patient(patient, data)

    const journey = {
      ['/']: {},
      ['/new/start']: {
        [`/${patient_uuid}/new/result`]: {
          data: 'hasNhsNumber',
          value: 'true'
        },
        ['/new/search']: {
          data: 'hasNhsNumber',
          value: 'false'
        }
      },
      ['/new/search']: {},
      ['/new/results']: {},
      [`/${patient_uuid}/new/result`]: {
        [`/${patient_uuid}/new/school`]: {
          data: 'add',
          value: 'true'
        },
        ['/new/search']: {
          data: 'add',
          value: 'false'
        }
      },
      [`/${patient_uuid}/new/school`]: {}
    }

    response.locals.paths = {
      ...wizard(journey, request),
      ...(referrer && { back: referrer })
    }

    next()
  },

  showForm(request, response) {
    let { view } = request.params

    response.render(`pds/form/${view}`)
  },

  updateForm(request, response, next) {
    const { patient_uuid } = request.params
    const { data } = request.session
    const { paths } = response.locals

    if (request.body.school_id && !request.body.patient?.school_id) {
      request.body.patient = {
        school_id: request.body.school_id
      }
    }

    Patient.update(patient_uuid, request.body.patient, data.wizard)

    return paths?.next ? response.redirect(paths.next) : next()
  }
}
