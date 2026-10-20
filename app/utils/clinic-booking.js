import _ from 'lodash'

import programmesData from '../datasets/programmes.js'
import {
  ClinicType,
  SessionPresets,
  SessionStatus,
  SessionType
} from '../enums.js'
import { ClinicAppointment, ClinicInvitation, Session } from '../models.js'

import i18n from './i18n.js'
import { stringToBoolean } from './string.js'

/**
 * Generate a URL to book into a clinic for vaccination in the given presets' programmes
 *
 * @param {Array<string>} sessionPresetNames - the presets for which the child has been invited to clinic
 * @returns {string} Path to start of clinic booking journey for given programme
 */
export const getClinicInviteUrlForPresets = (sessionPresetNames) => {
  const sessionPresets = SessionPresets.filter((preset) =>
    sessionPresetNames.includes(preset.name)
  )
  const programme_ids = sessionPresets.flatMap((preset) =>
    preset.programmeTypes.map((type) => programmesData[type].id)
  )

  return getClinicInviteUrlForProgrammes(programme_ids)
}

/**
 * Generate a URL to book into a clinic for vaccination in the given programmes
 *
 * @param {Array<string>} programme_ids - Programmes for which child has been invited to clinic
 * @returns {string} Path to start of clinic booking journey for given programme
 */
export const getClinicInviteUrlForProgrammes = (programme_ids) => {
  const searchParams = new URLSearchParams()
  for (const programme_id of programme_ids) {
    searchParams.append('programme_id', programme_id)
  }

  return `/book-into-a-clinic/?${searchParams.toString()}`
}

/**
 * Can a parent book into the given clinic session, based on the invitation they were sent (if any)?
 *
 * Without an invitation, or one that offers no clinic types, parents can book open clinics only.
 *
 * @param {Session} session - the clinic session to check
 * @param {ClinicInvitation} [clinicInvitation] - the invitation the parent's booking link came from
 * @returns {boolean} true if the parent can book into the session
 */
const isClinicOfferedToParent = (session, clinicInvitation) => {
  const clinicTypes = clinicInvitation?.clinicTypes.length
    ? clinicInvitation.clinicTypes
    : [ClinicType.Open]

  if (session.clinicType === ClinicType.Restricted) {
    return (
      clinicTypes.includes(ClinicType.Restricted) &&
      clinicInvitation.restrictedClinic_ids.includes(session.id)
    )
  }

  return clinicTypes.includes(ClinicType.Open)
}

/**
 * Get a list of clinic sessions serving any of the given programmes and that are open to booking
 *
 * When called with a null or undefined appointment, we're only checking to see whether the
 * right programmes are being served, not checking for enough space for a specific appointment.
 *
 * @param {object} context - the data context for the models to check
 * @param {ClinicVaccinationChoices} vaccinationChoices - the programmes and vaccines wanted
 * @param {boolean} extendForSupportNeeds - should we look for space for an extended appointment?
 * @param {boolean} isParentBooking - needs earlier cut-off and affects visibility of restricted clinics
 * @param {string} [invitation_id] - the invitation a parent's booking link came from, which limits the clinics they can book
 * @param {string} [ignoredAppointment_uuid] - an appointment whose slots should count as free, e.g. while it's being moved
 * @returns {Array<Session>} the list of sessions open to booking serving the given programmes
 */
export const getBookableClinicSessions = (
  context,
  vaccinationChoices,
  extendForSupportNeeds,
  isParentBooking,
  invitation_id = undefined,
  ignoredAppointment_uuid = undefined
) => {
  const clinicInvitation = invitation_id
    ? ClinicInvitation.findOne(invitation_id, context)
    : undefined

  const scheduledClinics = Session.findAll(context).filter(
    (session) =>
      session.type === SessionType.Clinic &&
      session.status === SessionStatus.Planned &&
      (!isParentBooking ||
        isClinicOfferedToParent(session, clinicInvitation)) &&
      session.canCoverVaccinationChoices(vaccinationChoices) &&
      session.daysLeftToBook >= (isParentBooking ? 1 : 0) &&
      session.bookableStartTimesForVaccinationChoices(
        vaccinationChoices,
        extendForSupportNeeds,
        ignoredAppointment_uuid
      ).length > 0
  )

  return scheduledClinics
}

/**
 * Get the details of the clinic location the user chose
 *
 * @param {string} clinicLocation - the value of the chosen clinic location option
 * @returns {{ clinic_id: string, isInvited: boolean|undefined }} the location's ID and whether its restricted
 *   invitation clinics (true) or its open ones (false) were chosen, or undefined if all of its clinics were
 */
export const parseClinicLocation = (clinicLocation) => {
  const [clinic_id, clinicGroup] = String(clinicLocation).split(':')

  return {
    clinic_id,
    isInvited: clinicGroup ? clinicGroup === 'invited' : undefined
  }
}

