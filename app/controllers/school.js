import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import { PatientStatus } from '../enums.js'
import { Patient, School } from '../models.js'
import { generateNewSiteCode } from '../utils/location.js'
import { getResults, getPagination } from '../utils/pagination.js'
import { formatYearGroup } from '../utils/string.js'

export const schoolController = {
  read(request, response, next, school_id) {
    const { data } = request.session

    const school = School.findOne(school_id, data)
    response.locals.school = school

    next()
  },

  readAll(request, response, next) {
    // Combine children with no known school with home-schooled children)
    response.locals.schools = School.findAll(request.session.data).filter(
      (school) => school.id !== '888888'
    )

    next()
  },

  show(request, response) {
    const view = request.params.view || 'show'

    response.render(`school/${view}`)
  },

  new(type) {
    return (request, response, next) => {
      const { data } = request.session

      // @ts-ignore
      const school = School.create({ team_id: data.team?.id }, data.wizard)

      if (type === 'site') {
        data.startPath = 'new-site'
        response.redirect(`${school.uri}/new/site-urn`)
      } else {
        response.redirect(`${school.uri}/new/urn`)
      }
    }
  },

  list(request, response) {
    const { phase, q } = request.query
    const { data } = request.session
    const { schools } = response.locals

    let results = schools

    // Query
    if (q) {
      results = results.filter((school) =>
        school.tokenized.includes(String(q).toLowerCase())
      )
    }

    // Filter by phase
    if (phase) {
      results = results.filter((school) => school.phase === phase)
    }

    // Sort
    results = results.sort((a, b) => a.name.localeCompare(b.name))

    // Results
    response.locals.results = getResults(results, request.query, 40)
    response.locals.pages = getPagination(results, request.query, 40)

    // Clean up session data
    delete data.q
    delete data.phase

    response.render('school/list')
  },

  filterList(request, response) {
    const params = new URLSearchParams()

    // Radios and text inputs
    for (const key of ['phase', 'q']) {
      const value = request.body[key]
      if (value) {
        params.append(key, String(value))
      }
    }

    response.redirect(`/schools?${params}`)
  },

  readPatients(request, response, next) {
    const { invitedToClinic, option, programme_id, q, yearGroup } =
      request.query
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
      report: request.query.report || 'none',
      patientConsent: request.query.patientConsent || 'none',
      patientDeferred: request.query.patientDeferred || 'none',
      patientRefused: request.query.patientRefused || 'none',
      patientVaccinated: request.query.patientVaccinated || 'none',
      vaccineCriteria: request.query.vaccineCriteria || 'none'
    }

    // Filter by programme eligibility (if programme(s) selected)
    if (programme_id && filters.report !== PatientStatus.Ineligible) {
      results = results.filter((patient) =>
        programme_ids.some(
          (programme_id) =>
            patient.programmes[programme_id].status !== PatientStatus.Ineligible
        )
      )
    }

    // Filter by programme clinic invitations
    if (programme_id && invitedToClinic === 'true') {
      results = results.filter(
        (patient) => patient.programmes[programme_id]?.invitedToClinic
      )
    } else if (invitedToClinic === 'true') {
      results = results.filter((patient) =>
        Object.values(patient.programmes).some(
          (programme) => programme.invitedToClinic
        )
      )
    }

    // Filter by status
    if (filters.report && filters.report !== 'none') {
      const ids =
        programme_ids || school.programmes.map((programme) => programme.id)

      results = results.filter((patient) =>
        ids.some((id) => patient.programmes[id].status === filters.report)
      )
    }

    // Filter by sub-status(es)
    for (const [patientStatus, status] of Object.entries({
      [PatientStatus.Consent]: 'patientConsent',
      [PatientStatus.Deferred]: 'patientDeferred',
      [PatientStatus.Due]: 'vaccineCriteria',
      [PatientStatus.Refused]: 'patientRefused',
      [PatientStatus.Vaccinated]: 'patientVaccinated'
    })) {
      if (filters.report === patientStatus && filters[status] !== 'none') {
        const ids =
          programme_ids || school.programmes.map((programme) => programme.id)
        let statuses = filters[status]
        statuses = Array.isArray(statuses) ? statuses : [statuses]
        results = results.filter((patient) =>
          ids.some((id) =>
            statuses.includes(
              patient.programmes[id].lastPatientSession?.[status]
            )
          )
        )
      }
    }

    // Filter by year group
    if (yearGroup) {
      results = results.filter((patient) =>
        yearGroups.includes(patient.yearGroup)
      )
    }

    // Filter by display option
    for (const key of [
      'archived',
      'hasImpairment',
      'hasAdjustment',
      'hasMissingNhsNumber',
      'post16'
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
    delete data.invitedToClinic
    delete data.option
    delete data.patientConsent
    delete data.patientDeferred
    delete data.patientRefused
    delete data.patientVaccinated
    delete data.programme_id
    delete data.q
    delete data.report
    delete data.vaccineCriteria
    delete data.yearGroup

    next()
  },

  filterPatients(request, response) {
    const { school } = response.locals

    const params = new URLSearchParams()

    // Radios and text inputs
    for (const key of ['q', 'report']) {
      const value = request.body[key]
      if (value) {
        params.append(key, String(value))
      }
    }

    // Checkboxes
    for (const key of [
      'invitedToClinic',
      'option',
      'patientConsent',
      'patientDeferred',
      'patientRefused',
      'patientVaccinated',
      'programme_id',
      'vaccineCriteria',
      'yearGroup'
    ]) {
      const value = request.body[key]
      const values = Array.isArray(value) ? value : [value]
      if (value) {
        values
          .filter((item) => item !== '_unchecked')
          .forEach((value) => {
            params.append(key, String(value))
          })
      }
    }

    response.redirect(`${school.uri}?${params}`)
  },

  readSessions(request, response) {
    const { school } = response.locals

    response.locals.sessions = school.sessions

    response.render('school/sessions')
  },

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

    response.render('school/edit')
  },

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

      response.redirect(`${school.team.uri}/schools`)
    }
  },

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

  showForm(request, response) {
    const { view } = request.params

    response.render(`school/form/${view}`)
  },

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
        sen: false,
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

    response.redirect(paths.next)
  },

  action(type) {
    return (request, response) => {
      response.render('school/action', { type })
    }
  },

  delete(request, response) {
    const { school_id } = request.params
    const { data } = request.session
    const { __, school } = response.locals

    const referrer = `${school.team.uri}/schools`

    School.delete(school_id, data)

    request.flash('success', __(`school.delete.success`))

    response.redirect(referrer)
  },

  inviteToClinic(request, response) {
    const { school_id } = request.params
    const { data } = request.session
    const { __mf } = response.locals

    const school = School.findOne(school_id, data)

    // Find patients to invite to clinic
    const patientSessionsForClinic = school.patients.map(
      (patient) => patient.uuid
    )

    // Invite parents to book into a clinic
    for (const patient of school.patients) {
      const clinicProgramme_ids = request.body.clinicProgramme_ids.filter(
        (item) => item !== '_unchecked'
      )

      Patient.update(patient.uuid, { clinicProgramme_ids }, data)
    }

    request.flash(
      'success',
      __mf(`school.inviteToClinic.success`, {
        count: patientSessionsForClinic.length
      })
    )

    response.redirect(school.uri)
  }
}
