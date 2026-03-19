import { camelToKebabCase } from './string.js'

/**
 * Get wizard journey paths and forking details for all appointments in the given clinic booking
 *
 * @param {ClinicBooking} booking - the clinic booking whose appointment journeys we're mapping
 * @returns {object} An object containing all relevants page and forks
 */
export const getAllAppointmentPaths = (booking) => {
  const booking_uuid = booking.uuid
  const session_preset_slug = booking.sessionPreset.slug

  const allPaths = booking.appointments_ids.map((appointment_uuid) => {
    return {
      // Child details
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/child`]:
        {},
      [`/${session_preset_slug}/${booking_uuid}/new/${appointment_uuid}/dob`]:
        {},
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
 * @param {string} pathPrefix
 * @returns
 */
const getHealthQuestionPath = (key, pathPrefix) => {
  return `${pathPrefix}health-question-${camelToKebabCase(key)}`
}

/**
 * Get health question paths for given vaccines
 *
 * @param {string} pathPrefix - Path prefix
 * @param {import('../models.js').ClinicAppointment} appointment - clinic appointment
 * @returns {object} Health question paths
 */
export const getHealthQuestionPaths = (pathPrefix, appointment) => {
  // Don't worry about it till we've actually made our first appointment
  if (!appointment) {
    console.log('getHealthQuestionPaths: no appointment')

    return {}
  }

  const paths = {}
  const healthQuestions = Object.entries(
    appointment.healthQuestionsForSelectedProgrammes
  )

  healthQuestions.forEach(([key, question], index) => {
    const questionPath = getHealthQuestionPath(key, pathPrefix)

    if (question.conditional) {
      const nextQuestion = healthQuestions[index + 1]
      if (nextQuestion) {
        const forkPath = getHealthQuestionPath(nextQuestion[0], pathPrefix)

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
        const subQuestionPath = getHealthQuestionPath(subKey, pathPrefix)
        paths[subQuestionPath] = {}
      }
    } else {
      paths[questionPath] = {}
    }
  })

  console.log(`getHealthQuestionPaths: ${paths.length} questions`)

  return paths
}
