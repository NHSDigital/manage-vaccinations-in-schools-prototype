import wizard from '@x-govuk/govuk-prototype-wizard'
import _ from 'lodash'

import {
  AcademicYear,
  InstructionStatus,
  PatientStatus,
  ProgrammeType,
  RecordVaccineCriteria,
  RegistrationStatus,
  SchoolPhase,
  SessionPresetName,
  SessionStatus,
  SessionType
} from '../enums.js'
import {
  Clinic,
  ClinicBooking,
  DefaultBatch,
  PatientSession,
  Patient,
  Programme,
  School,
  Session,
  Team
} from '../models.js'
import { getAccountVaccineMethods } from '../utils/account.js'
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
import { saveAndRedirect } from '../utils/redirect.js'
import { getSessionYearGroups } from '../utils/session.js'
import {
  formatTime,
  formatYearGroup,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'
import { getFilterParams } from '../utils/url.js'

export const sessionController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, session_id) {
    const { view } = request.params
    const { data } = request.session
    const { __, account } = response.locals

    const session = Session.findOne(session_id, data)
    response.locals.session = session

    response.locals.defaultBatches = DefaultBatch.findAll(data).filter(
      (defaultBatch) => defaultBatch.session_id === session_id
    )

    if (session && !session.isUnplanned && !account.isSchoolUser) {
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
          text: __('session.patients.label'),
          href: `${session.uri}/patients`,
          current: view === 'patients'
        },
        ...(session.hasPsdProtocol
          ? [
              {
                text: __('session.instructions.label'),
                href: `${session.uri}/instructions`,
                current: view === 'instructions'
              }
            ]
          : []),
        ...(session.isActive
          ? [
              {
                text: __('session.record.label'),
                href: `${session.uri}/record`,
                current: view === 'record'
              }
            ]
          : [])
      ]
    }

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    const { data } = request.session
    const { account } = response.locals

    const team = Team.findOne(account.team_id, data)

    const sessions = Session.findAll(data).filter(
      (session) =>
        team.schools.some((school) => session.school_id === school.id) ||
        team.clinics.some((clinic) => session.clinic_id === clinic.id)
    )

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
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    let { view } = request.params

    if (['instructions', 'patients', 'record'].includes(String(view))) {
      view = 'patients'
    } else if (!view) {
      view = 'show'
    }

    return response.render(`session/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { data } = request.session
    const { account } = response.locals

    const session = Session.create(
      {
        createdBy_uid: account.uid
      },
      data.wizard
    )

    return saveAndRedirect(request, response, `${session.uri}/new/type`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
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
      (programme) => !programme.isHidden
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
        hint: __mf('session.advertise.programmes.programme.hint', { count })
      }))
      .sort((a, b) => a.text.localeCompare(b.text))

    response.locals.back = '/sessions'

    return response.render('session/advert-programmes')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
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
      false,
      ConjunctionType.and,
      data
    )

    return saveAndRedirect(request, response, '/sessions/advert-link')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showAdvertLink(request, response) {
    // Handling a GET for /sessions/advert-link
    response.locals.back = '/sessions/advertise'

    return response.render('session/advert-link')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  copyAdvertLink(request, response) {
    // Handling a POST for /sessions/advert-link
    const { data } = request.session

    // Tidy up
    delete data.clinicAdvert

    return saveAndRedirect(request, response, '/sessions')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
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
   * @type {RequestHandler<Record<string, string>>}
   */
  filter(request, response) {
    const params = getFilterParams(
      request,
      ['academicYear', 'q', 'status', 'type'],
      ['programme_id']
    )

    return saveAndRedirect(request, response, `/sessions?${params}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>, Record<string, unknown>, Record<string, unknown>, PatientFilterQuery>}
   */
  readPatientSessions(request, response, next) {
    const { view } = request.params
    const { canBeOfferedCatchUps, option, q, programme_id, yearGroup } =
      request.query
    const { data } = request.session
    const { account, session } = response.locals

    const showRegistration =
      session.hasRegistration && session.isActive && view === 'patients'

    response.locals.showRegistration = showRegistration
    response.locals.view = view

    let results = session.patientSessions

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
      register: request.query.register || 'none',
      status: request.query.status || 'none',
      clinicStatus: request.query.clinicStatus || 'none',
      instructionStatus: request.query.instructionStatus || 'none',
      patientConsent: request.query.patientConsent || 'none',
      patientDeferred: request.query.patientDeferred || 'none',
      patientIneligible: request.query.patientIneligible || 'none',
      patientRefused: request.query.patientRefused || 'none',
      patientTriage: request.query.patientTriage || 'none',
      patientVaccinated: request.query.patientVaccinated || 'none',
      vaccineCriteria: request.query.vaccineCriteria || 'none'
    }

    for (const key of Object.keys(filters)) {
      if (filters[key] !== 'none') {
        const keys = Array.isArray(filters[key]) ? filters[key] : [filters[key]]
        results = results.filter((patientSession) =>
          keys.includes(patientSession.patientProgramme[key])
        )
      }
    }

    // Filter by sub-status(es)
    for (const [programmeStatus, status] of Object.entries({
      [PatientStatus.Consent]: 'patientConsent',
      [PatientStatus.Deferred]: 'patientDeferred',
      [PatientStatus.Due]: 'vaccineCriteria',
      [PatientStatus.Refused]: 'patientRefused',
      [PatientStatus.Triage]: 'patientTriage',
      [PatientStatus.Vaccinated]: 'patientVaccinated'
    })) {
      if (filters.status === programmeStatus && filters[status] !== 'none') {
        let statuses = filters[status]
        statuses = Array.isArray(statuses) ? statuses : [statuses]
        results = results.filter((patientSession) =>
          statuses.includes(patientSession.patientProgramme[status])
        )
      }
    }

    // Filter by ineligible sub-status (from patient programme)
    if (
      filters.status === PatientStatus.Ineligible &&
      filters.patientIneligible !== 'none'
    ) {
      const ids =
        programme_ids || session.programmes.map((programme) => programme.id)
      results = results.filter((patientSession) =>
        ids.some(
          (id) =>
            patientSession.patient.programmes[id].ineligibilityStatus ===
            filters.patientIneligible
        )
      )
    }

    // Filter by year group
    if (yearGroup) {
      results = results.filter(({ patient }) =>
        yearGroups.includes(patient.yearGroup)
      )
    }

    // Filter patient by display option
    for (const key of [
      'hasAdjustment',
      'hasImpairment',
      'hasMissingNhsNumber',
      'isArchived'
    ]) {
      if (option?.includes(key)) {
        results = results.filter(({ patient }) => patient[key])
      }
    }

    // Remove patients that don't have any additional catch-up vaccinations they can be offered
    if (canBeOfferedCatchUps) {
      results = results.filter(
        ({ canBeOfferedCatchUps }) => canBeOfferedCatchUps
      )
    }

    // Remove patient sessions where outcome returns false
    results = results.filter((patientSession) => patientSession[view] !== false)

    // Only show patients ready to vaccinate, and that a user can vaccinate
    if (view === 'record') {
      results = results.filter(
        (patientSession) =>
          patientSession.canRecordSessionOutcome &&
          getAccountVaccineMethods(account, patientSession)
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
        (criteria) =>
          ![
            RecordVaccineCriteria.NoMMRPreference,
            RecordVaccineCriteria.AlternativeMMRInjectionOnly
          ].includes(criteria)
      )
    } else if (programmeTypes.includes(ProgrammeType.MMR)) {
      vaccineCriteria = Object.values(RecordVaccineCriteria).filter(
        (criteria) =>
          [
            RecordVaccineCriteria.NoMMRPreference,
            RecordVaccineCriteria.AlternativeMMRInjectionOnly
          ].includes(criteria)
      )
    }

    const checkboxFilters = {
      record: {
        vaccineCriteria: session.canOfferAlternativeVaccine && vaccineCriteria
      }
    }

    const radioFilters = {
      patients: {
        register: showRegistration && RegistrationStatus,
        instructionStatus: session.hasPsdProtocol && InstructionStatus
      },
      instructions: {
        instructionStatus: InstructionStatus
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
    delete data.instructionStatus
    delete data.patientConsent
    delete data.patientDeferred
    delete data.patientIneligible
    delete data.patientRefused
    delete data.patientTriage
    delete data.patientVaccinated
    delete data.programme_id
    delete data.q
    delete data.register
    delete data.status
    delete data.vaccineCriteria
    delete data.yearGroup

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  filterPatientSessions(request, response) {
    const { session_id, view } = request.params

    const params = getFilterParams(
      request,
      ['clinicStatus', 'instructionStatus', 'q', 'register', 'status'],
      [
        'canBeOfferedCatchUps',
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

    return saveAndRedirect(
      request,
      response,
      `/sessions/${session_id}/${view}?${params}`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showAppointments(request, response, next) {
    const { session } = response.locals
    const allAppointments = session.appointments

    // Figure out which of the current appointments can be extended
    const bookedSlotTimes = session.bookedAppointmentTimes
    const availableSlotTimes = session.availableAppointmentTimes
    const extendableAppointmentTimes = getExtendableAppointmentTimes(
      availableSlotTimes,
      bookedSlotTimes,
      session.slotLength
    )

    // Feed the view all of the information (incl. headers) it needs to present in the day view
    const vaccinationPeriodTables = []
    for (const vaccinationPeriod of session.vaccinationPeriods) {
      const allSlotTimes = [
        ...new Set(
          vaccinationPeriod
            .allSlotStartTimes(session.slotLength)
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
          timeSlot: formatTime(time, false)
        })
        rowValues.push(
          ...allAppointments
            .filter((appointment) => appointment.coversSlot(time))
            .map((appointment) => ({
              appointment,
              spaceToExtend: extendableAppointmentTimes.some(
                (extendableTime) =>
                  extendableTime.getTime() === appointment.startAt.getTime()
              )
            }))
        )
        rowValues.push(
          ...Array(vaccinationPeriod.vaccinatorCount - rowValues.length + 1)
            .keys()
            .map(() => ({
              appointment: null,
              spaceToExtend: false
            }))
        )

        const params = new URLSearchParams()
        params.append('slot', time.toISOString())
        return {
          bookingQueryString: params.toString(),
          rowValues
        }
      })

      vaccinationPeriodTables.push({
        vaccinationPeriod,
        periodNumber: vaccinationPeriodTables.length + 1,
        headers,
        rows
      })
    }

    response.locals.vaccinationPeriodTables = vaccinationPeriodTables

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
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

    const sessionWithFullContext = new Session(session, data)
    if (session.type === SessionType.Clinic) {
      response.locals.appointmentsToCancel =
        sessionWithFullContext.appointmentsToCancel.sort((a, b) =>
          getDateValueDifference(a.startAt, b.startAt)
        )
    }

    // Give access to the data needed for the summaryRows
    response.locals.session = sessionWithFullContext

    // Show back link to session page
    response.locals.back = session.uri

    return response.render('session/edit')
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(type) {
    return (request, response) => {
      const { session_id } = request.params
      const { data } = request.session
      const { __, account } = response.locals

      // Update session data
      const session = Session.update(
        session_id,
        data.wizard.sessions[String(session_id)],
        data
      )

      // Cancel any appointments that can't be honoured
      if (session.type === SessionType.Clinic) {
        const offerRebooking = true // TODO: ask the user whether to allow rebooking
        session.appointmentsToCancel.forEach((appointment) => {
          const booking = appointment.booking
          appointment = booking.findAppointment(appointment.uuid)
          appointment.cancelAppointment(account, offerRebooking)

          ClinicBooking.update(booking.uuid, booking, data)
        })
      }

      // Clean up session data
      delete data.vaccinationPeriods
      delete data.transaction
      delete data.session
      delete data.wizard

      request.flash('success', __(`session.${type}.success`, { session }))

      saveAndRedirect(request, response, session.uri)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { session_id, view } = request.params
      const { data, referrer } = request.session
      const { team } = response.locals

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
                hint: clinic.formatted.address
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
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { view } = request.params

    return response.render(`session/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { session_id, view } = request.params
    const { data } = request.session
    const { paths, team } = response.locals

    let session = Session.findOne(session_id, data.wizard)
    if (view === 'type') {
      // Inject the relevant registration default, if not already set, or if changing session type
      if (
        session.hasRegistration === undefined ||
        session?.type !== request.body.session.type
      ) {
        request.body.session.hasRegistration =
          request.body.session.type === SessionType.School
            ? team.hasSchoolSessionRegistration
            : team.hasClinicSessionRegistration
      }
    }

    // Update values in the session model
    if (request.body.session) {
      session = Session.update(session_id, request.body.session, data.wizard)
    }

    if (session.type === SessionType.Clinic) {
      // Add the first vaccination period, if not already there
      if (!session.vaccinationPeriods?.length) {
        session.addVaccinationPeriod()
        Session.update(session_id, session, data.wizard)
      }

      // Copy the default venue information from the clinic location
      if (view === 'clinic') {
        session.venueInformation = Clinic.findOne(
          session.clinic_id,
          data
        )?.venueInformation
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

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  giveInstructions(request, response) {
    const { data } = request.session
    const { __, account, session } = response.locals

    const patientsToInstruct = session.patientSessions.filter(
      ({ patientProgramme }) => patientProgramme.canBulkInstruct
    )

    for (const patientSession of patientsToInstruct) {
      patientSession.patientProgramme.giveInstruction({
        createdBy_uid: account.uid,
        programme_id: patientSession.programme.id
      })

      PatientSession.update(patientSession.uuid, patientSession, data)
    }

    request.flash('success', __(`session.giveInstructions.success`))

    return saveAndRedirect(request, response, `${session.uri}/instructions`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  sendReminders(request, response) {
    const { __, session } = response.locals

    request.flash('success', __(`session.reminders.success`, { session }))

    return saveAndRedirect(request, response, session.uri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  cancelSession(request, response) {
    const { __, session } = response.locals

    request.flash('message', __('session.cancel.success', { session }))

    // TODO: there'll doubtless be other dependent records I need to delete too,
    //       or we may want to simply set a Cancelled status on the session instead
    Session.delete(session.id, request.session.data)

    return saveAndRedirect(request, response, '/sessions')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  makeActive(request, response) {
    const { data } = request.session
    const { __, session } = response.locals

    Session.update(session.id, { date: today() }, data)

    request.flash('success', __('session.makeActive.success'))

    return saveAndRedirect(request, response, session.uri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  inviteToClinic(request, response) {
    const { session_id } = request.params
    const { data } = request.session
    const { __mf, account } = response.locals

    // Update session as closed
    const session = Session.update(session_id, { closeAt: today() }, data)

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

    return saveAndRedirect(request, response, session.uri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  fakeAddChild(request, response) {
    const { session_id } = request.params
    const { data } = request.session

    const session = Session.findOne(session_id, data)

    request.flash(
      'success',
      'Created a clinic appointment for Alison Hargreaves at Edgwick Medical Centre, with a booking reference of CLN-1234-5678'
    )

    return response.redirect(`${session.uri}/patients`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  startCancel(request, response) {
    const { data } = request.session
    const { session } = response.locals

    data.cancellation = {}

    return saveAndRedirect(
      request,
      response,
      session.type === SessionType.Clinic && session.hasAppointments
        ? `${session.uri}/cancel/appointments`
        : `${session.uri}/cancel/confirm`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showCancel(request, response) {
    const { view } = request.params
    const { session } = response.locals

    let back
    switch (view) {
      case 'appointments':
        back = session.uri
        break
      case 'rebooking':
        back = `${session.uri}/cancel/appointments`
        break
      case 'confirm':
        back =
          session.type === SessionType.Clinic && session.hasAppointments
            ? `${session.uri}/cancel/rebooking`
            : session.uri
        break
    }

    return response.render(`session/cancel/${view}`, { back })
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateCancel(request, response) {
    const { view } = request.params
    const { data } = request.session
    const { __, session } = response.locals

    let nextUrl
    switch (view) {
      case 'appointments':
        nextUrl = `${session.uri}/cancel/rebooking`
        break
      case 'rebooking':
        nextUrl = `${session.uri}/cancel/confirm`
        break
      case 'confirm':
        nextUrl = session.uri
        break
    }

    if (view === 'rebooking') {
      data.cancellation.offerRebooking = stringToBoolean(
        data.cancellation.offerRebooking
      )
    } else if (view === 'confirm') {
      request.flash('message', __('session.cancel.success', { session }))

      session.cancelledAt = today()
      Session.update(session.id, session, data)
    }

    return saveAndRedirect(request, response, nextUrl)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 * @import { PatientFilterQuery } from '../../typings/index.d.ts'
 */
