import { ProgrammeType, VaccinationOutcome } from '../enums.js'
import {
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
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  vaccination(type) {
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
