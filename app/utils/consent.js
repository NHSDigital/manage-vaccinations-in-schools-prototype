import { ReplyDecision } from '../enums.js'

import { camelToKebabCase } from './string.js'

const getHealthQuestionPath = (key, pathPrefix) => {
  return `${pathPrefix}health-question-${camelToKebabCase(key)}`
}

/**
 * Get health question paths for given vaccines
 *
 * @param {string} pathPrefix - Path prefix
 * @param {import('../models.js').Consent} consent - Consent
 * @returns {object|undefined} Health question paths
 */
export const getHealthQuestionPaths = (pathPrefix, consent) => {
  if (!consent.decision) {
    return
  }

  if (consent.decision === ReplyDecision.AlreadyVaccinated) {
    return
  }

  const paths = {}
  const healthQuestions = Object.entries(consent.healthQuestionsForDecision)

  healthQuestions.forEach(([key, question], index) => {
    const questionPath = getHealthQuestionPath(key, pathPrefix)

    if (question.conditional) {
      const nextQuestion = healthQuestions[index + 1]
      if (nextQuestion) {
        const forkPath = getHealthQuestionPath(nextQuestion[0], pathPrefix)

        paths[questionPath] = {
          [forkPath]: {
            data: `consent.healthAnswers.${key}.answer`,
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

  // Ask for refusal reason if consent only given for one vaccination
  if (
    [ReplyDecision.OnlyMenACWY, ReplyDecision.OnlyTdIPV].includes(
      consent.decision
    )
  ) {
    paths[`${pathPrefix}refusal-reason`] = {}
  }

  return paths
}
