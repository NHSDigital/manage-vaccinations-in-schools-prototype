import _ from 'lodash'

import {
  LocationSearchType,
  AppointmentAbandonmentReason,
  PatientClinicStatus,
  ReplyDecision,
  ClinicBookingJourneyType
} from '../enums.js'
import {
  ClinicAppointment,
  ClinicBooking,
  Patient,
  Programme,
  Session
} from '../models.js'

import { getBookableClinicSessions } from './clinic-booking.js'
import { getLocationSearchType } from './geolocation.js'
import { camelToKebabCase, stringToArray } from './string.js'

/**
 * Get the MMRV-aware list of programme IDs for which the given patient can be booked into clinic
 *
 * @param {string} patient_uuid - the UUID of the patient being booked in
 * @param {object} context - the context on which models are stored
 * @returns {Array<string>} an array of programme IDs, possibly including 'mmrv'
 */
export const getClinicBookableProgrammeIDs = (patient_uuid, context) => {
  const patient = Patient.findOne(patient_uuid, context)
  if (!patient) {
    return []
  }

  const canOfferMmrv = patient.canBeOfferedMmrv
  const bookableStatuses = [
    PatientClinicStatus.Ready,
    PatientClinicStatus.Invited
  ]

  return Object.values(patient.programmes)
    .filter(
      ({ clinicStatus }) =>
        clinicStatus && bookableStatuses.includes(clinicStatus)
    )
    .map(({ programme_id }) =>
      programme_id === 'mmr' && canOfferMmrv ? 'mmrv' : programme_id
    )
}

/**
 * Get some MMRV-aware information about programmes we can offer in the booking
 *
 * @param {Array<string>} programme_ids - IDs of programmes that can be offered
 * @param {object} context - the context on which models are stored
 * @returns {object} information about programmes to offer
 */
export const getAppointmentProgrammeOptions = (programme_ids, context) => {
  // Strip out mmrv as a programme id, but keep memory of it so we can adapt content
  const offerMmrv = programme_ids.includes('mmrv')
  programme_ids = programme_ids.map((id) => (id === 'mmrv' ? 'mmr' : id))

  // Convert to the actual programme objects
  const programmes = Programme.findAll(context)
    .map((programme) => {
      delete programme.context
      return programme
    })
    .filter(({ id }) => programme_ids.includes(id))

  // Reinstate MMRV if relevant for the booking
  if (offerMmrv) {
    const mmrProgramme = programmes.find(({ id }) => id === 'mmr')
    mmrProgramme.name = 'MMRV'
    mmrProgramme.id = 'mmrv'
    mmrProgramme.information.hint = mmrProgramme.information.hintMmrv
  }

  // Track details of the invite for pages that need to show the invited programmes
  return {
    programmes,
    programmeNames: programmes.map(({ name }) => name),
    eligibleForMmrv: offerMmrv
  }
}

/**
 * Get wizard journey paths and forking details for all appointments in the given clinic booking
 *
 * @param {string} booking_uuid - the ID of the booking we're creating
 * @param {object} sessionData - the request.session.data object
 * @param {Array<ClinicAppointment>} appointments - the appointments whose journeys we're mapping
 * @returns {object} An object containing all relevant pages and forks
 */
