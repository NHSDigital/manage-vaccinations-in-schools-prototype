import {
  AuditEventType,
  ConsentStatus,
  ConsentWindow,
  PatientStatus,
  PreScreenQuestion,
  RegistrationStatus,
  SessionType,
  VaccinationOutcome,
  VaccineCriteria,
  VaccineMethod
} from '../enums.js'
import {
  ClinicBooking,
  PatientSession,
  Programme,
  User,
  Vaccination
} from '../models.js'
import { today } from '../utils/date.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { stringToBoolean } from '../utils/string.js'

export const patientSessionController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, nhsn) {
    const { programme_id, session_id } = request.params
    const { __, account } = response.locals
    const { data } = request.session

    const patientSession = PatientSession.findAll(data).find(
      (patientSession) =>
        patientSession.session_id === session_id &&
        patientSession.programme_id === programme_id &&
        patientSession.patient.nhsn === nhsn
    )

    const registeredNurseUsers = User.findAll(data).filter(
      (user) => user.isRegisteredNurse
    )

    const allVaccinatingUsers = User.findAll(data).filter(
      (user) => user.canVaccinate
    )

    const { clinicAppointment, patient, programme, session } = patientSession

    const vaccinated = patientSession.siblingPatientSessions.findIndex(
      (patientSession) => patientSession.isVaccinated
    )

    const due = patientSession.siblingPatientSessions.filter(
      (patientSession) => patientSession.status === PatientStatus.Due
    )

    const patientProgramme = Object.values(patient.programmes).find(
      (patientProgramme) => patientProgramme.programme_id === programme_id
    )

    let vaccineMethods = []
    if (account.isRegisteredNurse) {
      // Nurses can record all vaccines under any protocol
      vaccineMethods = [VaccineMethod.Injection, VaccineMethod.Intranasal]
    } else if (account.isHealthcareAssistant) {
      // HCAs can record all vaccines under VGD
      if (session.hasVgdProtocol) {
        vaccineMethods = [VaccineMethod.Injection, VaccineMethod.Intranasal]
      }

      // HCAs can only record nasal vaccines for children with a PSD
      if (session.hasPsdProtocol && patientSession.hasInstruction) {
        vaccineMethods = [VaccineMethod.Intranasal]
      }
    }

    response.locals.options = {
      // Show outstanding vaccinations
      showOutstandingVaccinations: vaccinated && due.length > 1,
      // Send a reminder to give consent
      canRemind:
        !patient.hasNoContactDetails &&
        session.consentWindow === ConsentWindow.Open &&
        !session.isActive &&
        patientSession.consent === ConsentStatus.NoResponse,
      // Perform Gillick assessment
      canGillick:
        account.isRegisteredNurse &&
        session.isActive &&
        !vaccinated &&
        !patientSession.consentGiven,
      // Perform triage
      canTriage: account.isRegisteredNurse,
      // Patient needs triage
      needsTriage: patientSession.status === PatientStatus.Triage,
      // Patient already triaged
      hasTriage: patientSession.triageNotes.length > 0,
      hasInstruction: session.hasPsdProtocol && patientSession.hasInstruction,
      canRegister: session.hasRegistration && session.isActive,
      canRecord:
        vaccineMethods?.includes(patientSession.vaccine?.method) &&
        patientSession.canRecordOutcome &&
        session.isActive,
      canRecordInjectionSite:
        patientSession.vaccine?.criteria !== VaccineCriteria.Intranasal
    }

    // Vaccinator has permission to record using the alternative vaccine
    // and patient has consent to vaccinate using the alternative vaccine
    response.locals.canRecordAlternativeVaccine =
      account.vaccineMethods?.includes(programme.alternativeVaccine?.method) &&
      patientSession.canRecordAlternativeVaccine

    const view = request.path.split('/').at(-1)
    response.locals.navigationItems = [
      ...(session.type === SessionType.Clinic
        ? [
            {
              text: __('patientSession.appointment.title'),
              href: `${patientSession.uri}/appointment`,
              current: view === 'appointment'
            }
          ]
        : []),
      ...patientSession.siblingPatientSessions.map((patientSession) => ({
        ...(patientSession.isVaccinated && { icon: 'tick' }),
        text: patientSession.programme.name,
        href: patientSession.uri,
        current:
          !['appointment', 'events'].includes(view) &&
          patientSession.programme_id === programme_id
      })),
      {
        text: __('patientSession.events.title'),
        href: `${patientSession.uri}/events`,
        current: view === 'events'
      }
    ]

    response.locals.programmeItems = [
      ...patientSession.siblingPatientSessions.map((patientSession) => ({
        text: patientSession.programme.name,
        value: patientSession.programme_id
      }))
    ]

    response.locals.referrer = patientSession.uri
    response.locals.patientProgramme = patientProgramme
    response.locals.patientSession = patientSession
    response.locals.patient = patient
    response.locals.programme = programme
    response.locals.session = session
    response.locals.clinicAppointment = clinicAppointment
    response.locals.registeredNurseUsers = registeredNurseUsers
    response.locals.allVaccinatingUsers = allVaccinatingUsers

    // Use different values for pre-screening questions
    // `IsWell` and `IsPregnant` should persist per patient
    response.locals.preScreenQuestionItems =
      patientSession.vaccine &&
      Object.entries(patientSession.vaccine.preScreenQuestions).map(
        ([key, text]) => {
          let value = `${programme.id}-${key}`
          if (text === PreScreenQuestion.IsWell) {
            value = `${nhsn}-is-well`
          } else if (text === PreScreenQuestion.IsPregnant) {
            value = `${nhsn}-is-pregnant`
          }

          return { text, value }
        }
      )

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`patient-session/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readForm(request, response, next) {
    const { referrer } = request.session
    const { patientSession, session } = response.locals

    // Show back link to referring page, else patient session page
    response.locals.back =
      referrer ||
      (session.type === SessionType.Clinic
        ? `${patientSession.uri}/appointment`
        : patientSession.uri)

    return next()
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  showForm(type) {
    return (request, response) => {
      const { view } = request.params

      response.render(`patient-session/form/${view}`, { type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  register(request, response) {
    const { register } = request.body.patientSession
    const { data } = request.session
    const { __, account, patientSession, session, back } = response.locals

    patientSession.registerAttendance(
      {
        createdBy_uid: account.uid
      },
      register
    )

    if (
      register === RegistrationStatus.Absent &&
      patientSession.status !== PatientStatus.Consent
    ) {
      // Record vaccination outcome as absent if safe to vaccinate
      const programme = Programme.findOne(session.programme_ids[0], data)
      const vaccination = Vaccination.create(
        {
          location: session.location.name,
          school_id: session.school_id,
          outcome: VaccinationOutcome.Absent,
          patient_uuid: patientSession.patient_uuid,
          programme_id: programme.id,
          session_id: session.id,
          vaccine_snomed: patientSession.vaccine.snomed,
          createdAt: today(10),
          createdBy_uid: account.uid,
          administeredAt: today(10),
          administeredBy_uid: account.uid
        },
        data
      )

      patientSession.patient.recordVaccination(
        Vaccination.findOne(vaccination.uuid, data)
      )
    }

    request.flash(
      'message',
      __(`patientSession.registration.success.${patientSession.register}`, {
        patientSession
      })
    )

    return saveAndRedirect(request, response, back)
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  gillick(type) {
    return (request, response) => {
      const { gillick } = request.body.patientSession
      const { data } = request.session
      const { __, account, back, patientSession } = response.locals

      if (type === 'edit') {
        gillick.updatedAt = today()
      }

      gillick.createdBy_uid = account.uid

      request.flash('success', __(`patientSession.gillick.${type}.success`))

      patientSession.assessGillick(gillick)

      // Clean up session data
      delete data.patientSession?.gillick

      saveAndRedirect(request, response, back)
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  preScreen(request, response) {
    const { preScreen } = request.body
    const { data } = request.session
    const { account, patientSession, programme } = response.locals

    // Pre-screen interview
    patientSession.preScreen({
      note: preScreen.note,
      createdBy_uid: account.uid
    })

    // Pre-screening outcome is to vaccinate with the alternative vaccine
    patientSession.hasAlternativeVaccine = preScreen.ready === 'alternative'

    // Update patient session
    PatientSession.update(patientSession.uuid, patientSession, data)

    return saveAndRedirect(
      request,
      response,
      `${programme.uri}/vaccinations/new?patientSession_uuid=${patientSession.uuid}`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  invite(request, response) {
    const { __, back, patient, patientSession } = response.locals

    patient.addToSession(patientSession)
    patient.requestConsent(patientSession)

    request.flash(
      'success',
      __('patientSession.invite.success', { contact: patient.contacts[0] })
    )

    return saveAndRedirect(request, response, back)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  remind(request, response) {
    const { account, back, patient, patientSession } = response.locals

    patientSession.sendReminder(
      {
        createdBy_uid: account.uid
      },
      patient.contacts[0]
    )

    return saveAndRedirect(request, response, back)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  note(request, response) {
    let { note, type, programme_ids } = request.body
    const { data } = request.session
    const { __, account, back, patientSession } = response.locals

    programme_ids = Array.isArray(programme_ids)
      ? programme_ids
      : [programme_ids]

    patientSession.saveNote({
      note,
      type,
      createdBy_uid: account.uid,
      session_id:
        type === AuditEventType.SessionNote && patientSession.session_id,
      programme_ids: type === AuditEventType.ProgrammeNote && programme_ids
    })

    // Clean up session data
    delete data.note

    request.flash(
      'success',
      __(`patientSession.notes.new.success`, { patientSession })
    )

    return saveAndRedirect(request, response, back)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  startCancel(request, response) {
    const { patientSession } = response.locals

    request.session.data.cancellation = {}

    return saveAndRedirect(
      request,
      response,
      `${patientSession.uri}/cancel/rebooking`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showCancel(request, response) {
    const { view } = request.params
    const { patientSession } = response.locals

    response.locals.appointmentSummary = `${patientSession.clinicAppointment.formatted.programmeNames} clinic appointment for ${patientSession.patient.fullName}`

    response.locals.back =
      view === 'rebooking'
        ? patientSession.uri
        : `${patientSession.uri}/cancel/rebooking`

    return response.render(`patient-session/cancel/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateCancel(request, response) {
    const { data } = request.session
    const { view } = request.params
    const { __, account, patientSession, session } = response.locals

    // Where next?
    const nextPage =
      view === 'rebooking'
        ? `${patientSession.uri}/cancel/confirm`
        : session.uri

    if (view === 'rebooking') {
      // Sanitise the boolean from the radio
      data.cancellation.offerRebooking = stringToBoolean(
        data.cancellation.offerRebooking
      )
    } else if (view === 'confirm') {
      // Carry out the cancellation
      let appointment = patientSession.clinicAppointment
      const booking = appointment.booking
      appointment = booking.findAppointment(appointment.uuid)
      appointment.cancelAppointment(account, data.cancellation.offerRebooking)
      ClinicBooking.update(booking.uuid, booking, data)

      // Tidy up
      delete data.cancellation

      const { patient } = response.locals
      request.flash(
        'success',
        __('patientSession.clinicAppointment.cancel.confirm.success', {
          patientName: patient.fullName,
          clinicName: session.formatted.clinic
        })
      )
    }

    return saveAndRedirect(request, response, nextPage)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
