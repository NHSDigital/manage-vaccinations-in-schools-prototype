import { ClinicType, SessionType } from '../enums.js'
import { ClinicInvitation, Session } from '../models.js'

import { ConjunctionType, programmeNamesListForSentence } from './programme.js'
import { stringToArray } from './string.js'

/**
 * Get planned clinic sessions that can be offered in a clinic invitation
 *
 * @param {object} context - the data context holding the sessions
 * @returns {Array<Session>} Planned clinic sessions, excluding drop-in clinics
 */
const getInvitableClinics = (context) =>
  Session.findAll(context)
    .filter(({ type }) => type === SessionType.Clinic)
    .filter(({ isPlanned }) => isPlanned)
    .filter(({ clinicType }) => clinicType !== ClinicType.DropIn)

/**
 * Get open clinic sessions serving any of the given programmes
 *
 * Clinics created before clinic types existed are treated as open.
 *
 * @param {Array<string>} programme_ids - Programmes being invited for
 * @param {object} context - the data context holding the sessions
 * @returns {Array<Session>} Open-to-all clinic sessions
 */
export const getOpenAccessClinics = (programme_ids, context) =>
  getInvitableClinics(context)
    .filter(({ clinicType }) => clinicType !== ClinicType.Restricted)
    .filter((session) =>
      programme_ids.some((id) => session.programme_ids.includes(id))
    )

/**
 * Get restricted invitation clinic sessions serving all of the given programmes
 *
 * Sorted by audience, then date, so that clinics for the same audience are listed together.
 *
 * @param {Array<string>} programme_ids - Programmes being invited for
 * @param {object} context - the data context holding the sessions
 * @returns {Array<Session>} Restricted-invitation clinic sessions that match the given programmes
 */
export const getRestrictedAccessClinics = (programme_ids, context) =>
  getInvitableClinics(context)
    .filter(({ clinicType }) => clinicType === ClinicType.Restricted)
    .filter((session) =>
      programme_ids.every((id) => session.programme_ids.includes(id))
    )
    .sort(
      (a, b) =>
        (a.clinicAudience || '').localeCompare(b.clinicAudience || '') ||
        new Date(a.date).getTime() - new Date(b.date).getTime()
    )

/**
 * Get the pages that follow a journey’s programmes page in a clinic invitation journey
 *
 * @param {string} basePath - Path of the journey (e.g. `/invite-to-clinic`)
 * @param {object} data - Session data, holding the in-progress `clinicInvitation`
 * @returns {object} Wizard journey from the programmes page to check answers
 */
export const getClinicInvitationJourney = (basePath, data) => {
  const restrictedClinicsAvailable = () =>
    getRestrictedAccessClinics(
      stringToArray(data.clinicInvitation?.programme_ids),
      data
    ).length > 0

  return {
    [`${basePath}/programmes`]: {
      [`${basePath}/check-answers`]: () => !restrictedClinicsAvailable()
    },
    [`${basePath}/clinic-types`]: {
      [`${basePath}/check-answers`]: {
        data: 'clinicInvitation.clinicTypes',
        excludedValue: ClinicType.Restricted
      }
    },
    [`${basePath}/restricted-clinics`]: {},
    [`${basePath}/check-answers`]: {}
  }
}

/**
 * Remove answers made stale by a change to an earlier answer
 *
 * Call after each page of the journey is posted (and auto-stored).
 *
 * @param {object} data - Session data, holding the in-progress `clinicInvitation`
 */
export const updateClinicInvitation = (data) => {
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
}

/**
 * Set the locals needed by the shared clinic invitation pages
 *
 * @param {object} response - Express response
 * @param {object} data - Session data, holding the in-progress `clinicInvitation`
 */
export const setClinicInvitationLocals = (response, data) => {
  const clinicInvitation = new ClinicInvitation(data.clinicInvitation, data)
  const { programme_ids } = clinicInvitation

  const restrictedClinics = getRestrictedAccessClinics(programme_ids, data)

  response.locals.clinicInvitation = clinicInvitation
  response.locals.areRestrictedClinicsAvailable = restrictedClinics.length > 0
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
  response.locals.restrictedClinicItems = restrictedClinics.map((session) => ({
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
  }))
}
