import _ from 'lodash'

import {
  ArchiveRecordReason,
  PatientClinicStatus,
  PatientStatus,
  ProgrammeType,
  SessionPresetName,
  SessionStatus,
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
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
import { queryToQueryString } from '../utils/querystring.js'
import { formatYearGroup, stringToArray } from '../utils/string.js'

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
    const { option, programme_id, q, yearGroup } = request.query
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
      clinicStatus: request.query.clinicStatus || 'none',
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
    response.locals.yearGroupItems = [...Array(12).keys()].map((yearGroup) => ({
      text: formatYearGroup(yearGroup),
      value: yearGroup,
      checked: yearGroups?.includes(yearGroup) ?? false
    }))

    // Clean up session data
    delete data.clinicStatus
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
    const { patient } = response.locals
    const view = request.params.view || 'show'

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
          (patientProgramme) => patientProgramme.scheduledClinicCount === 0
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

    response.render(`patient/${view}`)
  },

  list(request, response) {
    response.render('patient/list')
  },

  filterList(request, response) {
    const params = new URLSearchParams()

    // Radios and text inputs
    for (const key of ['q', 'report', 'clinicStatus']) {
      const value = request.body[key]
      if (value) {
        params.append(key, String(value))
      }
    }

    // Checkboxes
    for (const key of [
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
      data,
      true
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

  inviteOneToClinic(request, response) {
    const { patient_uuid } = request.params
    const { data } = request.session
    const { __ } = response.locals

    // Strip any _unchecked value from the selected programme IDs
    let { clinicProgramme_ids } = request.body
    if (typeof clinicProgramme_ids === 'string') {
      clinicProgramme_ids = [clinicProgramme_ids]
    } else {
      clinicProgramme_ids = stringToArray(clinicProgramme_ids)
    }

    // Send comms to parents and record in audit trail
    const patient = Patient.findOne(patient_uuid, data)
    patient.inviteToClinic(clinicProgramme_ids)
    Patient.update(patient.uuid, patient, data)

    // Report the success
    const selectedProgrammeNames = programmeNamesListForSentence(
      clinicProgramme_ids,
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

    response.redirect(patient.uri)
  },

  showInviteManyToClinic(request, response) {
    const { __, __mf } = response.locals
    const { data } = request.session
    const { clinicPatient_ids } = data
    const { programme_id } = request.query

    const programmes = Programme.findAll(data)
      .filter((programme) => !programme.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))

    let programme_ids
    if (programme_id) {
      programme_ids = Array.isArray(programme_id)
        ? programme_id
        : [programme_id]
    } else {
      programme_ids = programmes.map(({ id }) => id)
    }

    // e.g. 271 children can be invited to clinic for HPV, MenACWY, or Td/IPV programmes.
    const childrenFragment = __mf(
      'patient.bulkInviteToClinic.childrenFragment',
      { count: clinicPatient_ids.length }
    )
    const programmesFragment = programme_id
      ? __mf('patient.bulkInviteToClinic.programmesFragment', {
          count: programme_ids.length,
          programmeNames: programmeNamesListForSentence(
            programme_ids,
            ConjunctionType.or,
            data
          )
        })
      : __('patient.bulkInviteToClinic.anyProgrammesFragment')
    response.locals.cohortSummary = __(
      'patient.bulkInviteToClinic.cohortSummary',
      { children: childrenFragment, programmes: programmesFragment }
    )

    // Create the programme checkboxes and their patient and clinic counts
    const checkboxItems = []
    const scheduledSessions = Session.findAll(data)
      .filter(({ type }) => type === SessionType.Clinic)
      .filter(({ status }) => status === SessionStatus.Planned)
    const invitableProgrammes = programmes.filter((programme) =>
      programme_ids.includes(programme.id)
    )
    for (const programme of invitableProgrammes) {
      const clinicReadyChildrenCount = clinicPatient_ids
        .map((id) => Patient.findOne(id, data))
        .filter(
          (patient) =>
            patient.programmes[programme.id].clinicStatus ===
            PatientClinicStatus.Ready
        ).length
      if (clinicReadyChildrenCount > 0) {
        const scheduledClinicCount = scheduledSessions.filter((session) =>
          session.programme_ids.includes(programme.id)
        ).length

        const childrenHint = __mf(
          'patient.bulkInviteToClinic.programme.hint.children',
          {
            count: clinicReadyChildrenCount,
            programmeName: programme.name
          }
        )
        const clinicsHint = __mf(
          'patient.bulkInviteToClinic.programme.hint.clinics',
          {
            count: scheduledClinicCount,
            programmeName: programme.name
          }
        )
        checkboxItems.push({
          text: programme.name,
          value: programme.id,
          hint: {
            html: __('patient.bulkInviteToClinic.programme.hint.combined', {
              childrenHint,
              clinicsHint
            })
          }
        })
      }
    }

    response.locals.checkboxItems = checkboxItems

    response.render('patient/bulk-invite-to-clinic')
  },

  inviteManyToClinic(request, response) {
    let { clinicProgramme_ids } = request.body
    const { __mf } = response.locals
    const { data } = request.session
    const { clinicPatient_ids } = data

    // Tidy up any _unchecked values
    if (typeof clinicProgramme_ids === 'string') {
      clinicProgramme_ids = [clinicProgramme_ids]
    } else {
      clinicProgramme_ids = stringToArray(clinicProgramme_ids)
    }

    // Invite each of the children to clinic for the subset of the selected programmes
    // that make sense for that child
    let invitedChildrenCount = 0
    for (const patient of clinicPatient_ids.map((id) =>
      Patient.findOne(id, data)
    )) {
      // Work out which of the selected programmes this patient was clinic-ready for
      const { clinicReadyProgramme_ids } = patient
      const invitedProgramme_ids = [
        ...new Set(clinicReadyProgramme_ids).intersection(
          new Set(clinicProgramme_ids)
        )
      ]

      if (invitedProgramme_ids.length) {
        // Send comms to parents and record in audit trail
        patient.inviteToClinic(invitedProgramme_ids)
        Patient.update(patient.uuid, patient, data)

        invitedChildrenCount++
      }
    }

    request.flash(
      'success',
      __mf('patient.bulkInviteToClinic.success', {
        count: invitedChildrenCount
      })
    )

    // Reset the cohort
    delete data.clinicPatient_ids

    // Get back to the filter page as we left it
    response.redirect(`/patients${queryToQueryString(request.query)}`)
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

    let presetNames
    switch (programme_id) {
      case 'flu':
        presetNames = SessionPresetName.Flu
        break
      case 'hpv':
        presetNames = SessionPresetName.HPV
        break
      case 'menacwy':
      case 'td-ipv':
        presetNames = SessionPresetName.Doubles
        break
      case 'mmr':
        presetNames = SessionPresetName.MMR
        break
      default:
    }

    const session = Session.create(
      {
        createdBy_uid: account.uid,
        date: today(),
        type: SessionType.Clinic,
        presetNames,
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

    patient.addToSession(createdPatientSession)

    Patient.update(patient.uuid, { clinicProgramme_ids: [programme_id] }, data)

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
