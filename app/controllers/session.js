import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import {
  AcademicYear,
  InstructionOutcome,
  PatientStatus,
  ProgrammeType,
  RecordVaccineCriteria,
  RegistrationOutcome,
  SchoolPhase,
  SessionPresetName,
  SessionStatus,
  SessionType,
  VaccineMethod
} from '../enums.js'
import {
  Clinic,
  DefaultBatch,
  Instruction,
  PatientSession,
  Patient,
  Programme,
  School,
  Session,
  Team
} from '../models.js'
import { getClinicInviteUrlForProgrammes } from '../utils/clinic-booking.js'
import {
  convertIsoDateToObject,
  getDateValueDifference,
  getExtendableAppointmentTimes,
  today
} from '../utils/date.js'
import { getResults, getPagination } from '../utils/pagination.js'
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
import { getSessionYearGroups } from '../utils/session.js'
import { formatTime, formatYearGroup, stringToArray } from '../utils/string.js'

export const sessionController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, session_id) {
    const { view } = request.params
    const { data } = request.session
    const { __ } = response.locals

    const session = Session.findOne(session_id, data)
    response.locals.session = session

    response.locals.defaultBatches = DefaultBatch.findAll(data).filter(
      (defaultBatch) => defaultBatch.session_id === session_id
    )

    if (session && !session.isUnplanned) {
      response.locals.navigationItems = [
        {
          text: __('session.show.label'),
          href: session.uri,
          ...(session.consents.length && { icon: 'alert' }),
          current: view === undefined
        },
        ...(session.type === SessionType.Clinic
          ? [
              {
                text: __('session.appointments.label'),
                href: `${session.uri}/appointments`,
                current: view === 'appointments'
              }
            ]
          : []),
        {
          text: __('session.report.label'),
          href: `${session.uri}/report`,
          current: view === 'report'
        },
        ...(session.psdProtocol
          ? [
              {
                text: __('session.instruct.label'),
                href: `${session.uri}/instruct`,
                current: view === 'instruct'
              }
            ]
          : []),
        {
          text: __('session.record.label'),
          href: `${session.uri}/record`,
          current: view === 'record'
        }
      ]
    }

    next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readAll(request, response, next) {
    const sessions = Session.findAll(request.session.data)
    const scheduledClinics = sessions.filter(
      (session) =>
        session.type === SessionType.Clinic &&
        session.status === SessionStatus.Planned
    )
    response.locals.sessions = sessions
    response.locals.clinicsAreScheduled = scheduledClinics.length > 0

    return next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    let { view } = request.params

    if (['instruct', 'record', 'report'].includes(String(view))) {
      view = 'activity'
    } else if (!view) {
      view = 'show'
    }

    return response.render(`session/${view}`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  new(request, response) {
    const { account } = request.app.locals
    const { data } = request.session

    const session = Session.create(
      {
        // TODO: This needs contextual team data to work
        registration: data.team.sessionRegistration,
        createdBy_uid: account.uid
      },
      data.wizard
    )

    return response.redirect(`${session.uri}/new/type`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  advertise(request, response) {
    // Handling a GET for /sessions/advertise
    const { data } = request.session
    const { __mf } = response.locals

    // Any refresh will reset stuff
    delete data.clinicAdvert

    // Set up the programme radio buttons
    const sessions = Session.findAll(data)
    const scheduledClinics = sessions.filter(
      (session) =>
        session.type === SessionType.Clinic &&
        session.status === SessionStatus.Planned
    )
    const scheduledProgrammes = scheduledClinics.flatMap(
      ({ programme_ids }) => programme_ids
    )
    const programmeFrequencyMap = _.countBy(scheduledProgrammes)

    // Offer even those programmes with no clinics scheduled
    const allProgrammes = Programme.findAll(data).filter(
      (programme) => !programme.hidden
    )
    allProgrammes.forEach((programme) => {
      if (!programmeFrequencyMap[programme.id]) {
        programmeFrequencyMap[programme.id] = 0
      }
    })

    response.locals.programmeItems = Object.entries(programmeFrequencyMap)
      .map(([programme_id, count]) => ({
        text: Programme.findOne(programme_id, data)?.name,
        value: programme_id,
        hint: {
          text: __mf('session.advertise.programmes.programme.hint', { count })
        }
      }))
      .sort((a, b) => a.text.localeCompare(b.text))

    return response.render('session/advert-programmes')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  updateAdvertLink(request, response) {
    // Handling a POST for /sessions/advertise
    const { clinicAdvert } = request.session.data
    const { data } = request.session

    clinicAdvert.selected_programme_ids = stringToArray(
      clinicAdvert.selected_programme_ids
    )

    clinicAdvert.link = `https://www.manage-vaccinations-in-schools.nhs.uk${getClinicInviteUrlForProgrammes(clinicAdvert.selected_programme_ids)}`
    clinicAdvert.programmeNames = programmeNamesListForSentence(
      clinicAdvert.selected_programme_ids,
      ConjunctionType.and,
      data
    )

    return response.redirect('/sessions/advert-link')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  showAdvertLink(request, response) {
    // Handling a GET for /sessions/advert-link

    return response.render('session/advert-link')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  copyAdvertLink(request, response) {
    // Handling a POST for /sessions/advert-link
    const { data } = request.session

    // Tidy up
    delete data.clinicAdvert

    return response.redirect('/sessions')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  list(request, response) {
    const { programme_id, q } = request.query
    const { data } = request.session
    const { sessions } = response.locals
    const { currentAcademicYear, isRollover } = response.app.locals

    let results = sessions

    // Query
    if (q) {
      results = results.filter((session) =>
        session.tokenized.includes(String(q).toLowerCase())
      )
    }

    // Convert programme IDs into an array of IDs
    let programme_ids
    if (programme_id) {
      programme_ids = Array.isArray(programme_id)
        ? programme_id
        : [programme_id]
    }

    // Filter by programme
    if (programme_id) {
      results = results.filter((session) =>
        session.programme_ids.some((id) => programme_ids.includes(id))
      )
    }

    // Filter defaults
    const filters = {
      academicYear: request.query?.academicYear || currentAcademicYear,
      status: request.query?.status || 'none',
      type: request.query?.type || 'none'
    }

    // Filter by academic year
    results = results.filter(
      ({ academicYear }) => academicYear === Number(filters.academicYear)
    )

    // Filter by status
    if (filters.status !== 'none') {
      results = results.filter(({ status }) => status === filters.status)
    }

    // Filter by type
    if (filters.type !== 'none') {
      results = results.filter(({ type }) => type === filters.type)
    }

    // Sort
    results = results.sort((a, b) => getDateValueDifference(a.date, b.date))

    // Results
    response.locals.results = getResults(results, request.query, 40)
    response.locals.pages = getPagination(results, request.query, 40)

    // Academic year options
    response.locals.academicYearItems =
      isRollover &&
      Object.entries(AcademicYear)
        .slice(-2)
        .map(([value, text]) => ({
          text,
          value,
          checked: filters.academicYear === value
        }))

    const programmesMap = new Map()
    sessions
      .filter((session) => session.academicYear === filters.academicYear)
      .flatMap((session) => session.programmes || [])
      .forEach((programme) => {
        programmesMap.set(programme.id, programme)
      })

    const programmes = [...programmesMap.values()]

    // Programme filter options
    if (programmes.length > 1) {
      response.locals.programmeItems = programmes
        .map((programme) => ({
          text: programme.name,
          value: programme.id,
          checked: programme_ids?.includes(programme.id) ?? false
        }))
        .sort((a, b) => a.text.localeCompare(b.text))
    }

    // Clean up session data
    delete data.q
    delete data.academicYear
    delete data.programme_id
    delete data.status
    delete data.type

    return response.render('session/list', { sessions })
  },

  /**
   * @type {import("express").RequestHandler}
   */
  filter(request, response) {
    const params = new URLSearchParams()

    // Radios and text inputs
    for (const key of ['academicYear', 'q', 'status', 'type']) {
      const value = request.body[key]
      if (value) {
        params.append(key, String(value))
      }
    }

    // Checkboxes
    for (const key of ['programme_id']) {
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

    return response.redirect(`/sessions?${params}`)
  },

  readPatientSessions(request, response, next) {
    const { account } = request.app.locals
    const { view } = request.params
    const { option, q, programme_id, yearGroup } = request.query
    const { data } = request.session
    const { session } = response.locals

    const showRegistration =
      session.registration && session.isActive && view === 'report'

    response.locals.showRegistration = showRegistration
    response.locals.view = view

    let results = session.patientSessions

    // Upgrade permissions according to session delegation settings
    if (session.nationalProtocol) {
      account.vaccineMethods.push(VaccineMethod.Injection)
    }

    // Query
    if (q) {
      results = results.filter(({ patient }) =>
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

    // Filter by programme
    if (programme_id) {
      results = results.filter((patientSession) =>
        programme_ids.includes(patientSession.programme_id)
      )
    }

    // Filter defaults
    const filters = {
      instruct: request.query.instruct || 'none',
      register: request.query.register || 'none',
      report: request.query.report || 'none',
      clinicStatus: request.query.clinicStatus || 'none',
      patientConsent: request.query.patientConsent || 'none',
      patientDeferred: request.query.patientDeferred || 'none',
      patientRefused: request.query.patientRefused || 'none',
      patientTriage: request.query.patientTriage || 'none',
      patientVaccinated: request.query.patientVaccinated || 'none',
      vaccineCriteria: request.query.vaccineCriteria || 'none'
    }

    for (const key of Object.keys(filters)) {
      if (filters[key] !== 'none') {
        const keys = Array.isArray(filters[key]) ? filters[key] : [filters[key]]
        results = results.filter((patientSession) =>
          keys.includes(patientSession[key])
        )
      }
    }

    // Filter by sub-status(es)
    for (const [programmeOutcome, status] of Object.entries({
      [PatientStatus.Consent]: 'patientConsent',
      [PatientStatus.Deferred]: 'patientDeferred',
      [PatientStatus.Due]: 'vaccineCriteria',
      [PatientStatus.Refused]: 'patientRefused',
      [PatientStatus.Triage]: 'patientTriage',
      [PatientStatus.Vaccinated]: 'patientVaccinated'
    })) {
      if (filters.report === programmeOutcome && filters[status] !== 'none') {
        let statuses = filters[status]
        statuses = Array.isArray(statuses) ? statuses : [statuses]
        results = results.filter((patientSession) =>
          statuses.includes(patientSession[status])
        )
      }
    }

    // Filter by year group
    if (yearGroup) {
      results = results.filter(({ patient }) =>
        yearGroups.includes(patient.yearGroup)
      )
    }

    // Filter patient by display option
    for (const key of [
      'agedOutOfProgrammes',
      'archived',
      'hasImpairment',
      'hasAdjustment',
      'hasMissingNhsNumber'
    ]) {
      if (option?.includes(key)) {
        results = results.filter(({ patient }) => patient[key])
      }
    }

    // Remove patient sessions where outcome returns false
    results = results.filter((patientSession) => patientSession[view] !== false)

    // Only show patients ready to vaccinate, and that a user can vaccinate
    if (view === 'record') {
      results = results.filter(
        ({ register, report, vaccine }) =>
          report === PatientStatus.Due &&
          register !== RegistrationOutcome.Pending &&
          account.vaccineMethods?.includes(vaccine?.method)
      )
    }

    // Sort
    results =
      session.type === SessionType.Clinic && view === 'record'
        ? _.sortBy(results, 'clinicAppointment.startAt')
        : _.sortBy(results, 'patient.lastName')

    // Ensure MenACWY is the patient session linked to from session activity
    results = results.sort((a, b) =>
      a.programme.name.localeCompare(b.programme.name)
    )

    // Show only one patient session per patient
    results = _.uniqBy(results, 'patient.nhsn')

    // Results
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)

    // Programme filter options
    if (session.programmes.length > 1) {
      response.locals.programmeItems = session.programmes.map((programme) => ({
        text: programme.name,
        value: programme.id,
        checked: programme_ids?.includes(programme.id) ?? false
      }))
    }

    // Checkbox filter options (select one)
    let vaccineCriteria
    const programmeTypes = session.programmes.map((programme) => programme.type)
    if (programmeTypes.includes(ProgrammeType.Flu)) {
      vaccineCriteria = Object.values(RecordVaccineCriteria).filter(
        (outcome) =>
          ![
            RecordVaccineCriteria.NoMMRPreference,
            RecordVaccineCriteria.AlternativeMMRInjectionOnly
          ].includes(outcome)
      )
    } else if (programmeTypes.includes(ProgrammeType.MMR)) {
      vaccineCriteria = Object.values(RecordVaccineCriteria).filter((outcome) =>
        [
          RecordVaccineCriteria.NoMMRPreference,
          RecordVaccineCriteria.AlternativeMMRInjectionOnly
        ].includes(outcome)
      )
    }

    const checkboxFilters = {
      record: {
        vaccineCriteria: session.offersAlternativeVaccine && vaccineCriteria
      }
    }

    const radioFilters = {
      report: {
        register: showRegistration && RegistrationOutcome,
        instruct: session.psdProtocol && InstructionOutcome
      },
      instruct: {
        instruct: InstructionOutcome
      }
    }

    response.locals.checkboxFilters = checkboxFilters[view]
    response.locals.radioFilters = radioFilters[view]

    if (session.school) {
      response.locals.yearGroupItems = session.yearGroups.map((yearGroup) => ({
        text: formatYearGroup(yearGroup),
        value: yearGroup,
        checked: yearGroups?.includes(yearGroup) || false
      }))
    }

    // Clean up session data
    delete data.option
    delete data.patientConsent
    delete data.patientDeferred
    delete data.patientRefused
    delete data.patientTriage
    delete data.patientVaccinated
    delete data.programme_id
    delete data.q
    delete data.instruct
    delete data.register
    delete data.report
    delete data.vaccineCriteria
    delete data.yearGroup

    next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  filterPatientSessions(request, response) {
    const { session_id, view } = request.params
    const params = new URLSearchParams()

    // Radios
    for (const key of ['q', 'clinicStatus', 'instruct', 'register', 'report']) {
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
      'patientTriage',
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

    return response.redirect(`/sessions/${session_id}/${view}?${params}`)
  },

  showAppointments(request, response, next) {
    const { session } = response.locals
    const allAppointments = session.appointments

    // Figure out which of the current appointments can be extended
    const bookedSlotTimes = session.bookedAppointmentTimes
    const availableSlotTimes = session.availableAppointmentTimes
    const extendableAppointmentTimes = getExtendableAppointmentTimes(
      availableSlotTimes,
      bookedSlotTimes,
      session.appointmentLength
    )

    // Feed the view all of the information (incl. headers) it needs to present in the day view
    const vaccinationPeriodTables = []
    for (const vaccinationPeriod of session.vaccinationPeriods) {
      const allSlotTimes = [
        ...new Set(
          vaccinationPeriod
            .allAppointmentTimes(session.appointmentLength)
            .map((time) => time.getTime())
        )
      ].map((time) => new Date(time))

      const headers = [
        'Time',
        ...Array(vaccinationPeriod.vaccinatorCount)
          .keys()
          .map((index) => `Vaccinator ${index + 1}`)
      ]

      const rows = allSlotTimes.map((time) => {
        const rowValues = []
        rowValues.push({
          header: headers[0],
          timeSlot: formatTime(time, false)
        })
        rowValues.push(
          ...allAppointments
            .filter((appointment) => appointment.coversSlot(time))
            .map((appointment, index) => ({
              header: headers[index + rowValues.length],
              appointment,
              canExtend: extendableAppointmentTimes.some(
                (extendableTime) =>
                  extendableTime.getTime() === appointment.startAt.getTime()
              )
            }))
        )
        rowValues.push(
          ...Array(vaccinationPeriod.vaccinatorCount - rowValues.length + 1)
            .keys()
            .map((index) => ({
              header: headers[index + rowValues.length],
              appointment: null,
              canExtend: false
            }))
        )

        return { time, rowValues }
      })

      vaccinationPeriodTables.push({
        vaccinationPeriod,
        periodNumber: vaccinationPeriodTables.length + 1,
        headers,
        rows
      })
    }

    response.locals.vaccinationPeriodTables = vaccinationPeriodTables

    next()
  },

  /**
   * @type {import("express").RequestHandler}
   */
  edit(request, response) {
    const { session_id } = request.params
    const { data } = request.session

    // Copy the saved session to the wizard context, if not already there
    let session = Session.findOne(session_id, data.wizard)
    if (!session) {
      // NB: response.locals.session was read from the global context in read()
      session = Session.create(response.locals.session, data.wizard)
    }

    // Set up the transaction metadata that controls how some clinic values are entered
    if (session.type === SessionType.Clinic) {
      const vaccinatorCounts = new Set(
        session.vaccinationPeriods.map((period) => period.vaccinatorCount)
      )
      const variableVaccinatorCounts = vaccinatorCounts.size > 1
      data.transaction = {
        hasVariableVaccinatorCounts: variableVaccinatorCounts ? 'true' : 'false'
      }
      if (!variableVaccinatorCounts) {
        data.transaction.consistentVaccinatorCount = vaccinatorCounts
          .values()
          .next()
          .value.toString()
      }
    }

    // Give access to the data needed for the summaryRows
    response.locals.session = new Session(session, data)

    // Show back link to session page
    response.locals.back = session.uri

    return response.render('session/edit')
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
   */
  update(type) {
    return (request, response) => {
      const { session_id } = request.params
      const { data } = request.session
      const { __ } = response.locals

      // Update session data
      const session = Session.update(
        session_id,
        data.wizard.sessions[String(session_id)],
        data
      )

      // Clean up session data
      delete data.vaccinationPeriods
      delete data.transaction
      delete data.session
      delete data.wizard

      request.flash('success', __(`session.${type}.success`, { session }))

      response.redirect(session.uri)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { session_id, view } = request.params
      const { data, referrer } = request.session
      let { team } = response.locals

      team = Team.findOne(team?.id || '001', data)

      // Force saving of the session type before we fork based on it; avoid race condition
      if (view === 'type' && request.method === 'POST') {
        request.session.save(() => {})
      }

      // Setup wizard if not already setup
      let session = Session.findOne(session_id, data.wizard)
      if (!session) {
        session = Session.create(response.locals.session, data.wizard)
      }
      response.locals.session = new Session(session, data)

      const journey = {
        [`/`]: {},
        [`/${session_id}/${type}/type`]: {},
        [`/${session_id}/${type}/programmes`]: {},
        ...(session.type === SessionType.School
          ? {
              [`/${session_id}/${type}/school`]: {},
              [`/${session_id}/${type}/year-groups`]: {},
              [`/${session_id}/${type}/date`]: {}
            }
          : {
              [`/${session_id}/${type}/clinic`]: {},
              [`/${session_id}/${type}/date`]: {},
              [`/${session_id}/${type}/vaccination-periods`]: {},
              [`/${session_id}/${type}/vaccinators`]: {},
              [`/${session_id}/${type}/appointment-length`]: {}
            }),
        //[`/${session_id}/${type}/date-check`]: {},
        ...(session.presetNames?.includes(SessionPresetName.MMR) &&
        session.type === SessionType.School
          ? {
              [`/${session_id}/${type}/mmr-consent`]: {}
            }
          : {}),
        [`/${session_id}/${type}/check-answers`]: {},
        [`/${session_id}`]: {}
      }

      response.locals.paths = {
        ...wizard(journey, request),
        ...(type === 'edit' && {
          back: `${session.uri}/edit`,
          next: `${session.uri}/edit`
        }),
        ...(referrer && { back: referrer })
      }

      response.locals.type = type

      // Some questions are not asked during journey (you can only access them from
      // the check-answers page), so they need an explicit next path
      response.locals.paths.next =
        response.locals.paths.next || `${session.uri}/new/check-answers`

      // Set up different methods for clinic selection, based on number of clinics
      if (session.type === SessionType.Clinic) {
        const usableNumberOfRadios = 16
        if (team.clinics.length <= usableNumberOfRadios) {
          response.locals.clinicRadios = Object.values(team.clinics)
            .map((clinic) => new Clinic(clinic))
            .map((clinic) => ({
              text: clinic.name,
              value: clinic.id,
              ...(clinic.address && {
                attributes: {
                  'data-hint': clinic.formatted.address
                },
                hint: {
                  text: clinic.formatted.address
                }
              })
            }))
        } else {
          response.locals.clinics = Clinic.findAll(data)
        }
      }

      if (session.type === SessionType.School) {
        const schools = School.findAll(data)

        response.locals.schools = schools

        // Only show primary schools if session is administering flu or MMR
        if (
          ![SessionPresetName.Flu, SessionPresetName.MMR].some((presetName) =>
            session.presetNames?.includes(presetName)
          )
        ) {
          response.locals.schools = schools.filter(
            (school) => school.phase === SchoolPhase.Secondary
          )
        }
      }

      if (session.school_id) {
        response.locals.yearGroupItems = getSessionYearGroups(
          session.school_id,
          session.presets
        ).map((year) => ({
          text: formatYearGroup(year),
          value: year
        }))
      }

      next()
    }
  },

  /**
   * @type {import("express").RequestHandler}
   */
  showForm(request, response) {
    const { view } = request.params

    return response.render(`session/form/${view}`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  updateForm(request, response) {
    const { session_id, view } = request.params
    const { data } = request.session
    const { paths } = response.locals

    // Update values in the session model
    let session = Session.findOne(session_id, data.wizard)
    if (request.body.session) {
      session = Session.update(session_id, request.body.session, data.wizard)
    }

    if (session.type === SessionType.Clinic) {
      // Add the first vaccination period, if not already there
      if (!session.vaccinationPeriods?.length) {
        session.addVaccinationPeriod()
        Session.update(session_id, session, data.wizard)
      }

      // Act accordingly for each of the possible button clicks in the vaccination periods page
      if (view === 'vaccination-periods') {
        // Save the times entered, no matter what we're doing next
        for (let [period_uuid, vaccinationPeriodValues] of Object.entries(
          request.body.vaccinationPeriods
        )) {
          // Make sure the period start and end have date information as well as time
          const sessionDate_ = session.date
            ? session.date_
            : convertIsoDateToObject(today())
          const dateValues = {
            startAt_: { ...sessionDate_ },
            endAt_: { ...sessionDate_ }
          }
          vaccinationPeriodValues = _.merge(dateValues, vaccinationPeriodValues)

          const vaccinationPeriod = session.getVaccinationPeriod(period_uuid)
          vaccinationPeriod.startAt_ = vaccinationPeriodValues.startAt_
          vaccinationPeriod.endAt_ = vaccinationPeriodValues.endAt_

          Session.update(session_id, session, data.wizard)
        }

        // Add or remove vaccination periods, if requested
        const action = request.body.action
        if (action === 'add-period') {
          session.addVaccinationPeriod()
          Session.update(session_id, session, data.wizard)

          paths.next = request.originalUrl
        } else if (action.startsWith('remove-period-')) {
          // Remove a vaccination period
          const index = parseInt(action.substring('remove-period-'.length))
          const period_id = session.vaccinationPeriods[index].uuid
          session.removeVaccinationPeriod(period_id)
          Session.update(session_id, session, data.wizard)

          paths.next = request.originalUrl
        }
      } else if (view === 'vaccinators') {
        if (
          session?.vaccinationPeriods.length > 1 &&
          request.body.transaction.hasVariableVaccinatorCounts === 'false'
        ) {
          // Set the same number of vaccinators in all vaccination periods
          const vaccinatorCount = parseInt(
            request.body.transaction.consistentVaccinatorCount
          )
          for (const period of session.vaccinationPeriods) {
            period.vaccinatorCount = vaccinatorCount
          }
        } else {
          // Each vaccination period gets its own number of vaccinators
          for (const [period_uuid, vaccinationPeriodValues] of Object.entries(
            request.body.vaccinationPeriods
          )) {
            session.getVaccinationPeriod(period_uuid).vaccinatorCount =
              parseInt(vaccinationPeriodValues.vaccinatorCount)
          }
        }
        Session.update(session_id, session, data.wizard)
      }
    }

    return request.session.save((error) => {
      if (!error) response.redirect(paths.next)
    })
  },

  /**
   * @type {import("express").RequestHandler}
   */
  giveInstructions(request, response) {
    const { account } = request.app.locals
    const { __, session } = response.locals
    const { data } = request.session

    const patientsToInstruct = session.patientSessions
      .filter(({ report }) => report === PatientStatus.Due)
      .filter(({ instruct }) => instruct === InstructionOutcome.Needed)

    for (const patientSession of patientsToInstruct) {
      const instruction = Instruction.create(
        {
          createdBy_uid: account.uid,
          programme_id: patientSession.programme.id,
          patientSession_uuid: patientSession.uuid
        },
        data
      )

      patientSession.giveInstruction(instruction)

      PatientSession.update(patientSession.uuid, patientSession, data)
    }

    request.flash('success', __(`session.instructions.success`))

    return response.redirect(`${session.uri}/instruct`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  sendReminders(request, response) {
    const { __, session } = response.locals

    request.flash('success', __(`session.reminders.success`, { session }))

    return response.redirect(session.uri)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  cancelSession(request, response) {
    const { __, session } = response.locals

    request.flash('message', __('session.cancel.success', { session }))

    // TODO: there'll doubtless be other dependent records I need to delete too,
    //       or we may want to simply set a Cancelled status on the session instead
    Session.delete(session.id, request.session.data)

    return response.redirect('/sessions')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  makeActive(request, response) {
    const { __, session } = response.locals
    const { data } = request.session

    Session.update(session.id, { date: today() }, data)

    request.flash('success', __('session.makeActive.success'))

    return response.redirect(session.uri)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  inviteToClinic(request, response) {
    const { account } = request.app.locals
    const { session_id } = request.params
    const { data } = request.session
    const { __mf } = response.locals

    // Update session as closed
    const session = Session.update(session_id, { closed: true }, data)

    // Find a clinic
    const clinic = Session.findAll(data)
      .filter(({ type }) => type === SessionType.Clinic)
      .find(({ programme_ids }) =>
        programme_ids.some((id) => session.programme_ids.includes(id))
      )

    // Find patients to invite to clinic
    const patientSessionUuidsForClinic = session.patientSessionsForClinic.map(
      (patientSession) => patientSession.uuid
    )

    if (clinic) {
      // Move patients to clinic
      for (const patientSessionUuid of patientSessionUuidsForClinic) {
        const patientSession = PatientSession.findOne(patientSessionUuid, data)

        if (patientSession) {
          patientSession.removeFromSession({
            createdBy_uid: account.uid
          })
          let clinicPatientSession = PatientSession.create(
            {
              createdBy_uid: account.uid,
              patient_uuid: patientSession.patient_uuid,
              programme_id: patientSession.programme_id,
              session_id
            },
            data
          )
          clinicPatientSession = new PatientSession(clinicPatientSession, data)
          patientSession.patient.addToSession(clinicPatientSession)

          const patient = Patient.findOne(patientSession.patient_uuid, data)
          patient.inviteToClinic(clinic.programme_ids)
          Patient.update(patient.uuid, patient, data)
        }
      }
    }

    request.flash(
      'success',
      __mf(`session.inviteToClinic.success`, {
        count: patientSessionUuidsForClinic.length
      })
    )

    return response.redirect(session.uri)
  }
}