export const getAllAppointmentPaths = (
  booking_uuid,
  sessionData,
  appointments
) => {
  if (!appointments?.length) {
    return {}
  }

  const abandonmentReasons = stringToArray(
    sessionData.appointment?.abandonmentReasons
  )

  // Note: the journey data will be unavailable on the confirmation page (which is parent-facing only)
  const journeyType =
    sessionData.journeyData[booking_uuid]?.journeyType ??
    ClinicBookingJourneyType.ParentOnline
  const isParentJourney = journeyType === ClinicBookingJourneyType.ParentOnline
  const isDataMigrationJourney =
    journeyType === ClinicBookingJourneyType.DataMigration

  const pathsPerAppointment = appointments.map((appointment) => {
    const appointment_uuid = appointment.uuid
    return {
      // Find the child (data migration journey only)
      ...(isDataMigrationJourney
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/find-child`]: {}
          }
        : {}),

      // Vaccinations wanted
      [`/${booking_uuid}/new/${appointment_uuid}/programmes`]: {
        [`/${booking_uuid}/new/${appointment_uuid}/availability`]: () => {
          const programme_ids = stringToArray(
            sessionData.appointment?.selected_programme_ids
          )
          return (
            getBookableClinicSessions(
              sessionData,
              programme_ids,
              appointment,
              isParentJourney
            ).length === 0
          )
        }
      },
      ...(sessionData.appointment?.selected_programme_ids?.includes('flu')
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/flu-choice`]: {}
          }
        : {}),
      ...(sessionData.appointment?.fluDecision === ReplyDecision.Given
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/flu-alternative`]: {}
          }
        : {}),
      ...(sessionData.appointment?.selected_programme_ids?.includes('mmr')
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/mmr-alternative`]: {}
          }
        : {}),

      // Ask for additional support needs early during SAIS journey, as it can affect appointment length
      ...(!isParentJourney
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/impairments`]: {},
            [`/${booking_uuid}/new/${appointment_uuid}/adjustments`]: {}
          }
        : {}),

      // Clinic location preference
      ...(appointments[0].uuid !== appointment_uuid &&
      getPreviousSessionItems(appointments, sessionData).length > 2
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/session-selection`]: {
              [`/${booking_uuid}/new/${appointment_uuid}/appointment-time-range`]:
                () => sessionData.journeyData.addressChoice !== 'new'
            }
          }
        : {}),
      ...(!isDataMigrationJourney
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/preferred-location`]: {
              [`/${booking_uuid}/new/${appointment_uuid}/clinic-location`]:
                () => {
                  const searchTerm = sessionData.journeyData.preferredLocation
                  const searchType = getLocationSearchType(searchTerm)
                  switch (searchType) {
                    case LocationSearchType.Postcode:
                    case LocationSearchType.Outcode:
                      sessionData.appointment.preferredPostcode = searchTerm
                      sessionData.journeyData.outOfArea = false
                      return true
                    case LocationSearchType.Place:
                    default:
                      sessionData.journeyData.outOfArea = true
                      return false
                  }
                }
            },
            [`/${booking_uuid}/new/${appointment_uuid}/preferred-location-matches`]:
              {
                [`/${booking_uuid}/new/${appointment_uuid}/preferred-location`]:
                  {
                    data: 'appointment.preferredPostcode',
                    value: 'retry'
                  }
              },
            [`/${booking_uuid}/new/${appointment_uuid}/clinic-distance`]: {}, // only used for place matching path (for demo/test purposes)

            // Session and slot selection
            [`/${booking_uuid}/new/${appointment_uuid}/clinic-location`]: {
              [`/${booking_uuid}/new/${appointment_uuid}/fully-booked`]: () => {
                return (
                  getBookableClinicSessions(
                    sessionData,
                    appointment.selected_programme_ids,
                    appointment,
                    isParentJourney
                  ).length === 0
                )
              }
            },
            [`/${booking_uuid}/new/${appointment_uuid}/clinic-date`]: {
              [`/${booking_uuid}/new/${appointment_uuid}/fully-booked`]: () => {
                return (
                  getBookableClinicSessions(
                    sessionData,
                    appointment.selected_programme_ids,
                    appointment,
                    isParentJourney
                  ).length === 0
                )
              }
            }
          }
        : {}),
      ...(!(
        isDataMigrationJourney &&
        sessionData.journeyData[booking_uuid]?.preselectedSlot
      )
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/appointment-time-range`]:
              {
                [`/${booking_uuid}/new/${appointment_uuid}/fully-booked`]:
                  () => {
                    return (
                      getBookableClinicSessions(
                        sessionData,
                        appointment.selected_programme_ids,
                        appointment,
                        isParentJourney
                      ).length === 0
                    )
                  }
              },
            [`/${booking_uuid}/new/${appointment_uuid}/appointment-time`]: {
              [`/${booking_uuid}/new/${appointment_uuid}/fully-booked`]: () => {
                return (
                  getBookableClinicSessions(
                    sessionData,
                    appointment.selected_programme_ids,
                    appointment,
                    isParentJourney
                  ).length === 0
                )
              },
              [`/${booking_uuid}/new/${appointment_uuid}/contact-selection`]:
                () => {
                  const patient = appointment.patient
                  if (!patient) return false

                  return patient.contacts?.length > 0
                },
              [`/${booking_uuid}/new/${appointment_uuid}/contact`]: () => {
                const patient = appointment.patient
                if (!patient) return false

                return patient.contacts?.length === 0
              }
            }
          }
        : {}),

      // Child details
      ...(isParentJourney
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/child`]: {},
            [`/${booking_uuid}/new/${appointment_uuid}/dob`]: {},
            ...(appointments[0].uuid !== appointment_uuid &&
            getPreviousAddressItems(appointments).length > 2
              ? {
                  [`/${booking_uuid}/new/${appointment_uuid}/address-selection`]:
                    {
                      [`/${booking_uuid}/new/${appointment_uuid}/contact`]:
                        () => sessionData.journeyData.addressChoice !== 'new'
                    }
                }
              : {}),
            [`/${booking_uuid}/new/${appointment_uuid}/address`]: {},
            [`/${booking_uuid}/new/${appointment_uuid}/impairments`]: {},
            [`/${booking_uuid}/new/${appointment_uuid}/adjustments`]: {}
          }
        : {}),

      // Parent contact details
      ...(!isParentJourney
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/contact-selection`]: {}
          }
        : {}),
      [`/${booking_uuid}/new/${appointment_uuid}/contact`]: {
        [`/${booking_uuid}/new/${appointment_uuid}/parental-responsibility`]: {
          data: 'appointment.parentHasParentalResponsibility',
          value: 'false'
        }
      },
      [`/${booking_uuid}/new/${appointment_uuid}/communication-needs`]: {},

      // Check and confirm
      [`/${booking_uuid}/new/${appointment_uuid}/check-answers`]: {
        [`/${booking_uuid}/new/confirmation`]: () =>
          !appointment.isAbandoned && !appointment.patient_uuid,
        [`/${booking_uuid}/new/${appointment_uuid}/thank-you`]: () =>
          appointment.isAbandoned
      },

      // Reporting the lack of a convenient option
      [`/${booking_uuid}/new/${appointment_uuid}/not-convenient`]: {},
      ...(abandonmentReasons?.length > 1
        ? { [`/${booking_uuid}/new/${appointment_uuid}/least-convenient`]: {} }
        : {}),
      ...(abandonmentReasons.includes(AppointmentAbandonmentReason.Distance)
        ? {
            [`/${booking_uuid}/new/${appointment_uuid}/convenient-distance`]: {}
          }
        : {}),
      ...(abandonmentReasons.includes(AppointmentAbandonmentReason.DayOfWeek)
        ? { [`/${booking_uuid}/new/${appointment_uuid}/convenient-days`]: {} }
        : {}),
      ...(abandonmentReasons.includes(AppointmentAbandonmentReason.TimeOfDay)
        ? { [`/${booking_uuid}/new/${appointment_uuid}/convenient-times`]: {} }
        : {}),
      [`/${booking_uuid}/new/${appointment_uuid}/check-feedback`]: {},
      [`/${booking_uuid}/new/${appointment_uuid}/thank-you`]: {}
    }
  })

  // Merge all the appointments' paths into a single sequence, preserving order
  return Object.assign({}, ...pathsPerAppointment)
}

