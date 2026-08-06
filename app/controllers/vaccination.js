import wizard from '@x-govuk/govuk-prototype-wizard'

import {
  ProgrammeType,
  VaccinationMethod,
  VaccinationOutcome,
  VaccinationSite,
  VaccinationProtocol,
  VaccineCriteria
} from '../enums.js'
import {
  Batch,
  DefaultBatch,
  Patient,
  PatientSession,
  Programme,
  User,
  Vaccination,
  Vaccine
} from '../models.js'
import { today } from '../utils/date.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { formatSequence, stringToArray } from '../utils/string.js'

export const vaccinationController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, vaccination_uuid) {
    const { programme_id } = request.params
    const { data } = request.session

    const programme = Programme.findOne(String(programme_id), data)
    const vaccination = Vaccination.findOne(vaccination_uuid, data)

    response.locals.programme = programme
    response.locals.session = vaccination?.session
    response.locals.vaccination = vaccination

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  redirect(request, response) {
    const { id, nhsn } = request.params

    return saveAndRedirect(request, response, `/sessions/${id}/${nhsn}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    return response.render('vaccination/show')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  edit(request, response) {
    const { vaccination_uuid } = request.params
    const { data, referrer } = request.session

    // Setup wizard if not already setup
    let vaccination = Vaccination.findOne(vaccination_uuid, data.wizard)
    if (!vaccination) {
      vaccination = Vaccination.create(response.locals.vaccination, data.wizard)
    }

    response.locals.vaccination = new Vaccination(vaccination, data)

    // Show back link to referring page, else vaccination page
    response.locals.back = referrer || vaccination.uri

    return response.render('vaccination/edit')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { patientSession_uuid } = request.query
    const { data } = request.session
    const { account } = response.locals

    const patientSession = PatientSession.findOne(
      String(patientSession_uuid),
      data
    )
    const { session, patient, programme, patientProgramme } = patientSession
    const { identifiedBy, injectionSite, ready, hasSelfIdentified } =
      data.preScreen
    const administeredBy_uid = data.preScreen?.administeredBy_uid || account.uid
    const assessedBy_uid = data.preScreen?.assessedBy_uid

    // Check for default batch
    const defaultBatch = DefaultBatch.findAll(data)
      .filter(
        (batch) => batch.vaccine_snomed === patientProgramme.vaccine?.snomed
      )
      .find((batch) => batch.session_id === session?.id)

    const readyToVaccine = ['true', 'alternative'].includes(ready)
    const injectionSiteGiven = [
      VaccinationSite.ArmLeftUpper,
      VaccinationSite.ArmRightUpper
    ].includes(injectionSite)
    const isNasalSpray =
      patientProgramme.vaccine?.criteria === VaccineCriteria.Intranasal
    const VaccinationSiteGiven = injectionSiteGiven || isNasalSpray

    switch (true) {
      case defaultBatch && readyToVaccine && VaccinationSiteGiven:
        data.startPath = 'check-answers'
        break
      case readyToVaccine && VaccinationSiteGiven:
        data.startPath = 'batch-id'
        break
      case readyToVaccine:
        data.startPath = 'administer'
        break
      default:
        data.startPath = 'decline'
    }

    // Temporarily store values to use during flow
    if (defaultBatch) {
      data.defaultBatchId = defaultBatch.id
    }
    data.patientSession_uuid = String(patientSession_uuid)

    // Flu programme can use PGD, PSD or VGD protocol
    let protocol
    switch (true) {
      case patientProgramme.hasInstruction && session.hasPsdProtocol:
        protocol = VaccinationProtocol.PSD
        break
      case account.isHCA && session.hasVgdProtocol:
        protocol = VaccinationProtocol.VGD
        break
      case account.isRegisteredNurse && session.hasVgdProtocol:
        protocol = VaccinationProtocol.VGD
        break
      default:
        protocol = VaccinationProtocol.PGD
    }

    const vaccination = Vaccination.create(
      {
        hasSelfIdentified,
        identifiedBy,
        location: session.formatted.location,
        school_id: session.school_id,
        patient_uuid: patient.uuid,
        programme_id: programme.id,
        session_id: session.id,
        vaccine_snomed: patientProgramme.vaccine.snomed,
        createdAt: today(),
        createdBy_uid: account.uid,
        administeredAt: today(),
        administeredBy_uid,
        ...(session.hasVgdProtocol && {
          assessedBy_uid
        }),
        ...(injectionSite && {
          dose: patientProgramme.vaccine.dose,
          injectionMethod: VaccinationMethod.Intramuscular,
          injectionSite,
          protocol,
          outcome: VaccinationOutcome.Vaccinated
        }),
        ...(isNasalSpray && {
          dose: patientProgramme.vaccine.dose,
          injectionMethod: VaccinationMethod.Intranasal,
          injectionSite: VaccinationSite.Nose,
          protocol,
          outcome: VaccinationOutcome.Vaccinated
        }),
        ...(programme.sequence && {
          sequence: programme.sequenceDefault
        }),
        ...(defaultBatch && {
          batch_id: defaultBatch.id
        })
      },
      data.wizard
    )

    return saveAndRedirect(
      request,
      response,
      `${vaccination.uri}/new/${data.startPath}`
    )
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(type) {
    return (request, response) => {
      const { vaccination_uuid } = request.params
      const { data, referrer } = request.session
      const { __, session } = response.locals

      // Update session data
      const updates = {
        ...data.wizard.vaccinations[vaccination_uuid],
        ...request.body?.vaccination
      }

      if (type === 'new') {
        Vaccination.create(updates, data)
      } else {
        Vaccination.update(vaccination_uuid, updates, data)
      }

      const vaccination = Vaccination.findOne(vaccination_uuid, data)

      // Update number of vaccinations given during session
      if (type === 'new' && vaccination.patientSession) {
        if (data?.token?.vaccinations?.[vaccination.vaccine_snomed]) {
          data.token.vaccinations[vaccination.vaccine_snomed] += 1
        } else {
          data.token = data.token ?? User.findAll(data).at(-1)
          data.token.vaccinations = {
            [vaccination.vaccine_snomed]: 1
          }
        }
      }

      request.flash(
        'success',
        __(`vaccination.${type}.success`, { vaccination })
      )

      // Clean up session data
      delete data.batch_id
      delete data.defaultBatch
      delete data.patientSession_uuid
      delete data.startPath
      delete data.vaccination
      delete data.wizard

      // Update session data
      vaccination.patient.recordVaccination(vaccination)

      let next = referrer || vaccination.uri
      if (type === 'new' && vaccination.patientSession) {
        next =
          vaccination.patientSession.outstandingVaccinations.length === 0
            ? `${session.uri}/record`
            : vaccination.patientSession.uri
      }

      saveAndRedirect(request, response, next)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { vaccination_uuid } = request.params
      const { data, referrer } = request.session

      let vaccination
      if (type === 'edit') {
        vaccination = Vaccination.findOne(vaccination_uuid, data)
      } else {
        vaccination = new Vaccination(
          Vaccination.findOne(vaccination_uuid, data.wizard),
          data
        )
      }

      response.locals.vaccination = vaccination

      // Historical vaccinations may not return a patient session
      const patientSession = PatientSession.findOne(
        data.patientSession_uuid,
        data
      )
      const patient = Patient.findOne(vaccination.patient_uuid, data)
      const patientProgramme = patient.programmes[vaccination.programme_id]

      response.locals.patientSession = patientSession
      response.locals.session = patientSession?.session

      const journey = {
        [`/`]: {},
        ...(data.startPath === 'decline'
          ? {
              [`/${vaccination_uuid}/${type}/decline`]: {},
              [`/${vaccination_uuid}/${type}/check-answers`]: {}
            }
          : {
              [`/${vaccination_uuid}/${type}/administer`]: {},
              [`/${vaccination_uuid}/${type}/batch-id`]: () => {
                return !data.defaultBatchId
              },
              ...(!vaccination.programme
                ? {
                    [`/${vaccination_uuid}/${type}/programme`]: {
                      [`/${vaccination_uuid}/${type}/sequence`]: {
                        data: 'vaccination.programme_id',
                        value: '4in1'
                      }
                    }
                  }
                : {}),
              ...(vaccination?.outcome === VaccinationOutcome.AlreadyVaccinated
                ? {
                    ...(vaccination?.programme?.type === ProgrammeType.MMR
                      ? {
                          [`/${vaccination_uuid}/${type}/variant`]: {}
                        }
                      : {}),
                    ...(vaccination?.programme?.sequence?.length > 1
                      ? {
                          [`/${vaccination_uuid}/${type}/sequence`]: {}
                        }
                      : {}),
                    [`/${vaccination_uuid}/${type}/administered-at`]: {}
                  }
                : {}),
              ...(!vaccination.location && {
                [`/${vaccination_uuid}/${type}/location`]: {
                  [`/${vaccination_uuid}/${type}/address`]: {
                    data: 'vaccination.locationType',
                    value: 'Another location'
                  },
                  [`/${vaccination_uuid}/${type}/check-answers`]: true
                },
                [`/${vaccination_uuid}/${type}/address`]: {}
              }),
              [`/${vaccination_uuid}/${type}/check-answers`]: {}
            }),
        [`/${vaccination_uuid}`]: {}
      }

      response.locals.paths = {
        ...wizard(journey, request),
        ...(type === 'edit' && {
          back: `${vaccination.uri}/edit`,
          next: `${vaccination.uri}/edit`
        })
      }

      // If first page in journey, return to page that initiated recording
      const currentPath = request.path.split('/').at(-1)
      if (currentPath === data.startPath) {
        response.locals.paths.back = referrer || vaccination.uri
      }

      // When recording a previous vaccination, we don’t know the vaccine
      if (patientProgramme?.vaccine) {
        response.locals.batchItems = Batch.findAll(data)
          .filter(
            (batch) => batch.vaccine.snomed === patientProgramme?.vaccine.snomed
          )
          .filter((batch) => !batch.archivedAt)
      }

      response.locals.injectionMethodItems = Object.entries(VaccinationMethod)
        .filter(([, value]) => value !== VaccinationMethod.Intranasal)
        .map(([key, value]) => ({
          text: VaccinationMethod[key],
          value
        }))

      response.locals.injectionSiteItems = Object.entries(VaccinationSite)
        .filter(([, value]) => value !== VaccinationSite.Nose)
        .filter(([, value]) => value !== VaccinationSite.Other)
        .map(([key, value]) => ({
          text: VaccinationSite[key],
          value
        }))

      response.locals.sequenceItems =
        vaccination.programme?.sequence &&
        Object.values(vaccination.programme?.sequence).map((sequence) => {
          return {
            text: formatSequence(sequence),
            value: sequence
          }
        })

      response.locals.userItems = User.findAll(data)
        .filter((user) => user.canVaccinate)
        .map((user) => ({
          text: user.fullName,
          value: user.uid
        }))
        .sort((a, b) => a.text.localeCompare(b.text))

      response.locals.vaccineItems = Vaccine.findAll(data)
        .filter((vaccine) => vaccination.programme?.type.includes(vaccine.type))
        .map((vaccine) => ({
          text: vaccine.brandWithType,
          value: vaccine.snomed
        }))

      next()
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  showForm(type) {
    return (request, response) => {
      const { view } = request.params

      response.render(`vaccination/form/${view}`, { type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { data } = request.session
    const { vaccination_uuid } = request.params
    let { paths, patientSession, vaccination } = response.locals

    // Add dose amount and vaccination outcome based on dosage answer
    const dosage = request.body?.vaccination?.dosage
    if (dosage) {
      request.body.vaccination.dose =
        dosage === 'half'
          ? vaccination.vaccine.dose / 2
          : vaccination.vaccine.dose
      request.body.vaccination.outcome =
        dosage === 'half'
          ? VaccinationOutcome.PartVaccinated
          : VaccinationOutcome.Vaccinated
    }

    vaccination = Vaccination.update(
      vaccination_uuid,
      request.body.vaccination,
      data.wizard
    )

    // Get default batch, if saved
    if (data.defaultBatchId) {
      request.body.vaccination.batch_id = data.defaultBatchId
    }

    // Set default batch, if checked
    if (request.body?.defaultBatchId) {
      const defaultBatchId = stringToArray(request.body.defaultBatchId)[0]

      if (defaultBatchId) {
        DefaultBatch.addToSession(
          defaultBatchId,
          patientSession.session_id,
          data
        )
      }
    }

    const redirect = paths.next || `${vaccination.uri}/new/check-answers`

    return saveAndRedirect(request, response, redirect)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
