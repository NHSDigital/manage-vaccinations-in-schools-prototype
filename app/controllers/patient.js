import _ from 'lodash'

import {
  ArchiveRecordReason,
  AuditEventType,
  PatientStatus,
  ProgrammeType,
  SessionPresetName,
  SessionType,
  VaccinationOutcome
} from '../enums.js'
import {
  PatientProgramme,
  Patient,
  Programme,
  Vaccination,
  PatientSession,
  Session
} from '../models.js'
import { today } from '../utils/date.js'
import { getResults, getPagination } from '../utils/pagination.js'
import { formatYearGroup } from '../utils/string.js'

export const patientController = {
  read(request, response, next, patient_uuid) {
    const { data } = request.session
    const { __ } = response.locals

    const currentPath = request.baseUrl + request.path

    const patient = Patient.findOne(patient_uuid, data)

    const recordTitle = patient.post16
      ? __('patient.label').replace('Child', 'Patient')
      : __('patient.label')

    response.locals.patient = patient

    response.locals.recordTitle = recordTitle

    response.locals.secondaryNavigationItems = [
      {
        text: recordTitle,
        href: patient.uri,
        current: currentPath === patient.uri
      },
      ...Object.values(patient.programmes).map((patientProgramme) => {
        return {
          text: patientProgramme.programme.name,
          href: patientProgramme.uri,
          current: currentPath === patientProgramme.uri
        }
      })
    ]

    response.locals.archiveRecordReasonItems = Object.values(
      ArchiveRecordReason
    )
      .filter((value) => value !== ArchiveRecordReason.Deceased)
      .map((value) => ({
        text: value,
        value
      }))

    next()
  },

  readAll(request, response, next) {
    const { invitedToClinic, option, programme_id, q, yearGroup } =
      request.query
    const { data } = request.session

    const programmes = Programme.findAll(data)
      .filter((programme) => !programme.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))

    const patients = Patient.findAll(data)

    // Sort
    let results = _.sortBy(patients, 'lastName')

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
      const ids = programme_ids || programmes.map((programme) => programme.id)

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
        const ids = programme_ids || programmes.map((programme) => programme.id)
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
    response.locals.patients = patients
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)

    // Programme filter options
    response.locals.programmeItems = programmes.map((programme) => ({
      text: programme.name,
      value: programme.id,
      checked: programme_ids?.includes(programme.id) ?? false
    }))

    // Year group filter options
    response.locals.yearGroupItems = [...Array(12).keys()].map((yearGroup) => ({
      text: formatYearGroup(yearGroup),
      value: yearGroup,
      checked: yearGroups?.includes(yearGroup) ?? false
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

  show(request, response) {
    const view = request.params.view || 'show'

    response.render(`patient/${view}`)
  },

  list(request, response) {
    response.render('patient/list')
  },

  filterList(request, response) {
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

    response.redirect(`/patients?${params}`)
  },

  edit(request, response) {
    const { patient_uuid } = request.params
    const { data, referrer } = request.session

    // Setup wizard if not already setup
    let patient = Patient.findOne(patient_uuid, data.wizard)
    if (!patient) {
      patient = Patient.create(response.locals.patient, data.wizard)
    }

    response.locals.patient = new Patient(patient, data)

    // Show back link to referring page, else patient page
    response.locals.back = referrer || patient.uri

    response.render('patient/edit')
  },

  update(request, response) {
    const { patient_uuid } = request.params
    const { data, referrer } = request.session
    const { __ } = response.locals

    // Update session data
    const patient = Patient.update(
      patient_uuid,
      data.wizard.patients[patient_uuid],
      data
    )

    // Clean up session data
    delete data.patient
    delete data.wizard

    request.flash('success', __('patient.edit.success'))

    response.redirect(referrer || patient.uri)
  },

  readForm(request, response, next) {
    const { patient_uuid } = request.params
    const { data } = request.session
    let { patient } = response.locals

    // Setup wizard if not already setup
    if (!Patient.findOne(patient_uuid, data.wizard)) {
      patient = Patient.create(patient, data.wizard)
    }

    response.locals.patient = new Patient(patient, data)

    response.locals.paths = {
      back: `${patient.uri}/edit`,
      next: `${patient.uri}/edit`
    }

    next()
  },

  showForm(request, response) {
    let { view } = request.params

    // Parent forms share same view
    if (view.includes('parent')) {
      response.locals.parentId = view.split('-')[1]
      view = 'parent'
    }

    response.render(`patient/form/${view}`)
  },

  updateForm(request, response) {
    const { patient_uuid } = request.params
    const { data } = request.session
    const { paths } = response.locals

    Patient.update(patient_uuid, request.body.patient, data.wizard)

    response.redirect(paths.next)
  },

  readProgramme(request, response, next) {
    const { programme_id } = request.params
    const { data } = request.session
    const { patient } = response.locals

    if (!programme_id) {
      return response.redirect(patient.uri)
    }

    response.locals.patientProgramme = new PatientProgramme(
      patient.programmes[programme_id],
      data
    )

    next()
  },

  showProgramme(request, response) {
    response.render(`patient/programme`)
  },

  archive(request, response) {
    const { account } = request.app.locals
    const { patient_uuid } = request.params
    const { data } = request.session
    const { __ } = response.locals

    const patient = Patient.archive(
      patient_uuid,
      {
        createdBy_uid: account.uid,
        ...request.body.patient
      },
      data
    )

    request.flash('success', __(`patient.archive.success`))

    response.redirect(patient.uri)
  },

  note(request, response) {
    const { account } = request.app.locals
    const { note } = request.body
    const { data } = request.session
    const { __, patient } = response.locals

    patient.saveNote({
      name: AuditEventType.RecordNote,
      note,
      createdBy_uid: account.uid
    })

    // Clean up session data
    delete data.note

    request.flash('success', __(`patient.notes.new.success`, { patient }))

    response.redirect(patient.uri)
  },

  record(request, response) {
    const { account } = request.app.locals
    const { programme_id } = request.params
    const { data } = request.session
    const { patient } = response.locals

    const session = Session.create(
      {
        createdBy_uid: account.uid,
        date: today(),
        type: SessionType.Clinic,
        presetNames: SessionPresetName.Flu,
        clinic_id: 'X99999'
      },
      data
    )

    const createdPatientSession = PatientSession.create(
      {
        createdBy_uid: account.uid,
        patient_uuid: patient.uuid,
        programme_id,
        session_id: session.id
      },
      data
    )

    const patientSession = PatientSession.findOne(
      createdPatientSession.uuid,
      data
    )

    response.redirect(patientSession.uri)
  },

  vaccination(type) {
    return (request, response) => {
      const { account } = request.app.locals
      const { programme_id } = request.params
      const { data } = request.session
      const { patient } = response.locals

      const patientProgramme = new PatientProgramme(
        patient.programmes[programme_id],
        data
      )

      // Vaccination
      const vaccination = Vaccination.create(
        {
          outcome: VaccinationOutcome.AlreadyVaccinated,
          patient_uuid: patient.uuid,
          reportedBy_uid: account.uid,
          ...(type === 'new' && { programme_id })
        },
        data.wizard
      )

      let startPage = 'created-at'
      if (!vaccination.programme_id) {
        startPage = 'programme'
      } else if (patientProgramme.programme.type === ProgrammeType.MMR) {
        startPage = 'variant'
      }

      response.redirect(
        `${patientProgramme.programme.uri}/vaccinations/${vaccination.uuid}/new/${startPage}?referrer=${patientProgramme.uri}`
      )
    }
  }
}
