import _ from 'lodash'

import {
  ClinicType,
  PatientClinicStatus,
  SessionStatus,
  SessionType
} from '../enums.js'
import { Patient, Programme, Session } from '../models.js'

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
 * Get the details needed to offer the clinics serving an invitation’s programmes
 *
 * Used by the clinic type, restricted clinic and check answers pages shared by every invite journey.
 *
 * @param {Array<string>} programme_ids - Programmes being invited for
 * @param {object} context - the data context holding the sessions
 * @returns {object} Values that can be merged into response.locals
 */
export const getOfferedClinicLocals = (programme_ids, context) => {
  const restrictedClinics = getRestrictedAccessClinics(programme_ids, context)

  return {
    areRestrictedClinicsAvailable: restrictedClinics.length > 0,
    openClinicCount: getOpenAccessClinics(programme_ids, context).length,
    restrictedClinicCount: restrictedClinics.length,
    programmeNames: programmeNamesListForSentence(
      programme_ids,
      false,
      ConjunctionType.or,
      context
    ),
    restrictedClinicItems: restrictedClinics.map((session) => ({
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
}

/**
 * Get the programmes a single child can be invited to clinic for, as required by programme selection pages
 *
 * @param {Patient} patient - Child being invited
 * @returns {object} Values that can be merged into response.locals
 */
export const getPatientInviteProgrammeLocals = (patient) => {
  // Order the clinic-ready programmes alphabetically
  const clinicReadyProgrammes = Object.values(patient.programmes)
    .filter(({ clinicStatus }) => clinicStatus === PatientClinicStatus.Ready)
    .sort((a, b) => a.programme_id.localeCompare(b.programme_id))

  // Warn about inviting to any programmes that don't have clinics scheduled
  const programmesWithoutClinics = clinicReadyProgrammes.filter(
    (patientProgramme) => patientProgramme.scheduledClinicsCount === 0
  )
  const formatter = new Intl.ListFormat('en', {
    style: 'long',
    type: 'disjunction'
  })

  return {
    clinicReadyProgrammes,
    clinicReadyProgrammesWithoutClinics: {
      count: programmesWithoutClinics.length,
      names: formatter.format(
        programmesWithoutClinics.map(({ programme }) =>
          programme.name.replace('Flu', 'flu')
        )
      )
    }
  }
}

/**
 * Get the programmes a cohort of children can be invited to clinic for, as required by programme selection page
 *
 * @param {Array<string>} clinicPatient_ids - Children being invited
 * @param {string|Array<string>|undefined} programme_id - Programmes the Children list was filtered by, if any
 * @param {object} context - the data context holding the children, programmes and sessions
 * @returns {object} Values that can be merged into response.locals
 */
export const getBulkInviteProgrammeLocals = (
  clinicPatient_ids,
  programme_id,
  context
) => {
  const programmes = Programme.findAll(context)
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
  const cohortDetails = {
    childrenCount: clinicPatient_ids.length,
    specificProgrammes: !!programme_id,
    programmeCount: programme_ids.length,
    programmeNames: programmeNamesListForSentence(
      programme_ids,
      false,
      ConjunctionType.or,
      context
    )
  }

  // Details required for the programme checkboxes
  const clinicReadyProgrammes = []
  const scheduledSessions = Session.findAll(context)
    .filter(({ type }) => type === SessionType.Clinic)
    .filter(({ status }) => status === SessionStatus.Planned)
  for (const programme of invitableProgrammes) {
    const clinicReadyChildrenCount = clinicPatient_ids
      .map((id) => Patient.findOne(id, context))
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

  // Summary information for a warning about programmes without clinics
  const programmesWithoutClinics = clinicReadyProgrammes.filter(
    ({ clinicCount }) => clinicCount === 0
  )

  return {
    cohortDetails,
    clinicReadyProgrammes,
    clinicReadyProgrammesWithoutClinics: {
      count: programmesWithoutClinics.length,
      names: programmeNamesListForSentence(
        programmesWithoutClinics.map(({ id }) => id),
        false,
        ConjunctionType.or,
        context
      )
    }
  }
}

/**
 * Get the programmes that a booking link can be shared for
 *
 * @param {object} context - the data context holding the programmes and sessions
 * @returns {object} Programmes, with how many clinics are scheduled for each
 */
export const getBookingLinkProgrammeLocals = (context) => {
  const scheduledClinics = Session.findAll(context)
    .filter(({ type }) => type === SessionType.Clinic)
    .filter(({ status }) => status === SessionStatus.Planned)
  const scheduledProgrammes = scheduledClinics.flatMap(
    ({ programme_ids }) => programme_ids
  )
  const programmeFrequencyMap = _.countBy(scheduledProgrammes)

  // Offer even those programmes with no clinics scheduled
  const allProgrammes = Programme.findAll(context).filter(
    (programme) => !programme.isHidden
  )
  allProgrammes.forEach((programme) => {
    if (!programmeFrequencyMap[programme.id]) {
      programmeFrequencyMap[programme.id] = 0
    }
  })

  const bookingLinkProgrammes = Object.entries(programmeFrequencyMap)
    .map(([programme_id, clinicCount]) => ({
      id: programme_id,
      name: Programme.findOne(programme_id, context)?.name,
      clinicCount
    }))
    .sort((a, b) => a.name.localeCompare(b.name))

  return {
    bookingLinkProgrammes
  }
}
