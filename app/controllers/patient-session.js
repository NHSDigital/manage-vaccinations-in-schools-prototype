import {
  AuditEventType,
  ConsentOutcome,
  ConsentWindow,
  InstructionOutcome,
  PatientStatus,
  PreScreenQuestion,
  RegistrationOutcome,
  UserRole,
  VaccinationOutcome,
  VaccineMethod
} from '../enums.js'
import {
  Instruction,
  PatientSession,
  Programme,
  Vaccination
} from '../models.js'
import { today } from '../utils/date.js'
import { stringToBoolean } from '../utils/string.js'

export const patientSessionController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, nhsn) {
    const { account } = request.app.locals
    const { programme_id, session_id } = request.params
    const { __ } = response.locals

    const patientSession = PatientSession.findAll(request.session.data).find(
      (patientSession) =>
        patientSession.session.id === session_id &&
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

    // National protocol
    // Nurses can record all vaccines
    // HCAs can record injected flu vaccine, with supplier
    if (session.nationalProtocol) {
      // Upgrade permissions for HCAs
      account.vaccineMethods.push(VaccineMethod.Injection)
    }

    // PSD protocol
    // Nurses can record all vaccines
    // HCAs can record nasal sprays for children with a PSD
    const userIsHCA = account.role === UserRole.HCA
    const patientHasPsd = patientSession.instruct === InstructionOutcome.Given
    if (session.psdProtocol && userIsHCA && patientHasPsd === false) {
      // Downgrade permissions for HCAs as patient doesn’t have a PSD
      account.vaccineMethods = account.vaccineMethods.filter(
        (method) => method !== VaccineMethod.Intranasal
      )
    }

    const userHasSupplier =
      // Injected vaccine using national protocol
      (vaccine?.method === VaccineMethod.Injection &&
        session.nationalProtocol) ||
      // Nasal spray using PGD
      (vaccine?.method === VaccineMethod.Intranasal && !session.psdProtocol)

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
      canGillick: session.isActive && !vaccinated && !consentGiven,
      // Patient needs triage
      needsTriage: report === PatientStatus.Triage,
      // Patient already triaged
      hasTriage: triageNotes.length > 0,
      hasInstruct:
        session.psdProtocol &&
        patientSession.instruct &&
        patientSession.session.isActive,
      hasSupplier: userIsHCA && userHasSupplier,
      canRegister: session.register && session.isActive,
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
      ...patientSession.siblingPatientSessions.map((patientSession) => ({
        ...(patientSession.report === PatientStatus.Vaccinated && {
          icon: 'tick'
        }),
        text: patientSession.programme.name,
        href: patientSession.uri,
        current:
          view !== 'events' && patientSession.programme_id === programme_id
      })),
      ...[
        {
          text: __('patientSession.events.title'),
          href: `${patientSession.uri}/events`,
          current: view === 'events'
        }
      ]
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
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`patient-session/${view}`)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  readForm(request, response, next) {
    const { referrer } = request.session
    const { patientSession } = response.locals

    // Show back link to referring page, else patient session page
    response.locals.back = referrer || patientSession.uri

    return next()
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
   */
  showForm(type) {
    return (request, response) => {
      const { view } = request.params

      response.render(`patient-session/form/${view}`, { type })
    }
  },

  /**
   * @type {import("express").RequestHandler}
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
          createdBy_uid: account.uid
        },
        data
      )

      patientSession.patient.recordVaccination(vaccination)
    }

    // Clean up session data
    delete data.patientSession?.register

    request.flash(
      'message',
      __(`patientSession.registration.success.${patientSession.register}`, {
        patientSession
      })
    )

    return response.redirect(back)
  },

  /**
   * @param {string} type - Form type
   * @returns {import("express").RequestHandler} - Request handler
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

      response.redirect(back)
    }
  },

  /**
   * @type {import("express").RequestHandler}
   */
  preScreen(request, response) {
    const { account } = request.app.locals
    const { preScreen } = request.body.patientSession
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

    return response.redirect(
      `${programme.uri}/vaccinations/new?patientSession_uuid=${patientSession.uuid}`
    )
  },

  /**
   * @type {import("express").RequestHandler}
   */
  invite(request, response) {
    const { __, back, patient, patientSession } = response.locals

    patient.addToSession(patientSession)
    patient.requestConsent(patientSession)

    request.flash(
      'success',
      __('patientSession.invite.success', { contact: patient.contacts[0] })
    )

    return response.redirect(back)
  },

  /**
   * @type {import("express").RequestHandler}
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

    return response.redirect(back)
  },

  /**
   * @type {import("express").RequestHandler}
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

    return response.redirect(back)
  },

  /**
   * @type {import("express").RequestHandler}
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

    return response.redirect(back)
  },

  /**
   * @type {import("express").RequestHandler}
   */
  startCancel(request, response) {
    const { patientSession } = response.locals

    request.session.data.cancellation = {}

    return response.redirect(`${patientSession.uri}/cancel/rebooking`)
  },

  /**
   * @type {import("express").RequestHandler}
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
   * @type {import("express").RequestHandler}
   */
  updateCancel(request, response) {
    const { account } = request.app.locals
    const { __, patientSession } = response.locals
    const { cancellation } = request.session.data
    const { view } = request.params

    // Where next?
    const next =
      view === 'rebooking'
        ? `${patientSession.uri}/cancel/confirm`
        : patientSession.uri

    if (view === 'rebooking') {
      // Sanitise the boolean from the radio
      cancellation.offerRebooking = stringToBoolean(cancellation.offerRebooking)
    } else if (view === 'confirm') {
      // Carry out the cancellation
      patientSession.clinicAppointment.cancelAppointment(
        account,
        cancellation.offerRebooking
      )

      // Tidy up
      delete request.session.data.cancellation

      request.flash(
        'success',
        __('patientSession.clinicAppointment.cancel.confirm.success')
      )
    }

    return response.redirect(next)
  }
}
