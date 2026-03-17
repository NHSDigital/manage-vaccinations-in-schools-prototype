import { camelToKebabCase } from './string.js'

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