/**
 * Get the path for a single health question
 *
 * @param {string} key
 * @param {ClinicAppointment} appointment
 * @param {string} pathPrefix
 * @returns {string} The full path to the given health question
 */
const getHealthQuestionPath = (key, appointment, pathPrefix) => {
  return `${pathPrefix}${appointment.uuid}/health-question-${camelToKebabCase(key)}`
}

/**
 * Get health question paths for given vaccines
 *
 * @param {string} pathPrefix - Path prefix
 * @param {string} booking_uuid - clinic booking identifier, for access to all appointments
 * @param {object} bookingContext - the data context holding the booking and appointments
 * @param {object} programmeContext - the data context holding the programme and vaccine info
 * @returns {object} Health question paths
 */
export const getHealthQuestionPaths = (
  pathPrefix,
  booking_uuid,
  bookingContext,
  programmeContext
) => {
  const paths = {}

  const booking = ClinicBooking.findOne(booking_uuid, bookingContext)
  if (!booking) {
    return paths
  }

  for (const appointment of booking.appointments) {
    const healthQuestions = Object.entries(
      appointment.getHealthQuestionsForSelectedProgrammes(programmeContext)
    )

    healthQuestions.forEach(([key, question], index) => {
      const questionPath = getHealthQuestionPath(key, appointment, pathPrefix)

      if (question.conditional) {
        const nextQuestion = healthQuestions[index + 1]
        if (nextQuestion) {
          const forkPath = getHealthQuestionPath(
            nextQuestion[0],
            appointment,
            pathPrefix
          )

          paths[questionPath] = {
            [forkPath]: {
              data: `appointment.healthAnswers.${key}.answer`,
              value: 'No'
            }
          }
        } else {
          paths[questionPath] = {}
        }

        // Add paths for conditional sub-questions
        for (const subKey of Object.keys(question.conditional)) {
          const subQuestionPath = getHealthQuestionPath(
            subKey,
            appointment,
            pathPrefix
          )
          paths[subQuestionPath] = {}
        }
      } else {
        paths[questionPath] = {}
      }
    })
    paths[`${pathPrefix}${appointment.uuid}/impairments`] = {}
    paths[`${pathPrefix}${appointment.uuid}/adjustments`] = {}
  }

  return paths
}