/**
 * Get the clinic location options to present to the user
 *
 * @param {object} context - Data context for the models to check
 * @param {ClinicAppointment} appointment - The appointment that we want to book into a clinic
 * @param {boolean} isParentBooking - is a parent booking for themselves, rather than the team booking for them?
 * @param {boolean|undefined} isFakeOutOfArea - Flag to say whether to pretend all clinics are a long way away
 * @returns {Array<object>} Set of radio buttons to present to the user, one per location (or, for parents, one per
 *   location's restricted invitation clinics and one per its open clinics), with `isInvited` set on the former
 */
export const getBookableClinicLocationItems = (
  context,
  appointment,
  isParentBooking,
  isFakeOutOfArea
) => {
  const extendForSupportNeeds = stringToBoolean(
    context.journeyData.extendForSupportNeeds
  )
  const scheduledClinics = getBookableClinicSessions(
    context,
    appointment.vaccinationChoices,
    extendForSupportNeeds,
    isParentBooking,
    context.journeyData[appointment.booking_uuid]?.invitation_id,
    appointment.uuid
  )

  // Show a location's restricted invitation clinics separately from its open ones
  const sessionsByLocation = _.groupBy(scheduledClinics, (session) => {
    if (!isParentBooking) {
      return session.clinic_id
    }

    const clinicGroup =
      session.clinicType === ClinicType.Restricted ? 'invited' : 'open'
    return `${session.clinic_id}:${clinicGroup}`
  })

  // If we show the same location for restricted and open clinics, make sure its faked distance
  // is the same in both lists
  const distancesToClinics = {}
  const clinicLocationItems = []
  let distanceToClinic = isFakeOutOfArea ? 100.5 : 0.5
  Object.entries(sessionsByLocation).forEach(([clinicLocation, sessions]) => {
    const { clinic_id, isInvited } = parseClinicLocation(clinicLocation)
    const firstSession = sessions.reduce((earliest, current) => {
      return current.date < earliest.date ? current : earliest
    })

    if (!distancesToClinics[clinic_id]) {
      distancesToClinics[clinic_id] = distanceToClinic
      distanceToClinic += 2.1
    }

    clinicLocationItems.push({
      text: sessions[0].formatted.location,
      value: clinicLocation,
      hint: `${distancesToClinics[clinic_id].toFixed(1)} miles away, next date is ${firstSession.formatted.date}`,
      isInvited: !!isInvited
    })
  })

  return clinicLocationItems
}

/**
 * Get the clinic date options to present to the user
 *
 * @param {object} context - Data context for the models to check
 * @param {string} clinicLocation - the chosen clinic location option (see `parseClinicLocation`)
 * @param {ClinicAppointment} appointment - The appointment that we want to book into a clinic
 * @param {boolean} isParentBooking - is a parent booking for themselves, rather than the team booking for them?
 * @returns {Array<object>} Set of radio buttons to present to the user, one per date
 */
export const getBookableClinicDateItems = (
  context,
  clinicLocation,
  appointment,
  isParentBooking
) => {
  const { clinic_id, isInvited } = parseClinicLocation(clinicLocation)
  const vaccinationChoices = appointment.vaccinationChoices
  const extendForSupportNeeds = context.journeyData.extendForSupportNeeds
  const bookableSessions = _.sortBy(
    getBookableClinicSessions(
      context,
      vaccinationChoices,
      extendForSupportNeeds,
      isParentBooking,
      context.journeyData[appointment.booking_uuid]?.invitation_id,
      appointment.uuid
    )
      .filter((session) => session.clinic_id === clinic_id)
      .filter(
        (session) =>
          isInvited === undefined ||
          (session.clinicType === ClinicType.Restricted) === isInvited
      ),
    'date'
  )

  const clinicDateItems = []
  bookableSessions.forEach((session) => {
    const midday = new Date(session.date)

    const availableTimes = session.bookableStartTimesForVaccinationChoices(
      vaccinationChoices,
      extendForSupportNeeds,
      appointment.uuid
    )
    const morningAvailable = availableTimes.some((time) => time < midday)
    const afternoonAvailable = availableTimes.some((time) => time >= midday)
    const availability =
      morningAvailable && afternoonAvailable
        ? i18n.__('clinicBooking.clinicDate.hint.both')
        : morningAvailable
          ? i18n.__('clinicBooking.clinicDate.hint.morning')
          : i18n.__('clinicBooking.clinicDate.hint.afternoon')

    clinicDateItems.push({
      text: session.formatted.date,
      value: session.id,
      hint: availability
    })
  })

  return clinicDateItems
}

/**
 * @import { ClinicVaccinationChoices } from '../models.js'
 */
