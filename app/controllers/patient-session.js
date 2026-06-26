import {
  AuditEventType,
  ConsentOutcome,
  ConsentWindow,
  InstructionOutcome,
  PatientStatus,
  PreScreenQuestion,
  RegistrationOutcome,
  SessionType,
  UserRole,
  VaccinationOutcome,
  VaccinationProtocol,
  VaccineMethod
} from '../enums.js'
import {
  ClinicBooking,
  Instruction,
  PatientSession,
  Programme,
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
    const { account } = request.app.locals
    const { programme_id, session_id } = request.params
    const { __ } = response.locals

    const patientSession = PatientSession.findAll(request.session.data).find(
      (patientSession) =>
        patientSession.session_id === session_id &&
        patientSession.programme_id === programme_id &&
        patientSession.patient.nhsn === nhsn
    )

    const {
      consent,
      consentGiven,
      patient,
      programme,
      record,
      report,
      session,
      triageNotes,
      vaccine
    } = patientSession

    const vaccinated = patientSession.siblingPatientSessions.findIndex(
      ({ report }) => report !== PatientStatus.Vaccinated
    )

    const due = patientSession.siblingPatientSessions.filter(
      ({ report }) => report === PatientStatus.Due
    )

    const patientProgramme = Object.values(patient.programmes).find(
      (patientProgramme) => patientProgramme.programme_id === programme_id
    )

    // PSD protocol
    // Nurses can record all vaccines
    // HCAs can only record nasal sprays for children with a PSD
    const userIsHCA = account.role === UserRole.HCA
    const patientHasPsd = patientSession.instruct === InstructionOutcome.Given
    if (userIsHCA && !patientHasPsd) {
      // Remove permissions for HCAs as patient doesn’t have a PSD
      account.vaccineMethods = []
    }

    // VGD protocol
    // Nurses can record all vaccines
    // HCAs can record all vaccines (but must record practitioner)
    if (userIsHCA && session.fluProtocol === VaccinationProtocol.VGD) {
      // Remove permissions for HCAs as patient doesn’t have a PSD
      account.vaccineMethods = [
        VaccineMethod.Injection,
        VaccineMethod.Intranasal
      ]
    }

    response.locals.options = {
      // Show outstanding vaccinations
      showOutstandingVaccinations: vaccinated && due.length > 1,
      // Send a reminder to give consent
      canRemind:
        !patient.hasNoContactDetails &&
        session.consentWindow === ConsentWindow.Open &&
        !session.isActive &&
        consent === ConsentOutcome.NoResponse,
      // Perform Gillick assessment
      canGillick:
        session.isActive && !vaccinated && !consentGiven && !userIsHCA,
      // Perform triage
      canTriage: !userIsHCA,
      // Patient needs triage
      needsTriage: report === PatientStatus.Triage,
      // Patient already triaged
      hasTriage: triageNotes.length > 0,
      hasInstruct:
        session.psdProtocol &&
        patientSession.instruct &&
        patientSession.session.isActive,
      userIsHCA,
      canRegister: session.registration && session.isActive,
      canRecord:
        account.vaccineMethods?.includes(patientSession.vaccine?.method) &&
        record &&
        session.isActive
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
        ...(patientSession.report === PatientStatus.Vaccinated && {
          icon: 'tick'
        }),
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

    // Use different values for pre-screening questions
    // `IsWell` and `IsPregnant` should persist per patient
    response.locals.preScreenQuestionItems =
      vaccine &&
      Object.entries(vaccine.preScreenQuestions).map(([key, text]) => {
        let value = `${programme.id}-${key}`
        if (text === PreScreenQuestion.IsWell) {
          value = `${nhsn}-is-well`
        } else if (text === PreScreenQuestion.IsPregnant) {
          value = `${nhsn}-is-pregnant`
        }

        return { text, value }
      })

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
    const { account } = request.app.locals
    const { register } = request.body.patientSession
    const { data } = request.session
    const { __, patientSession, session, back } = response.locals

    patientSession.registerAttendance(
      {
        createdBy_uid: account.uid
      },
      register
    )

    if (
      register === RegistrationOutcome.Absent &&
      patientSession.report !== PatientStatus.Consent
    ) {
      // Record vaccination outcome as absent if safe to vaccinate
      const programme = Programme.findOne(session.programme_ids[0], data)
      const vaccination = Vaccination.create(
        {
          location: session.location.name,
          school_id: session.school_id,
          outcome: VaccinationOutcome.Absent,
          patientSession_uuid: patientSession.uuid,
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
      const { account } = request.app.locals
      const { gillick } = request.body.patientSession
      const { data } = request.session
      const { __, back, patientSession } = response.locals

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
    const { account } = request.app.locals
    const { preScreen } = request.body
    const { data } = request.session
    const { patientSession, programme } = response.locals

    // Pre-screen interview
    patientSession.preScreen({
      note: preScreen.note,
      createdBy_uid: account.uid
    })

    // Pre-screening outcome is to vaccinate with the alternative vaccine
    patientSession.alternative = preScreen.ready === 'alternative'

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
    const { account } = request.app.locals
    const { back, patient, patientSession } = response.locals

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
  triage(request, response) {
    const { account } = request.app.locals
    const { triage } = request.body
    const { data } = request.session
    const { __, back, patientSession } = response.locals

    if (triage.psd) {
      const instruction = Instruction.create(
        {
          createdBy_uid: account.uid,
          programme_id: patientSession.programme.id,
          patientSession_uuid: patientSession.uuid
        },
        data
      )

      patientSession.giveInstruction(instruction)
    }

    patientSession.recordTriage({
      outcome: triage.outcome,
      outcomeAt_: triage.outcomeAt_,
      note: triage.note,
      createdBy_uid: account.uid
    })

    // Clean up session data
    delete data.triage

    request.flash('success', __(`triage.edit.success`, { patientSession }))

    return saveAndRedirect(request, response, back)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  note(request, response) {
    const { account } = request.app.locals
    let { note, type, programme_ids } = request.body
    const { data } = request.session
    const { __, back, patientSession } = response.locals

    programme_ids = Array.isArray(programme_ids)
      ? programme_ids
      : [programme_ids]

    patientSession.saveNote({
      note,
      type,
      createdBy_uid: account.uid,
      session_id:
        type === AuditEventType.SessionNote && patientSession.session_id,
      programme_ids:
        type === AuditEventType.ProgrammeNote &&
        programme_ids?.filter((programme_id) => programme_id !== '_unchecked')
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
    const { account } = request.app.locals
    const { __, patientSession, session } = response.locals
    const { data } = request.session
    const { view } = request.params

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
