import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import { generateChild } from '../generators/child.js'
import { Patient, PDSRecord } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const pdsRecordController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  redirect(request, response) {
    return response.redirect('/patients')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  start(request, response) {
    const { data } = request.session

    if (request.body.nhsn) {
      const child = generateChild()
      const pdsRecord = new PDSRecord({ ...child }, data)

      // Add entered NHS number
      pdsRecord.nhsn = request.body.nhsn.replaceAll(' ', '')

      // Add PDS record to wizard data
      PDSRecord.create(pdsRecord, data.wizard)

      return response.redirect(`/pds/${pdsRecord.uuid}/new/result`)
    }

    return response.redirect(`/pds/new/search`)
  },

  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, pdsRecord_uuid) {
    const { data } = request.session

    response.locals.pdsRecord = PDSRecord.findOne(pdsRecord_uuid, data)

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { pdsRecord_uuid } = request.params
    const { data } = request.session
    const { __ } = response.locals

    // Update session data
    const pdsRecord = PDSRecord.update(
      pdsRecord_uuid,
      data.wizard.pdsRecords[pdsRecord_uuid],
      data.wizard
    )

    // Create patient record
    let patient = new Patient(pdsRecord, data)
    patient = Patient.create(patient, data)

    // Clean up session data
    delete data.hasNhsNumber
    delete data.nhs
    delete data.school_id
    delete data.pdsRecord
    delete data.wizard

    request.flash('success', __(`pdsRecord.new.success`, { patient }))

    return response.redirect(patient.uri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    const { q } = request.query
    const { data } = request.session

    const pdsRecords = PDSRecord.findAll(data)

    // Sort
    let results = _.sortBy(pdsRecords, 'lastName')

    // Query
    if (q) {
      results = results.filter((pdsRecord) =>
        pdsRecord.tokenized.includes(String(q).toLowerCase())
      )
    }

    // Results
    response.locals.pdsRecords = pdsRecords
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)

    // Clean up session data
    delete data.q

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readForm(request, response, next) {
    const { pdsRecord_uuid } = request.params
    const { data, referrer } = request.session

    // Setup wizard if not already setup
    let pdsRecord = PDSRecord.findOne(pdsRecord_uuid, data.wizard)
    if (!pdsRecord) {
      pdsRecord = PDSRecord.create(response.locals.pdsRecord, data.wizard)
    }
    response.locals.pdsRecord = new PDSRecord(pdsRecord, data)

    const journey = {
      ['/']: {},
      ['/new/start']: {
        [`/${pdsRecord_uuid}/new/result`]: {
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
      [`/${pdsRecord_uuid}/new/result`]: {
        [`/${pdsRecord_uuid}/new/school`]: {
          data: 'add',
          value: 'true'
        },
        ['/new/search']: {
          data: 'add',
          value: 'false'
        }
      },
      [`/${pdsRecord_uuid}/new/school`]: {}
    }

    response.locals.paths = {
      ...wizard(journey, request),
      ...(referrer && { back: referrer })
    }

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    let { view } = request.params

    return response.render(`pds/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response, next) {
    const { pdsRecord_uuid } = request.params
    const { data } = request.session
    const { paths } = response.locals

    if (request.body.school_id && !request.body.pdsRecord?.school_id) {
      request.body.pdsRecord = {
        school_id: request.body.school_id
      }
    }

    PDSRecord.update(pdsRecord_uuid, request.body.pdsRecord, data.wizard)

    return paths?.next ? response.redirect(paths.next) : next()
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
