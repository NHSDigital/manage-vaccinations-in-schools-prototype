import wizard from '@x-govuk/govuk-prototype-wizard'

import {
  GillickCompetent,
  ParentalRelationship,
  ReplyDecision,
  ReplyMethod,
  ReplyRefusal,
  VaccinationOutcome
} from '../enums.js'
import { Contact, Patient, Programme, Reply, Vaccination } from '../models.js'
import { today } from '../utils/date.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { countAnswersNeedingTriage } from '../utils/reply.js'
import { formatContact } from '../utils/string.js'

export const replyController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, reply_uuid) {
    const { patient_uuid, programme_id } = request.params
    const { data } = request.session

    const patient = Patient.findOne(String(patient_uuid), data)
    const patientProgramme = patient.programmes[String(programme_id)]
    const reply = Reply.findOne(reply_uuid, data)

    response.locals.reply = reply
    response.locals.patientProgramme = patientProgramme

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  redirect(request, response) {
    const { patient_uuid, programme_id } = request.params

    return saveAndRedirect(
      request,
      response,
      `/patients/${patient_uuid}/${programme_id}`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    return response.render('reply/show')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { patient_uuid, programme_id } = request.params
    const { session_id } = request.query
    const { data } = request.session
    const { account } = response.locals

    const patient = Patient.findOne(String(patient_uuid), data)
    const patientProgramme = patient.programmes[String(programme_id)]

    const createdReply = Reply.create(
      {
        child: patientProgramme.patient,
        patient_uuid,
        programme_id,
        session_id,
        createdBy_uid: account.uid,
        hasSelfConsent: patientProgramme?.patient?.isPost16
      },
      data
    )

    const reply = new Reply(createdReply, data)

    let next
    if (patientProgramme?.patient?.isPost16) {
      next = `${reply.uri}/new/decision`
    } else {
      next = `${reply.uri}/new/respondent`
    }

    return saveAndRedirect(request, response, next)
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(type) {
    return (request, response) => {
      const { invalidUuid } = request.app.locals
      const { reply_uuid } = request.params
      const { data, referrer } = request.session
      const { __, account, patientProgramme, triage, vaccination } =
        response.locals

      let reply
      let next
      if (type === 'edit') {
        reply = Reply.findOne(reply_uuid, data)
        next = reply.uri

        Reply.update(reply_uuid, request.body.reply, data)
      } else {
        reply = new Reply(Reply.findOne(reply_uuid, data.wizard), data)
        next = referrer || patientProgramme.uri

        // Remove any contact details in reply if self consent
        if (reply.hasSelfConsent) {
          delete reply.contact_uuid
        }

        if (triage?.psd) {
          patientProgramme.giveInstruction({
            createdBy_uid: account.uid,
            programme_id: patientProgramme.programme_id
          })
        }

        if (triage?.status) {
          patientProgramme.recordTriage({
            ...triage,
            ...data?.wizard?.triage, // Wizard values
            createdBy_uid: account.uid,
            createdAt: today()
          })
        }

        // Create vaccination if refusal reason is vaccination already given
        if (reply?.refusalReason === ReplyRefusal.AlreadyVaccinated) {
          const createdVaccination = Vaccination.create(
            {
              outcome: VaccinationOutcome.AlreadyVaccinated,
              patient_uuid: patientProgramme.patient_uuid,
              programme_id: patientProgramme.programme_id,
              administeredAt_: vaccination.administeredAt_,
              administeredBy_uid: account.uid,
              createdBy_uid: account.uid,
              clinic_id: vaccination.clinic_id,
              school_id: vaccination.school_id,
              locationName: vaccination.locationName,
              addressLine1: vaccination.addressLine1,
              addressLine2: vaccination.addressLine2,
              addressLevel1: vaccination.addressLevel1,
              country: vaccination.country,
              locationType: vaccination.locationType
            },
            data
          )

          patientProgramme.patient.recordVaccination(createdVaccination)
        }

        // Invalidate any replaced response
        if (invalidUuid) {
          Reply.update(invalidUuid, { isInvalidated: true }, data)

          delete request.app.locals.invalidUuid
        }

        patientProgramme.patient.addReply(reply)

        // Update session data
        Reply.update(reply_uuid, reply, data)
      }

      // Clean up session data
      delete data.reply
      delete data.triage
      delete data.vaccination

      request.flash('success', __(`reply.${type}.success`, { reply }))

      saveAndRedirect(request, response, next)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { reply_uuid } = request.params
      const { data, referrer } = request.session
      const { patientProgramme, triage, vaccination } = response.locals

      let reply
      if (type === 'edit') {
        reply = Reply.findOne(reply_uuid, data)
      } else {
        // Setup wizard if not already setup
        reply = Reply.findOne(reply_uuid, data.wizard)
        if (!reply) {
          reply = Reply.create(response.locals.reply, data.wizard)
        }
        reply = new Reply(reply, data)
      }

      response.locals.reply = new Reply(reply, data)

      // Only ask for programme if more than 1 administered in a session
      const isMultiProgrammeSession = reply?.session?.programmes.length > 1
      response.locals.isMultiProgrammeSession = isMultiProgrammeSession

      const programme = isMultiProgrammeSession
        ? reply.programme_id && Programme.findOne(reply.programme_id, data)
        : reply?.session?.programmes[0]
      response.locals.programme = programme

      response.locals.triage = {
        ...(type === 'edit' && triage), // Previous values
        ...data?.wizard?.triage // Wizard values
      }

      response.locals.vaccination = {
        ...(type === 'edit' && vaccination), // Previous values
        ...data?.wizard?.vaccination // Wizard values
      }

      const journey = {
        [`/`]: {},
        [`/${reply_uuid}/${type}/respondent`]: {},
        ...(data.respondent !== 'self' &&
          !reply.hasSelfConsent && {
            [`/${reply_uuid}/${type}/contact`]: {}
          }),
        ...(isMultiProgrammeSession && {
          [`/${reply_uuid}/${type}/programme`]: {}
        }),
        [`/${reply_uuid}/${type}/decision`]: {
          [`/${reply_uuid}/${type}/${reply?.hasSelfConsent && !patientProgramme.patient.isPost16 ? 'can-notify' : 'health-answers'}`]:
            {
              data: 'reply.decision',
              value: ReplyDecision.Given
            },
          [`/${reply_uuid}/${type}/refusal-reason`]: {
            data: 'reply.decision',
            value: ReplyDecision.Refused
          },
          [`/${reply_uuid}/${type}/note`]: {
            data: 'reply.decision',
            value: ReplyDecision.NoResponse
          }
        },
        [`/${reply_uuid}/${type}/can-notify`]: {},
        [`/${reply_uuid}/${type}/health-answers`]: {
          [`/${reply_uuid}/${type}/${countAnswersNeedingTriage(data.reply?.healthAnswers) ? 'triage' : 'check-answers'}`]: true
        },
        [`/${reply_uuid}/${type}/refusal-reason`]: {
          [`/${reply_uuid}/${type}/refusal-reason-details`]: {
            data: 'reply.refusalReason',
            values: [ReplyRefusal.GettingElsewhere, ReplyRefusal.Medical]
          },
          [`/${reply_uuid}/${type}/refusal-already-vaccinated`]: {
            data: 'reply.refusalReason',
            value: ReplyRefusal.AlreadyVaccinated
          },
          [`/${reply_uuid}/${type}/refusal-notification`]: {
            data: 'reply.refusalReason',
            value: ReplyRefusal.Personal
          },
          [`/${reply_uuid}/${type}/check-answers`]: true
        },
        [`/${reply_uuid}/${type}/refusal-reason-details`]: {
          [`/${reply_uuid}/${type}/check-answers`]: true
        },
        [`/${reply_uuid}/${type}/triage`]: {
          [`/${reply_uuid}/${type}/check-answers`]: true
        },
        [`/${reply_uuid}/${type}/note`]: {
          [`/${reply_uuid}/${type}/check-answers`]: true
        },
        [`/${reply_uuid}`]: {}
      }

      response.locals.paths = {
        ...wizard(journey, request),
        ...(type === 'edit' && {
          back: `${reply.uri}/edit`,
          next: `${reply.uri}/edit`
        }),
        ...(referrer && { back: referrer })
      }

      response.locals.respondentItems = patientProgramme.patient.contacts.map(
        (contact) => ({
          text: formatContact(contact, false),
          hint: { text: contact.tel },
          value: contact.uuid
        })
      )

      // Child can self consent if assessed as Gillick competent
      if (reply?.patientSession?.gillick?.competent === GillickCompetent.True) {
        response.locals.respondentItems.unshift({
          text: `${patientProgramme.patient?.firstName} (child)`,
          value: 'self'
        })
      }

      if (isMultiProgrammeSession) {
        response.locals.programmeItems = reply.session?.programmes.map(
          (programme) => ({
            text: programme.name,
            value: programme.id
          })
        )
      }

      next()
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { view } = request.params

    // Prepare the radio options for the parental relationship page
    response.locals.parentalRelationshipItems = Object.values(
      ParentalRelationship
    )
      .filter((relationship) => relationship !== ParentalRelationship.Unknown)
      .map((relationship) => ({
        text: relationship,
        value: relationship
      }))

    return response.render(`reply/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { respondent } = request.body
    const { reply_uuid } = request.params
    const { data } = request.session
    let { paths, triage, vaccination } = response.locals

    // Add contacts from global context to wizard
    data.wizard.contacts = data.contacts

    const reply = Reply.update(reply_uuid, request.body.reply, data.wizard)

    // Create contact based on choice of respondent
    if (respondent) {
      switch (respondent) {
        case 'new': // Consent response is from a new contact
          reply.method = ReplyMethod.Phone
          reply.contact_uuid = Contact.create(
            {
              patient_uuid: reply.patient_uuid
            },
            data.wizard
          ).uuid
          break
        case 'self':
          reply.method = ReplyMethod.InPerson
          reply.hasSelfConsent = true
          break
        default: // Consent response is an existing respondent
          reply.method = ReplyMethod.Phone
          reply.contact_uuid = respondent

          // Store reply that needs marked as invalid
          // We only want to do this when submitting replacement reply
          request.app.locals.invalidUuid = request.body.uuid
      }
    }

    // Update wizard data
    Reply.update(reply_uuid, reply, data.wizard)

    // Clean up session data
    delete data.healthAnswers
    delete data.respondent

    data.wizard.triage = {
      ...triage, // Previous values
      ...request.body?.triage // New value
    }

    data.wizard.vaccination = {
      ...vaccination, // Previous values
      ...request?.body?.vaccination // Wizard values
    }

    return saveAndRedirect(
      request,
      response,
      paths.next || `${reply.uri}/new/check-answers`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  followUp(request, response) {
    const { decision } = request.body
    const { data } = request.session
    const { patientProgramme, reply } = response.locals

    if (decision === 'true') {
      return saveAndRedirect(request, response, `${reply.uri}/edit/outcome`)
    }

    // Store reply that needs marked as invalid
    // We only want to do this when submitting replacement reply
    request.app.locals.invalidUuid = reply.uuid

    const newReply = Reply.create(
      {
        child: patientProgramme.patient,
        contact_uuid: reply.contact_uuid,
        patient_uuid: patientProgramme.patient_uuid,
        programme_id: patientProgramme.programme_id,
        method: ReplyMethod.Phone
      },
      data.wizard
    )

    const createdReply = new Reply(newReply, data)

    // Clean up session data
    delete data.decision

    return saveAndRedirect(
      request,
      response,
      `${createdReply.uri}/new/decision?referrer=${reply.uri}`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  invalidate(request, response) {
    const { note } = request.body.reply
    const { reply_uuid } = request.params
    const { data } = request.session
    const { __, referrer } = response.locals

    // Clean up session data
    delete data.reply

    // Update batch data
    const reply = Reply.update(reply_uuid, { isInvalidated: true, note }, data)

    request.flash('success', __(`reply.invalidate.success`, { reply }))

    return saveAndRedirect(request, response, referrer || reply.uri)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  withdraw(request, response) {
    const { refusalReason, refusalReasonOther, note } = request.body.reply
    const { reply_uuid } = request.params
    const { data, referrer } = request.session
    const { __, account, patientProgramme, reply } = response.locals

    // Create a new reply
    const newReply = Reply.create(
      {
        ...reply,
        uuid: false,
        createdAt: today(),
        createdBy_uid: account.uid,
        decision: ReplyDecision.Refused,
        refusalReason,
        ...(refusalReason === ReplyRefusal.Other && { refusalReasonOther }),
        ...(data.reply?.note && { note })
      },
      data
    )

    patientProgramme.patient.addReply(newReply)

    // Add vaccination if refusal reason is already given
    if (refusalReason === ReplyRefusal.AlreadyVaccinated) {
      const vaccination = Vaccination.create(
        {
          outcome: VaccinationOutcome.AlreadyVaccinated,
          patient_uuid: patientProgramme.patient_uuid,
          programme_id: patientProgramme.programme_id,
          createdBy_uid: account.uid,
          ...(data.reply?.note && { note })
        },
        data
      )

      patientProgramme.patient.recordVaccination(vaccination)
    }

    // Invalidate existing reply
    Reply.update(reply_uuid, { isInvalidated: true }, data)

    // Clean up session data
    delete data.reply

    request.flash('success', __(`reply.withdraw.success`, { reply }))

    return saveAndRedirect(request, response, referrer || reply.uri)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
