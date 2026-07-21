import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import { PatientStatus } from '../enums.js'
import { Patient, Programme, School } from '../models.js'
import { generateNewSiteCode } from '../utils/location.js'
import { getResults, getPagination } from '../utils/pagination.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { formatYearGroup, stringToArray } from '../utils/string.js'
import { getFilterParams } from '../utils/url.js'

export const schoolController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, school_id) {
    const { data } = request.session

    const school = School.findOne(school_id, data)
    response.locals.school = school

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    response.locals.schools = School.findAll(request.session.data)

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`school/${view}`)
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  new(type) {
    return (request, response) => {
      const { data } = request.session
      const { account } = response.locals

      // @ts-ignore
      const school = School.create({ team_id: account.team?.id }, data.wizard)

      if (type === 'site') {
        data.startPath = 'new-site'
        saveAndRedirect(request, response, `${school.uri}/new/site-urn`)
      } else {
        saveAndRedirect(request, response, `${school.uri}/new/urn`)
      }
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>, Record<string, unknown>, Record<string, unknown>, SchoolFilterQuery>}
   */
  list(request, response) {
    const { option, phase, programme_id, q } = request.query
    const { data } = request.session
    const { schools } = response.locals

    const programmes = Programme.findAll(data)
      ?.filter((programme) => !programme.isHidden)
      .sort((a, b) => a.name.localeCompare(b.name))

    let results = schools

    // Query
    if (q) {
      results = results.filter((school) =>
        school.tokenized.includes(String(q).toLowerCase())
      )
    }

    // Convert programme IDs into an array of IDs
    let programme_ids
    if (programme_id) {
      programme_ids = Array.isArray(programme_id)
        ? programme_id
        : [programme_id]
    }

    // Filter by phase
    if (phase && phase !== 'none') {
      results = results.filter((school) => school.phase === phase)
    }

    // Filter closed schools (but show open schools by default)
    if (option === 'isClosed') {
      results = results.filter(
        (school) => !school.isHomeOrUnknown && school.isClosed
      )
    } else {
      results = results.filter((school) => school.isOpen)
    }

    // Filter by unplanned programme
    if (programme_id) {
      results = results.filter((school) => {
        const unplannedProgramme_ids = school.unplannedProgrammes.map(
          (programme) => programme.id
        )

        return (
          !school.isHomeOrUnknown &&
          programme_ids.every((programme_id) =>
            unplannedProgramme_ids.includes(programme_id)
          )
        )
      })
    }

    // Sort
    results = results.sort((a, b) => a.name.localeCompare(b.name))

    // Results
    response.locals.results = getResults(results, request.query, 40)
    response.locals.pages = getPagination(results, request.query, 40)

    // Programme filter options
    response.locals.unplannedProgrammeItems = programmes.map((programme) => ({
      text: programme.name,
      value: programme.id,
      checked: programme_id === programme.id
    }))

    // Clean up session data
    delete data.option
    delete data.q
    delete data.phase
    delete data.programme_id

    return response.render('school/list')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  filterList(request, response) {
    const params = getFilterParams(
      request,
      ['phase', 'q'],
      ['option', 'programme_id']
    )

    return saveAndRedirect(request, response, `/schools?${params}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>, Record<string, unknown>, Record<string, unknown>, PatientFilterQuery>}
   */
  readPatients(request, response, next) {
    const { option, programme_id, q, yearGroup } = request.query
    const { data } = request.session
    const { school } = response.locals

    // Sort
    let results = _.sortBy(school.patients, 'lastName')

    // Query
    if (q) {
      results = results.filter((patient) =>
        patient.tokenized.includes(String(q).toLowerCase())
      )
    }

    // Convert year groups query into an array of numbers
    let yearGroups
    if (yearGroup) {
      yearGroups = Array.isArray(yearGroup) ? yearGroup : [yearGroup]
      yearGroups = yearGroups.map((year) => Number(year))
    }

    // Convert programme IDs into an array of IDs
    let programme_ids
    if (programme_id) {
      programme_ids = Array.isArray(programme_id)
        ? programme_id
        : [programme_id]
    }

    // Filter defaults
    const filters = {
      status: request.query.status || 'none',
      clinicStatus: request.query.clinicStatus || 'none',
      patientConsent: request.query.patientConsent || 'none',
      patientDeferred: request.query.patientDeferred || 'none',
      patientIneligible: request.query.patientIneligible || 'none',
      patientRefused: request.query.patientRefused || 'none',
      patientTriage: request.query.patientTriage || 'none',
      patientVaccinated: request.query.patientVaccinated || 'none',
      vaccineCriteria: request.query.vaccineCriteria || 'none'
    }

    // Filter by programme eligibility (if programme(s) selected)
    if (programme_id && filters.status !== PatientStatus.Ineligible) {
      results = results.filter((patient) =>
        programme_ids.some(
          (programme_id) =>
            patient.programmes[programme_id].status !== PatientStatus.Ineligible
        )
      )
    }

    // Filter by programme clinic status
    if (filters.clinicStatus && filters.clinicStatus !== 'none') {
      if (programme_id) {
        results = results.filter((patient) =>
          programme_ids.some(
            (programme_id) =>
              patient.programmes[programme_id]?.clinicStatus ===
              filters.clinicStatus
          )
        )
      } else {
        results = results.filter((patient) =>
          Object.values(patient.programmes).some(
            (programme) => programme.clinicStatus === filters.clinicStatus
          )
        )
      }
    }

    // Filter by status
    if (filters.status && filters.status !== 'none') {
      const ids =
        programme_ids || school.programmes.map((programme) => programme.id)

      results = results.filter((patient) =>
        ids.some((id) => patient.programmes[id].status === filters.status)
      )
    }

    // Filter by sub-status(es) (from last patient session)
    for (const [patientStatus, status] of Object.entries({
      [PatientStatus.Consent]: 'patientConsent',
      [PatientStatus.Deferred]: 'patientDeferred',
      [PatientStatus.Due]: 'vaccineCriteria',
      [PatientStatus.Refused]: 'patientRefused',
      [PatientStatus.Triage]: 'patientTriage',
      [PatientStatus.Vaccinated]: 'patientVaccinated'
    })) {
      if (filters.status === patientStatus && filters[status] !== 'none') {
        const ids =
          programme_ids || school.programmes.map((programme) => programme.id)
        let statuses = filters[status]
        statuses = Array.isArray(statuses) ? statuses : [statuses]
        results = results.filter((patient) =>
          ids.some((id) => statuses.includes(patient.programmes[id][status]))
        )
      }
    }

    // Filter by ineligible sub-status (from patient programme)
    if (
      filters.status === PatientStatus.Ineligible &&
      filters.patientIneligible !== 'none'
    ) {
      const ids =
        programme_ids || school.programmes.map((programme) => programme.id)
      results = results.filter((patient) =>
        ids.some(
          (id) =>
            patient.programmes[id].ineligibilityStatus ===
            filters.patientIneligible
        )
      )
    }

    // Filter by year group
    if (yearGroup) {
      results = results.filter((patient) =>
        yearGroups.includes(patient.yearGroup)
      )
    }

    // Filter by display option
    for (const key of [
      'hasAdjustment',
      'hasImpairment',
      'hasMissingNhsNumber',
      'isArchived'
    ]) {
      if (option && String(option).includes(key)) {
        results = results.filter((patient) => patient[key])
      }
    }

    // Toggle initial view
    response.locals.initial =
      Object.keys(request.query).filter((key) => key !== 'referrer').length ===
      0

    // Results
    response.locals.school = school
    response.locals.patients = school.patients
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)

    // Programme filter options
    response.locals.programmeItems = school.programmes.map((programme) => ({
      text: programme.name,
      value: programme.id,
      checked: programme_ids?.includes(programme.id) ?? false
    }))

    // Year group filter options
    response.locals.yearGroupItems = school.yearGroups.map((yearGroup) => ({
      text: formatYearGroup(yearGroup),
      value: yearGroup
    }))

    // Clean up session data
    delete data.clinicStatus
    delete data.option
    delete data.patientConsent
    delete data.patientDeferred
    delete data.patientIneligible
    delete data.patientRefused
    delete data.patientTriage
    delete data.patientVaccinated
    delete data.programme_id
    delete data.q
    delete data.status
    delete data.vaccineCriteria
    delete data.yearGroup

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  filterPatients(request, response) {
    const { school } = response.locals

    const params = getFilterParams(
      request,
      ['clinicStatus', 'q', 'status'],
      [
        'option',
        'patientConsent',
        'patientDeferred',
        'patientIneligible',
        'patientRefused',
        'patientTriage',
        'patientVaccinated',
        'programme_id',
        'vaccineCriteria',
        'yearGroup'
      ]
    )

    return saveAndRedirect(request, response, `${school.uri}?${params}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readSessions(request, response) {
    const { school } = response.locals

    response.locals.sessions = school.sessions

    return response.render('school/sessions')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  edit(request, response) {
    const { school_id } = request.params
    const { data } = request.session

    // Setup wizard if not already setup
    let school = School.findOne(school_id, data.wizard)
    if (!school) {
      school = School.create(response.locals.school, data.wizard)
    }

    response.locals.school = new School(school, data)

    // Show back link to session page
    response.locals.back = school.uri

    return response.render('school/edit')
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(type) {
    return (request, response) => {
      const { school_id } = request.params
      const { data } = request.session
      const { __ } = response.locals

      // Update session data
      const school = School.update(
        school_id,
        data.wizard.schools[school_id],
        data
      )

      // Clean up session data
      delete data.school
      delete data.wizard

      // TODO: Add note about site codes if adding a new site
      request.flash('success', __(`school.${type}.success`, { school }))

      saveAndRedirect(request, response, `${school.team.uri}/schools`)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { school_id } = request.params
      const { data, referrer } = request.session

      // Setup wizard if not already setup
      let school = School.findOne(school_id, data.wizard)
      if (!school) {
        school = School.create(response.locals.school, data.wizard)
      }

      response.locals.school = new School(school, data)

      const originalSchool = School.findOne(school.urn, data)

      response.locals.originalSchool = originalSchool

      response.locals.type = type

      const journey = {
        [`/`]: {},
        ...(data.startPath === 'new-site'
          ? { [`/${school_id}/${type}/site-urn`]: {} }
          : { [`/${school_id}/${type}/urn`]: {} }),
        ...(data.startPath === 'new-site'
          ? { [`/${school_id}/${type}/site`]: {} }
          : { [`/${school_id}/${type}/confirm-school`]: {} }),
        [`/${school_id}/${type}/phase`]: {},
        [`/${school_id}/${type}/sen`]: {},
        [`/${school_id}/${type}/year-groups`]: {},
        [`/${school_id}/${type}/programmes`]: {},
        [`/${school_id}/${type}/check-answers`]: {},
        [`/${school_id}`]: {}
      }

      response.locals.paths = {
        ...wizard(journey, request),
        ...(type === 'edit' && {
          back: `${school.uri}/edit`,
          next: `${school.uri}/edit`
        }),
        ...(referrer && { back: referrer })
      }

      response.locals.yearGroupItems = [...Array(14).keys()].map(
        (yearGroup) => ({
          text: formatYearGroup(yearGroup),
          value: yearGroup
        })
      )

      next()
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { view } = request.params

    return response.render(`school/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { school_id, view } = request.params
    const { data } = request.session
    const { paths, originalSchool } = response.locals

    if (view === 'urn') {
      request.body.school = {
        urn: request.body.school.urn || '131442',
        name: 'Southfields Primary School',
        addressLine1: 'East Street',
        addressLevel1: 'Coventry',
        postalCode: 'CV1 5LS',
        phase: 'Primary',
        isSen: false,
        yearGroups: [0, 1, 2, 3, 4, 5, 6]
      }
    }

    if (view === 'site-urn') {
      const id = request.body.school.id || '131442'
      const originalSchool = School.findOne(id, data)

      response.locals.originalSchool = originalSchool

      request.body.school = {
        urn: originalSchool.urn,
        site: generateNewSiteCode(originalSchool.site),
        addressLine1: originalSchool.addressLine1,
        addressLine2: originalSchool.addressLine2,
        addressLevel31: originalSchool.addressLevel1,
        postalCode: originalSchool.postalCode
      }
    }

    // Add `A` to original school, if it doesn’t have a site code already
    if (view === 'site-codes') {
      if (!originalSchool.code) {
        School.update(originalSchool.id, { site: 'A' }, data)
      }
    }

    School.update(school_id, request.body.school, data.wizard)

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      response.render('school/action', { type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  delete(request, response) {
    const { school_id } = request.params
    const { data } = request.session
    const { __, school } = response.locals

    const referrer = `${school.team.uri}/schools`

    School.delete(school_id, data)

    request.flash('success', __(`school.delete.success`))

    return saveAndRedirect(request, response, referrer)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  inviteToClinic(request, response) {
    const { school_id } = request.params
    const { data } = request.session
    const { __mf } = response.locals

    const school = School.findOne(school_id, data)

    // Find patients to invite to clinic
    const patient_uuids = school.patients.map((patient) => patient.uuid)

    // Invite contacts to book into a clinic
    const clinicProgramme_ids = stringToArray(request.body.clinicProgramme_ids)

    for (const patient_uuid of patient_uuids) {
      const patient = Patient.findOne(patient_uuid, data)
      patient.inviteToClinic(clinicProgramme_ids)
      Patient.update(patient_uuid, patient, data)
    }

    request.flash(
      'success',
      __mf(`school.inviteToClinic.success`, {
        count: patient_uuids.length
      })
    )

    return saveAndRedirect(request, response, school.uri)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 * @import { PatientFilterQuery, SchoolFilterQuery } from '../../typings/index.d.ts'
 */
