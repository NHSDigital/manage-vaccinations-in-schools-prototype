import { ProgrammeType, VaccinationOutcome } from '../enums.js'
import {
  Instruction,
  PatientProgramme,
  Patient,
  Vaccination,
  PatientSession,
  Session
} from '../models.js'
import { saveAndRedirect } from '../utils/redirect.js'

export const patientProgrammeController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  read(request, response, next) {
    const { programme_id } = request.params
    const { data } = request.session
    const { patient } = response.locals

    if (!programme_id) {
      return saveAndRedirect(request, response, patient.uri)
    }

    const patientProgramme = new PatientProgramme(
      patient.programmes[String(programme_id)],
      data
    )

    response.locals.activeClinicsItems = patientProgramme.activeClinics.map(
      (session) => ({
        text: session.location.name,
        hint: { text: session.clinic.formatted.address },
        value: session.id
      })
    )

    response.locals.patientProgramme = patientProgramme

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`patient-programme/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readForm(request, response, next) {
    const { referrer } = request.session
    const { patientProgramme } = response.locals

    // Show back link to referring page, else patient programme page
    response.locals.back = referrer || patientProgramme.uri

    // TODO: Remove once patient session methods moved to patient programme
    response.locals.patientSession = patientProgramme?.lastPatientSession

    return next()
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  showForm(type) {
    return (request, response) => {
      const { view } = request.params

      response.render(`patient-programme/form/${view}`, { type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  addToSession(request, response) {
    const { session_id } = request.body
    const { programme_id } = request.params
    const { data } = request.session
    const { __, account, patient, patientProgramme } = response.locals

    if (patientProgramme.scheduledClinicsCount === 0) {
      return saveAndRedirect(request, response, `/sessions/new`)
    }

    // Get session
    const session = Session.findOne(session_id, data)

    // Create and add patient session
    const patientSession = PatientSession.create(
      {
        createdBy_uid: account.uid,
        patient_uuid: patient.uuid,
        programme_id,
        session_id
      },
      data
    )

    // Add to session
    patient.addToSession(patientSession)

    // Update session data
    Patient.update(patient.uuid, patient, data)

    request.flash(
      'success',
      __(`patientProgramme.addToSession.success`, { patient, session })
    )

    const returnUri = PatientSession.findOne(patientSession.uuid, data).uri
    saveAndRedirect(request, response, returnUri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  triage(request, response) {
    const { triage } = request.body
    const { data, referrer } = request.session
    const { __, account, patientProgramme } = response.locals

    if (triage.psd) {
      const instruction = Instruction.create(
        {
          createdBy_uid: account.uid,
          programme_id: patientProgramme.programme.id,
          patient_uuid: patientProgramme.patient.uuid
        },
        data
      )

      patientProgramme.giveInstruction(instruction)
    }

    patientProgramme.recordTriage({
      status: triage.status,
      outcomeAt_: triage.outcomeAt_,
      note: triage.note,
      createdBy_uid: account.uid
    })

    // Clean up session data
    delete data.triage

    request.flash('success', __(`triage.new.success`, { patientProgramme }))

    return saveAndRedirect(request, response, referrer || patientProgramme.uri)
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  vaccinate(type) {
    return (request, response) => {
      const { programme_id } = request.params
      const { data } = request.session
      const { account, patient } = response.locals

      const patientProgramme = new PatientProgramme(
        patient.programmes[String(programme_id)],
        data
      )

      // Vaccination
      const vaccination = Vaccination.create(
        {
          outcome: VaccinationOutcome.AlreadyVaccinated,
          patient_uuid: patient.uuid,
          createdBy_uid: account.uid,
          administeredBy_uid: account.uid,
          ...(type === 'new' && { programme_id })
        },
        data.wizard
      )

      let startPage = 'administered-at'
      if (!vaccination.programme_id) {
        startPage = 'programme'
      } else if (patientProgramme.programme.type === ProgrammeType.MMR) {
        startPage = 'variant'
      }

      saveAndRedirect(
        request,
        response,
        `${patientProgramme.programme.uri}/vaccinations/${vaccination.uuid}/new/${startPage}?referrer=${patientProgramme.uri}`
      )
    }
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 * @import { PatientFilterQuery } from '../../typings/index.d.ts'
 */
