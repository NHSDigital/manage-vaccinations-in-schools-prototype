import wizard from '@x-govuk/govuk-prototype-wizard'

import { ClinicType } from '../enums.js'
import { ClinicInvitation, Patient } from '../models.js'
import {
  getOfferedClinicLocals,
  getBulkInviteProgrammeLocals,
  getPatientInviteProgrammeLocals,
  getRestrictedAccessClinics
} from '../utils/clinic-invitation.js'
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { stringToArray } from '../utils/string.js'
import { formatQueryString } from '../utils/url.js'

/**
 * Get the page to return to when leaving a clinic invitation journey
 *
 * @param {object} start - Where the journey was started from
 * @param {Patient} [start.patient] - Child being invited, if inviting a single child
 * @param {School} [start.school] - School whose children are being invited, if inviting a school
 * @param {ParsedQs} [query] - Query string the journey was started with
 * @returns {string} Path of the page to return to
 */
const getReturnUri = ({ patient, school }, query = {}) => {
  // School: back to the school's children
  if (school) {
    return school.uri
  }

  // Single child: back to the programme tab or Child record tab it was started from
  if (patient) {
    return patient.programmes[String(query.programme_id)]?.uri || patient.uri
  }

  // Bulk invite: back to the Children list, filtered as it was
  return `/patients${formatQueryString(query)}`
}