/**
 * Get a set of radio items to offer the user when entering address details of
 * the 2nd and subsequent children
 *
 * @param {Array<ClinicAppointment>} appointments - Appointments we’re creating
 * @returns {Array<object>} Set of radio items to display on address selection page
 */
export const getPreviousAddressItems = (appointments) => {
  let previousAddressItems = appointments
    .map(
      (appointment) =>
        appointment.child?.address && {
          text: Object.values(appointment.child.address)
            .filter((string) => string)
            .join(', '),
          value: appointment.uuid
        }
    )
    .filter((item) => item && item.text)
  // Take only copy of each address we've used so far
  previousAddressItems = [
    ...new Map(previousAddressItems.map((item) => [item.text, item])).values()
  ]

  return [
    ...previousAddressItems,
    {
      divider: 'or'
    },
    {
      text: 'Enter a different address',
      value: 'new'
    }
  ]
}

/**
 * Get a set of radio items to offer the user when choosing a clinic for
 * the 2nd and subsequent children
 *
 * @param {Array<ClinicAppointment>} appointments - Appointments we’re creating
 * @param {object} sessionContext - Context on which the sessions are stored
 * @returns {Array<object>} Set of radio items to display on the address selection page
 */
export const getPreviousSessionItems = (appointments, sessionContext) => {
  let previousClinicSessions = appointments
    .map(({ session_id }) => Session.findOne(session_id, sessionContext))
    .filter(Boolean)
  previousClinicSessions = _.uniqBy(previousClinicSessions, 'id')

  let previousClinicSessionItems = previousClinicSessions.map((session) => ({
    text: session.formatted.location,
    value: session.id,
    hint: session.formatted.date
  }))

  return [
    ...previousClinicSessionItems,
    {
      divider: 'or'
    },
    {
      text: 'Choose a different clinic location or date',
      value: 'new'
    }
  ]
}
