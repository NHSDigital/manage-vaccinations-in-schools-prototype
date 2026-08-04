import _ from 'lodash'

import {
  ArchiveRecordReason,
  PatientClinicStatus,
  PatientStatus,
  SessionStatus,
  SessionType
} from '../enums.js'
import { Patient, Programme, Session, Team } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { formatYearGroup, stringToArray } from '../utils/string.js'
import { getFilterParams, formatQueryString } from '../utils/url.js'

export const patientController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, patient_uuid) {
    const { data } = request.session
    const { __, account } = response.locals

    const currentPath = request.baseUrl + request.path

    const patient = Patient.findOne(patient_uuid, data)

    const recordTitle =
      patient?.age >= 18
        ? __('patient.label').replace('Child', 'Patient')
        : __('patient.label')

    response.locals.patient = patient

    response.locals.recordTitle = recordTitle

    response.locals.sectionNavigationItems = [
      {
        text: __('patient.show.label'),
        href: patient.uri,
        current: currentPath === patient.uri
      },
      {
        text: __('patient.contacts.label'),
        href: `${patient.uri}/contacts`,
        current: currentPath === `${patient.uri}/contacts`
      },
      ...Object.values(patient.activeProgrammes).map((patientProgramme) => {
        if (!account.isSchoolUser) {
          return {
            text: patientProgramme.programme.name,
            href: patientProgramme.uri,
            current: currentPath === patientProgramme.uri
          }
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

  /**
   * @type {RequestHandler<Record<string, string>, Record<string, unknown>, Record<string, unknown>, PatientFilterQuery>}
   */
  readAll(request, response, next) {
    const { option, programme_id, q, yearGroup } = request.query
    const { data } = request.session
    const { account } = response.locals

    const team = Team.findOne(account.team_id, data)

    const programmes = Programme.findAll(data)
      .filter((programme) => !programme.isHidden)
      .sort((a, b) => a.name.localeCompare(b.name))

    const patients = Patient.findAll(data).filter((patient) =>
      team.schools.some((school) => patient.school_id === school.id)
    )

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
      consent: request.query.consent || 'none',
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
          (programme_id) => !patient.programmes[programme_id].isIneligible
        )
      )
    }

    // Filter by programme clinic status
    let showingClinicReady = false
    if (filters.clinicStatus && filters.clinicStatus !== 'none') {
      showingClinicReady = filters.clinicStatus === PatientClinicStatus.Ready
      // Patient must have the selected clinic status for any of the selected programmes (if
      // there's a selected programme), or for *any* programme if not
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

    // Filter by consent status (school teams only)
    if (filters.consent && filters.consent !== 'none') {
      const ids = programme_ids || programmes.map((programme) => programme.id)

      results = results.filter((patient) =>
        ids.some((id) => patient.programmes[id].consent === filters.consent)
      )
    }

    // Filter by status
    if (filters.status && filters.status !== 'none') {
      const ids = programme_ids || programmes.map((programme) => programme.id)

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
        const ids = programme_ids || programmes.map((programme) => programme.id)
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
      const ids = programme_ids || programmes.map((programme) => programme.id)
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
    response.locals.showingClinicReady = showingClinicReady
    if (showingClinicReady) {
      data.clinicPatient_ids = results.map(({ uuid }) => uuid)
    }
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)
    response.locals.query = request.query

    // Programme filter options
    response.locals.programmeItems = programmes.map((programme) => ({
      text: programme.name,
      value: programme.id,
      checked: programme_ids?.includes(programme.id) ?? false
    }))

    // Year group filter options
    response.locals.yearGroupItems = [...Array(14).keys()].map((yearGroup) => ({
      text: formatYearGroup(yearGroup),
      value: yearGroup,
      checked: yearGroups?.includes(yearGroup) ?? false
    }))

    // Clean up session data
    delete data.clinicStatus
    delete data.consent
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
  show(request, response) {
    const view = request.params.view || 'show'
    const { patient } = response.locals

    if (view === 'invite-to-clinic') {
      // Order the clinic-ready programmes alphabetically
      response.locals.clinicReadyProgrammes = Object.values(patient.programmes)
        .filter(
          ({ clinicStatus }) => clinicStatus === PatientClinicStatus.Ready
        )
        .sort((a, b) => a.programme_id.localeCompare(b.programme_id))

      // Warn about inviting to any programmes that don't have clinics scheduled
      const programmesWithoutClinics =
        response.locals.clinicReadyProgrammes.filter(
          (patientProgramme) => patientProgramme.scheduledClinicsCount === 0
        )
      const formatter = new Intl.ListFormat('en', {
        style: 'long',
        type: 'disjunction'
      })
      response.locals.clinicReadyProgrammesWithoutClinics = {
        count: programmesWithoutClinics.length,
        names: formatter.format(
          programmesWithoutClinics.map(({ programme }) =>
            programme.name.replace('Flu', 'flu')
          )
        )
      }
    }

    return response.render(`patient/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.render('patient/list')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  filterList(request, response) {
    const params = getFilterParams(
      request,
      ['clinicStatus', 'consent', 'q', 'status'],
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

    return saveAndRedirect(request, response, `/patients?${params}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
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

    return response.render('patient/edit')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { patient_uuid } = request.params
    const { data, referrer } = request.session
    const { __, account } = response.locals

    const patient = Patient.findOne(patient_uuid, data)

    // Update session data
    let updatedPatient = Patient.update(
      patient_uuid,
      {
        ...data.wizard.patients[patient_uuid],
        ...{ updatedBy_uid: account.uid }
      },
      data
    )

    // Restore context to updated patient
    updatedPatient = Patient.findOne(updatedPatient.uuid, data)

    // Update activity log
    updatedPatient.addAuditRecord(patient)

    // Clean up session data
    delete data.patient
    delete data.wizard

    request.flash('success', __('patient.edit.success'))

    return saveAndRedirect(request, response, referrer || updatedPatient.uri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readForm(request, response, next) {
    const { patient_uuid } = request.params
    const { data } = request.session
    let { patient } = response.locals

    // Setup wizard if not already setup
    if (!Patient.findOne(patient_uuid, data.wizard)) {
      patient = Patient.create(patient, data.wizard)
    }

    patient = new Patient(patient, data)

    response.locals.patient = patient

    response.locals.academicYearGroupItems = patient.school.yearGroups.map(
      (yearGroup) => ({
        text: formatYearGroup(yearGroup),
        value: yearGroup
      })
    )

    response.locals.paths = {
      back: `${patient.uri}/edit`,
      next: `${patient.uri}/edit`
    }

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    let { view } = request.params

    // Contact forms share same view
    if (view.includes('contact')) {
      response.locals.parentId = String(view).split('-')[1]
      view = 'contact'
    }

    return response.render(`patient/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { patient_uuid } = request.params
    const { data } = request.session
    const { paths } = response.locals

    Patient.update(patient_uuid, request.body.patient, data.wizard)

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  inviteOneToClinic(request, response) {
    const { patient_uuid } = request.params
    const { data, referrer } = request.session
    const { __ } = response.locals

    const clinicProgramme_ids = stringToArray(request.body.clinicProgramme_ids)

    // Send comms to contacts and record in audit trail
    const patient = Patient.findOne(patient_uuid, data)
    patient.inviteToClinic(clinicProgramme_ids)
    Patient.update(patient.uuid, patient, data)

    // Report the success
    const selectedProgrammeNames = programmeNamesListForSentence(
      clinicProgramme_ids,
      patient.canBeOfferedMmrv,
      ConjunctionType.and,
      data
    )

    request.flash(
      'success',
      __('patient.inviteToClinic.success', {
        patientName: patient.firstName,
        selectedProgrammes: selectedProgrammeNames
      })
    )

    return saveAndRedirect(request, response, referrer || patient.uri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showInviteManyToClinic(request, response) {
    const { programme_id } = /** @type {{ programme_id?: string }} */ (
      request.query
    )
    const { data } = request.session
    let clinicPatient_ids = stringToArray(data.clinicPatient_ids)

    const programmes = Programme.findAll(data)
      .filter((programme) => !programme.isHidden)
      .sort((a, b) => a.name.localeCompare(b.name))

    let programme_ids
    if (programme_id) {
      programme_ids = stringToArray(programme_id)
    } else {
      programme_ids = programmes.map(({ id }) => id)
    }
    const invitableProgrammes = programmes.filter((programme) =>
      programme_ids.includes(programme.id)
    )

    // Details required for the intro paragraph
    response.locals.cohortDetails = {
      childrenCount: clinicPatient_ids.length,
      specificProgrammes: !!programme_id,
      programmeCount: programme_ids.length,
      programmeNames: programmeNamesListForSentence(
        programme_ids,
        false,
        ConjunctionType.or,
        data
      )
    }

    // Details required for the programme checkboxes
    const clinicReadyProgrammes = []
    const scheduledSessions = Session.findAll(data)
      .filter(({ type }) => type === SessionType.Clinic)
      .filter(({ status }) => status === SessionStatus.Planned)
    for (const programme of invitableProgrammes) {
      const clinicReadyChildrenCount = clinicPatient_ids
        .map((id) => Patient.findOne(id, data))
        .filter(
          (patient) =>
            patient.programmes[programme.id].clinicStatus ===
            PatientClinicStatus.Ready
        ).length
      if (clinicReadyChildrenCount > 0) {
        const scheduledClinicsCount = scheduledSessions.filter((session) =>
          session.programme_ids.includes(programme.id)
        ).length

        clinicReadyProgrammes.push({
          name: programme.name,
          id: programme.id,
          childrenCount: clinicReadyChildrenCount,
          clinicCount: scheduledClinicsCount
        })
      }
    }
    response.locals.clinicReadyProgrammes = clinicReadyProgrammes

    // Summary information for a warning about programmes without clinics
    const programmesWithoutClinics = clinicReadyProgrammes.filter(
      ({ clinicCount }) => clinicCount === 0
    )
    response.locals.clinicReadyProgrammesWithoutClinics = {
      count: programmesWithoutClinics.length,
      names: programmeNamesListForSentence(
        programmesWithoutClinics.map(({ id }) => id),
        false,
        ConjunctionType.or,
        data
      )
    }

    return response.render('patient/bulk-invite-to-clinic')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  inviteManyToClinic(request, response) {
    const { data } = request.session
    const { __mf } = response.locals

    const clinicPatient_ids = stringToArray(data.clinicPatient_ids)
    const clinicProgramme_ids = stringToArray(request.body.clinicProgramme_ids)

    // Invite each of the children to clinic for the subset of the selected programmes
    // that make sense for that child
    let invitedChildrenCount = 0
    let notInvitedChildrenCount = 0
    for (const patient of clinicPatient_ids.map((id) =>
      Patient.findOne(id, data)
    )) {
      // Work out which of the selected programmes this patient was clinic-ready for
      const { clinicReadyProgramme_ids } = patient
      if (!patient.hasContactDetails) {
        notInvitedChildrenCount++
        continue
      }

      const invitedProgramme_ids = [
        ...new Set(clinicReadyProgramme_ids).intersection(
          new Set(clinicProgramme_ids)
        )
      ]

      if (invitedProgramme_ids.length) {
        // Send comms to contacts and record in audit trail
        patient.inviteToClinic(invitedProgramme_ids)
        Patient.update(patient.uuid, patient, data)

        invitedChildrenCount++
      }
    }

    // Report success (or otherwise)
    const details = [
      invitedChildrenCount > 0 &&
        __mf('patient.bulkInviteToClinic.success.invited', {
          count: invitedChildrenCount
        }),
      notInvitedChildrenCount > 0 &&
        __mf('patient.bulkInviteToClinic.success.notInvited', {
          count: notInvitedChildrenCount
        })
    ].filter(Boolean)
    const messageType = invitedChildrenCount > 0 ? 'success' : 'message'
    request.flash(messageType, details.join('<br>'))

    // Reset the cohort
    delete data.clinicPatient_ids

    // Get back to the filter page as we left it
    const filterUrl = `/patients${formatQueryString(request.query)}`
    return saveAndRedirect(request, response, filterUrl)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  archive(request, response) {
    const { patient_uuid } = request.params
    const { data } = request.session
    const { __, account } = response.locals

    const patient = Patient.archive(
      patient_uuid,
      {
        createdBy_uid: account.uid,
        ...request.body.patient
      },
      data
    )

    request.flash('success', __(`patient.archive.success`))

    return saveAndRedirect(request, response, patient.uri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  note(request, response) {
    const { note } = request.body
    const { data } = request.session
    const { __, account, patient } = response.locals

    patient.saveNote({
      note,
      createdBy_uid: account.uid
    })

    // Clean up session data
    delete data.note

    request.flash('success', __(`patient.notes.new.success`, { patient }))

    return saveAndRedirect(request, response, patient.uri)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 * @import { PatientFilterQuery } from '../../typings/index.d.ts'
 */
