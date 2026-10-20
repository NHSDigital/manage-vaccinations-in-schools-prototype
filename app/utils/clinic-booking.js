import _ from 'lodash'

import programmesData from '../datasets/programmes.js'
import {
  ClinicBookingJourneyType,
  ClinicType,
  SessionPresets,
  SessionStatus,
  SessionType
} from '../enums.js'
import { ClinicAppointment, ClinicInvitation, Session } from '../models.js'

import { compareByAudienceThenDate } from './clinic-invitation.js'
import i18n from './i18n.js'
import { stringToArray, stringToBoolean } from './string.js'

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
 * @typedef {object} OfferedClinics
 * @property {Array<string>} clinicTypes - the types of clinic that can be booked (`ClinicType` values)
 * @property {Array<string>} restrictedClinic_ids - the restricted invitation clinics that can be booked
 */

/**
 * Get the clinics that a parent's booking link lets them book
 *
 * Without an invitation (e.g. from the prototype homepage), or one that offers no clinic types, parents
 * can book open clinics only.
 *
 * @param {string|undefined} invitation_id - the invitation the parent's booking link came from (if any)
 * @param {object} context - the data context holding the invitations
 * @returns {OfferedClinics} the clinics the parent can book
 */
export const getOfferedClinicsForInvitation = (invitation_id, context) => {
  const clinicInvitation = invitation_id
    ? ClinicInvitation.findOne(invitation_id, context)
    : undefined

  return {
    clinicTypes: clinicInvitation?.clinicTypes.length
      ? clinicInvitation.clinicTypes
      : [ClinicType.Open],
    restrictedClinic_ids: clinicInvitation?.restrictedClinic_ids ?? []
  }
}

/**
 * Get the clinics that can be booked for a booking
 *
 * Parents can book the clinics their invitation offers. When booking from the child record, the team can book open
 * clinics and any restricted invitation clinics they chose to offer. Otherwise, any clinic can be booked.
 *
 * @param {object} context - the data context holding the journey data and invitations
 * @param {string} booking_uuid - the booking being made
 * @returns {OfferedClinics|undefined} the clinics that can be booked, or undefined if any clinic can be
 */
export const getOfferedClinics = (context, booking_uuid) => {
  const journeyData = context.journeyData?.[booking_uuid]
  const journeyType =
    journeyData?.journeyType ?? ClinicBookingJourneyType.ParentOnline

  switch (journeyType) {
    case ClinicBookingJourneyType.ParentOnline:
      return getOfferedClinicsForInvitation(journeyData?.invitation_id, context)
    case ClinicBookingJourneyType.PhoneBooking: {
      // Until the team's been asked about restricted invitation clinics, don't rule any out
      const offerRestrictedClinics = stringToBoolean(
        journeyData.offerRestrictedClinics
      )
      if (offerRestrictedClinics === undefined) {
        return undefined
      }

      const restrictedClinic_ids = offerRestrictedClinics
        ? stringToArray(journeyData.restrictedClinic_ids)
        : []

      return {
        clinicTypes: restrictedClinic_ids.length
          ? [ClinicType.Open, ClinicType.Restricted]
          : [ClinicType.Open],
        restrictedClinic_ids
      }
    }
    default:
      // Doesn't make sense for bookings started from a specific session
      return undefined
  }
}

/**
 * Can the given clinic session be booked, based on the clinics offered?
 *
 * @param {Session} session - the clinic session to check
 * @param {OfferedClinics} offeredClinics - the clinics that can be booked
 * @returns {boolean} true if the session can be booked
 */
const isClinicOffered = (session, { clinicTypes, restrictedClinic_ids }) =>
  session.clinicType === ClinicType.Restricted
    ? clinicTypes.includes(ClinicType.Restricted) &&
      restrictedClinic_ids.includes(session.id)
    : clinicTypes.includes(ClinicType.Open)

/**
 * Get a list of clinic sessions serving any of the given programmes and that are open to booking
 *
 * When called with a null or undefined appointment, we're only checking to see whether the
 * right programmes are being served, not checking for enough space for a specific appointment.
 *
 * @param {object} context - the data context for the models to check
 * @param {ClinicVaccinationChoices} vaccinationChoices - the programmes and vaccines wanted
 * @param {object} [options] - Options
 * @param {boolean} [options.extendForSupportNeeds] - should we look for space for an extended appointment?
 * @param {boolean} [options.isParentBooking] - does the booking need an earlier cut-off, to allow time for stock planning?
 * @param {OfferedClinics} [options.offeredClinics] - limits which clinics can be booked (see `getOfferedClinics`)
 * @param {string} [options.ignoredAppointment_uuid] - an appointment whose slots should count as free, e.g. while it's being moved
 * @returns {Array<Session>} the list of sessions open to booking serving the given programmes
 */
export const getBookableClinicSessions = (
  context,
  vaccinationChoices,
  {
    extendForSupportNeeds = false,
    isParentBooking = false,
    offeredClinics = undefined,
    ignoredAppointment_uuid = undefined
  } = {}
) => {
  const scheduledClinics = Session.findAll(context).filter(
    (session) =>
      session.type === SessionType.Clinic &&
      session.status === SessionStatus.Planned &&
      (!offeredClinics || isClinicOffered(session, offeredClinics)) &&
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
 * Get the restricted invitation clinics the team could offer when booking an appointment from the child record
 *
 * @param {object} context - the data context for the models to check
 * @param {ClinicAppointment} appointment - the appointment being booked
 * @returns {Array<Session>} restricted invitation clinic sessions with space for the appointment, sorted by audience
 *   then date
 */
export const getOfferableRestrictedClinics = (context, appointment) => {
  return getBookableClinicSessions(context, appointment.vaccinationChoices, {
    extendForSupportNeeds: stringToBoolean(
      context.journeyData.extendForSupportNeeds
    ),
    ignoredAppointment_uuid: appointment.uuid
  })
    .filter(({ clinicType }) => clinicType === ClinicType.Restricted)
    .sort(compareByAudienceThenDate)
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
 * @returns {Array<object>} Set of radio buttons to present to the user
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
  const offeredClinics = getOfferedClinics(context, appointment.booking_uuid)
  const scheduledClinics = getBookableClinicSessions(
    context,
    appointment.vaccinationChoices,
    {
      extendForSupportNeeds,
      isParentBooking,
      offeredClinics,
      ignoredAppointment_uuid: appointment.uuid
    }
  )

  // Show a location's restricted invitation clinics separately from its open ones
  const sessionsByLocation = _.groupBy(scheduledClinics, (session) => {
    if (!offeredClinics) {
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
    getBookableClinicSessions(context, vaccinationChoices, {
      extendForSupportNeeds,
      isParentBooking,
      offeredClinics: getOfferedClinics(context, appointment.booking_uuid),
      ignoredAppointment_uuid: appointment.uuid
    })
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