export const clinicInvitationController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { data } = request.session
    const { account, patient } = response.locals

    // When inviting a child from a programme tab, select that programme by default
    const programme_id = String(request.query.programme_id)
    const programme_ids = patient?.clinicReadyProgramme_ids.includes(
      programme_id
    )
      ? [programme_id]
      : []

    // Start a new draft invitation, remembering the query to return to afterwards
    const clinicInvitation = ClinicInvitation.create(
      { createdBy_uid: account?.uid, programme_ids },
      data.wizard
    )
    delete data.clinicInvitation
    data.clinicInvitationQuery = request.query

    return saveAndRedirect(
      request,
      response,
      `${request.baseUrl}/${clinicInvitation.id}/new/programmes`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readForm(request, response, next) {
    const { invite_id, view } = request.params
    const { data } = request.session
    const returnUri = getReturnUri(response.locals, data.clinicInvitationQuery)

    // Drafts don't survive a restart of the prototype, so start again if it's gone
    const draft = ClinicInvitation.findOne(invite_id, data.wizard)
    if (!draft) {
      return response.redirect(returnUri)
    }
    response.locals.clinicInvitation = new ClinicInvitation(draft, data)

    // Forks are evaluated before `updateForm` saves the posted answers to the draft,
    // so they use the answers auto-stored in `data.clinicInvitation`
    const journey = {
      [`/`]: {},
      [`/${invite_id}/new/programmes`]: {
        // Skip the clinic type questions if there are no restricted clinics to offer
        [`/${invite_id}/new/check-answers`]: () =>
          getRestrictedAccessClinics(
            stringToArray(data.clinicInvitation?.programme_ids),
            data
          ).length === 0
      },
      [`/${invite_id}/new/clinic-types`]: {
        [`/${invite_id}/new/check-answers`]: {
          data: 'clinicInvitation.clinicTypes',
          excludedValue: ClinicType.Restricted
        }
      },
      [`/${invite_id}/new/restricted-clinics`]: {},
      [`/${invite_id}/new/check-answers`]: {}
    }

    response.locals.paths = {
      ...wizard(journey, request),
      ...(view === 'programmes' && { back: returnUri })
    }

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { view } = request.params
    const { data } = request.session
    const { __mf, clinicInvitation, patient, school } = response.locals
    const clinicPatient_ids = stringToArray(data.clinicPatient_ids)

    // Programmes page for a single child
    if (view === 'programmes' && patient) {
      Object.assign(response.locals, getPatientInviteProgrammeLocals(patient))

      return response.render('patient/invite-to-clinic/programmes')
    }

    // Programmes page for a school
    if (view === 'programmes' && school) {
      return response.render('school/invite-to-clinic/programmes')
    }

    // Programmes page for a bulk invite
    if (view === 'programmes') {
      const { programme_id } = data.clinicInvitationQuery || {}
      Object.assign(
        response.locals,
        getBulkInviteProgrammeLocals(clinicPatient_ids, programme_id, data)
      )

      return response.render('patient/invite-to-clinic/bulk-programmes')
    }

    // Pages shared by every invite journey
    response.locals.inviteCaption =
      school?.name ||
      patient?.fullName ||
      __mf('patient.bulkInviteToClinic.caption', {
        count: clinicPatient_ids.length
      })
    Object.assign(
      response.locals,
      getOfferedClinicLocals(clinicInvitation.programme_ids, data)
    )

    return response.render(`clinic-invite/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { invite_id } = request.params
    const { data } = request.session
    const { paths } = response.locals

    // Apply the posted answers to the draft
    const clinicInvitation = new ClinicInvitation(
      {
        ...response.locals.clinicInvitation,
        ...request.body.clinicInvitation
      },
      data
    )

    // Remove answers made stale by a change to an earlier answer
    const availableClinic_ids = getRestrictedAccessClinics(
      clinicInvitation.programme_ids,
      data
    ).map(({ id }) => id)

    let { clinicTypes, restrictedClinic_ids } = clinicInvitation

    // Can only offer open clinics if no restricted clinics are available
    if (availableClinic_ids.length === 0) {
      clinicTypes = [ClinicType.Open]
    }

    // Only keep restricted clinics that are offered and that serve the programmes
    restrictedClinic_ids = clinicTypes.includes(ClinicType.Restricted)
      ? restrictedClinic_ids.filter((id) => availableClinic_ids.includes(id))
      : []

    ClinicInvitation.update(
      invite_id,
      {
        programme_ids: clinicInvitation.programme_ids,
        clinicTypes,
        restrictedClinic_ids
      },
      data.wizard
    )

    // Pre-fill answers from the draft rather than from auto-stored session data
    delete data.clinicInvitation

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { invite_id } = request.params
    const { data } = request.session
    const { __, __mf, patient, school } = response.locals

    // Move the draft invitation out of the wizard
    const clinicInvitation = ClinicInvitation.create(
      response.locals.clinicInvitation,
      data
    )
    ClinicInvitation.delete(invite_id, data.wizard)

    const returnUri = getReturnUri(response.locals, data.clinicInvitationQuery)

    // Reset the invitation and the query it was started with
    delete data.clinicInvitation
    delete data.clinicInvitationQuery

    // Invite a single child
    if (patient) {
      // Send comms to contacts and record in audit trail
      patient.inviteToClinic(clinicInvitation.programme_ids)
      Patient.update(patient.uuid, patient, data)

      // Report the success
      request.flash(
        'success',
        __('patient.inviteToClinic.success', {
          patientName: patient.firstName,
          selectedProgrammes: programmeNamesListForSentence(
            clinicInvitation.programme_ids,
            patient.canBeOfferedMmrv,
            ConjunctionType.and,
            data
          )
        })
      )

      return saveAndRedirect(request, response, returnUri)
    }

    // Invite all the children at a school
    if (school) {
      for (const patient of school.patients) {
        // TODO: only invite each child for the programmes that make sense for them
        patient.inviteToClinic(clinicInvitation.programme_ids)
        Patient.update(patient.uuid, patient, data)
      }

      request.flash(
        'success',
        __mf('school.inviteToClinic.success', {
          count: school.patients.length
        })
      )

      return saveAndRedirect(request, response, returnUri)
    }

    // Invite the cohort of children for a bulk invite
    const clinicPatient_ids = stringToArray(data.clinicPatient_ids)
    const clinicProgramme_ids = clinicInvitation.programme_ids

    // Invite each of the children to clinic for the subset of the selected programmes
    // that make sense for that child
    let invitedChildrenCount = 0
    let notInvitedChildrenCount = 0
    for (const patient of clinicPatient_ids.map((id) =>
      Patient.findOne(id, data)
    )) {
      // Work out which of the selected programmes this patient was clinic-ready for
      const { clinicReadyProgramme_ids } = patient
      if (!patient.hasContactDetails) {
        notInvitedChildrenCount++
        continue
      }

      const invitedProgramme_ids = [
        ...new Set(clinicReadyProgramme_ids).intersection(
          new Set(clinicProgramme_ids)
        )
      ]

      if (invitedProgramme_ids.length) {
        // Send comms to contacts and record in audit trail
        patient.inviteToClinic(invitedProgramme_ids)
        Patient.update(patient.uuid, patient, data)

        invitedChildrenCount++
      }
    }

    // Report success (or otherwise)
    const details = [
      invitedChildrenCount > 0 &&
        __mf('patient.bulkInviteToClinic.success.invited', {
          count: invitedChildrenCount
        }),
      notInvitedChildrenCount > 0 &&
        __mf('patient.bulkInviteToClinic.success.notInvited', {
          count: notInvitedChildrenCount
        })
    ].filter(Boolean)
    const messageType = invitedChildrenCount > 0 ? 'success' : 'message'
    request.flash(messageType, details.join('<br>'))

    // Reset the cohort
    delete data.clinicPatient_ids

    return saveAndRedirect(request, response, returnUri)
  }
}

/**
 * @import { RequestHandler } from 'express'
 * @import { ParsedQs } from 'qs'
 * @import { School } from '../models.js'
 */
