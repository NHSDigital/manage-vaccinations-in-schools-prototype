import { ClinicAppointment, ClinicBooking } from '../models.js'

import { camelToKebabCase } from './string.js'

/**
 * Get wizard journey paths and forking details for all appointments in the given clinic booking
 *
 * @param {string} session_preset_slug - URL part that represents the primary programme
 * @param {string} booking_uuid - the ID of the booking we're creating
 * @param {object} sessionData - the request.session.data object
 * @param {Array<ClinicAppointment>} appointments - the appointments whose journeys we're mapping
 * @returns {object} An object containing all relevants page and forks
 */
export const getAllAppointmentPaths = (
  session_preset_slug,
  booking_uuid,
  sessionData,
  appointments
) => {
  if (!appointments?.length) {
    return {}
  }

  const allPaths = appointments.map((appointment) => {
    const appointment_uuid = appointment.uuid
    return {
      // Child details
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/child`]:
        {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/dob`]:
        {},
      ...(appointments[0].uuid !== appointment_uuid &&
      getPreviousAddressItems(appointments).length > 2
        ? {
            [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/address-selection`]:
              {
                [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/parental-relationship`]:
                  () => sessionData.transaction.addressChoice !== 'new'
              }
          }
        : {}),
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/address`]:
        {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/parental-relationship`]:
        {
          [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/parental-responsibility`]:
            {
              data: 'appointment.parentHasParentalResponsibility',
              value: 'false'
            }
        },

      // Appointment-length influences
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/vaccination-choice`]:
        {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/extra-time`]:
        {},

      // Clinic and slot selection
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/preferred-location`]:
        {
          [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-location`]:
            {
              data: 'transaction.preferredLocation',
              value: 'NE12 7ET'
            }
        },
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/preferred-location-matches`]:
        {
          [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/preferred-location`]:
            {
              data: 'transaction.preferredLocation',
              value: 'retry'
            }
        },
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-location`]:
        {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/clinic-date`]:
        {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/appointment-time-range`]:
        {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/appointment-time`]:
        {}
    }
  })

  // Merge all the appointments' paths into a single sequence, preserving order
  return Object.assign({}, ...allPaths)
}

/**
 * Get the path for a single health question
 *
 * @param {string} key
 * @param {import('../models/clinic-appointment.js').ClinicAppointment} appointment
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
 * @param {Array<ClinicAppointment>} appointments - the appointments we're creating
 * @returns {Array<object>} - a set of radio items to display in the address selection page
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
