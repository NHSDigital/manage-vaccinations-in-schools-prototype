import wizard from '@x-govuk/govuk-prototype-wizard'

import { PatientClinicStatus, SessionStatus, SessionType } from '../enums.js'
import { ClinicInvitation, Patient, Programme, Session } from '../models.js'
import {
  getClinicInvitationJourney,
  setClinicInvitationLocals,
  updateClinicInvitation
} from '../utils/clinic-invitation.js'
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { stringToArray } from '../utils/string.js'
import { formatQueryString } from '../utils/url.js'

export const clinicInvitationController = {
  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { data } = request.session

    // Start a new invitation, remembering the filters to return to afterwards
    data.clinicInvitation = {}
    data.clinicInvitationQuery = request.query

    return saveAndRedirect(
      request,
      response,
      `${request.baseUrl}/new/programmes`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readForm(request, response, next) {
    const { view } = request.params
    const { data } = request.session
    const query = /** @type {ParsedQs} */ (data.clinicInvitationQuery) || {}

    const journey = {
      [`/`]: {},
      ...getClinicInvitationJourney('/new', data)
    }

    response.locals.paths = {
      ...wizard(journey, request),
      ...(view === 'programmes' && {
        back: `/patients${formatQueryString(query)}`
      })
    }

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { view } = request.params
    const { data } = request.session
    const { __mf } = response.locals

    if (view !== 'programmes') {
      response.locals.inviteCaption = __mf(
        'patient.bulkInviteToClinic.caption',
        { count: stringToArray(data.clinicPatient_ids).length }
      )
      setClinicInvitationLocals(response, data)

      return response.render(`clinic-invite/${view}`)
    }

    const { programme_id } = /** @type {{ programme_id?: string }} */ (
      data.clinicInvitationQuery || {}
    )
    let clinicPatient_ids = stringToArray(data.clinicPatient_ids)

    const programmes = Programme.findAll(data)
      .filter((programme) => !programme.isHidden)
      .sort((a, b) => a.name.localeCompare(b.name))

    let programme_ids
    if (programme_id) {
      programme_ids = stringToArray(programme_id)
    } else {
      programme_ids = programmes.map(({ id }) => id)
    }
    const invitableProgrammes = programmes.filter((programme) =>
      programme_ids.includes(programme.id)
    )

    // Details required for the intro paragraph
    response.locals.cohortDetails = {
      childrenCount: clinicPatient_ids.length,
      specificProgrammes: !!programme_id,
      programmeCount: programme_ids.length,
      programmeNames: programmeNamesListForSentence(
        programme_ids,
        false,
        ConjunctionType.or,
        data
      )
    }

    // Details required for the programme checkboxes
    const clinicReadyProgrammes = []
    const scheduledSessions = Session.findAll(data)
      .filter(({ type }) => type === SessionType.Clinic)
      .filter(({ status }) => status === SessionStatus.Planned)
    for (const programme of invitableProgrammes) {
      const clinicReadyChildrenCount = clinicPatient_ids
        .map((id) => Patient.findOne(id, data))
        .filter(
          (patient) =>
            patient.programmes[programme.id].clinicStatus ===
            PatientClinicStatus.Ready
        ).length
      if (clinicReadyChildrenCount > 0) {
        const scheduledClinicsCount = scheduledSessions.filter((session) =>
          session.programme_ids.includes(programme.id)
        ).length

        clinicReadyProgrammes.push({
          name: programme.name,
          id: programme.id,
          childrenCount: clinicReadyChildrenCount,
          clinicCount: scheduledClinicsCount
        })
      }
    }
    response.locals.clinicReadyProgrammes = clinicReadyProgrammes

    // Summary information for a warning about programmes without clinics
    const programmesWithoutClinics = clinicReadyProgrammes.filter(
      ({ clinicCount }) => clinicCount === 0
    )
    response.locals.clinicReadyProgrammesWithoutClinics = {
      count: programmesWithoutClinics.length,
      names: programmeNamesListForSentence(
        programmesWithoutClinics.map(({ id }) => id),
        false,
        ConjunctionType.or,
        data
      )
    }

    return response.render('patient/bulk-invite-to-clinic')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { data } = request.session
    const { paths } = response.locals

    updateClinicInvitation(data)

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { data } = request.session
    const { __mf, account } = response.locals

    const query = /** @type {ParsedQs} */ (data.clinicInvitation)
    const clinicInvitation = ClinicInvitation.create(
      { ...query, createdBy_uid: account?.uid },
      data
    )

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

    // Reset the cohort and invitation
    delete data.clinicPatient_ids
    delete data.clinicInvitation
    delete data.clinicInvitationQuery

    // Get back to the filter page as we left it
    const filterUrl = `/patients${formatQueryString(query)}`
    return saveAndRedirect(request, response, filterUrl)
  }
}

/**
 * @import { RequestHandler } from 'express'
 * @import { ParsedQs } from 'qs'
 */
