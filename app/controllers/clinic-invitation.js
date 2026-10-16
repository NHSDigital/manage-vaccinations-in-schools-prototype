import wizard from '@x-govuk/govuk-prototype-wizard'

import {
  ClinicType,
  PatientClinicStatus,
  SessionStatus,
  SessionType
} from '../enums.js'
import { ClinicInvitation, Patient, Programme, Session } from '../models.js'
import {
  getOpenAccessClinics,
  getRestrictedAccessClinics
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
    const query = data.clinicInvitationQuery || {}

    const clinicInvitation = new ClinicInvitation(data.clinicInvitation, data)

    const journey = {
      [`/`]: {},
      [`/new/programmes`]: {
        // Skip the clinic type questions if there are no restricted clinics to offer
        [`/new/check-answers`]: () =>
          getRestrictedAccessClinics(clinicInvitation.programme_ids, data)
            .length === 0
      },
      [`/new/clinic-types`]: {
        [`/new/check-answers`]: {
          data: 'clinicInvitation.clinicTypes',
          excludedValue: ClinicType.Restricted
        }
      },
      [`/new/restricted-clinics`]: {},
      [`/new/check-answers`]: {}
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

      const clinicInvitation = new ClinicInvitation(data.clinicInvitation, data)
      const { programme_ids } = clinicInvitation
      const restrictedClinics = getRestrictedAccessClinics(programme_ids, data)

      response.locals.clinicInvitation = clinicInvitation
      response.locals.areRestrictedClinicsAvailable =
        restrictedClinics.length > 0
      response.locals.openClinicCount = getOpenAccessClinics(
        programme_ids,
        data
      ).length
      response.locals.restrictedClinicCount = restrictedClinics.length
      response.locals.programmeNames = programmeNamesListForSentence(
        programme_ids,
        false,
        ConjunctionType.or,
        data
      )
      response.locals.restrictedClinicItems = restrictedClinics.map(
        (session) => ({
          text: session.clinic?.formatted.location,
          value: session.id,
          hint: {
            html: [
              `Date: ${session.formatted.dateShort}`,
              session.clinicAudience && `Audience: ${session.clinicAudience}`
            ]
              .filter(Boolean)
              .join('<br>')
          }
        })
      )

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

    // Remove answers made stale by a change to an earlier answer
    const clinicInvitation = new ClinicInvitation(data.clinicInvitation, data)
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

    data.clinicInvitation = {
      ...data.clinicInvitation,
      clinicTypes,
      restrictedClinic_ids
    }

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { data } = request.session
    const { __mf, account } = response.locals

    const clinicInvitation = ClinicInvitation.create(
      { ...data.clinicInvitation, createdBy_uid: account?.uid },
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

    const query = data.clinicInvitationQuery

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
 */
