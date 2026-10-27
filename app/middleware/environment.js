import process from 'node:process'

import { formatLink } from '../utils/string.js'

export const environment = (request, response, next) => {
  let environment = 'production'
  const { HEROKU_BRANCH, HEROKU_PR_NUMBER, NODE_ENV } = process.env

  if (NODE_ENV === 'development') {
    environment = 'development'
  }

  if (HEROKU_PR_NUMBER || HEROKU_BRANCH) {
    environment = 'review'
  }

  const pullRequestUrl =
    HEROKU_PR_NUMBER &&
    `https://github.com/nhsuk/manage-vaccinations-in-schools-prototype/pull/${HEROKU_PR_NUMBER}`

  const environments = {
    development: {
      colour: 'white',
      tag: 'Prototype',
      text: 'This is a prototype in development.'
    },
    production: {
      colour: 'grey',
      tag: 'Prototype',
      text: 'This is a prototype used for research.'
    },
    review: {
      colour: 'purple',
      tag: HEROKU_PR_NUMBER ? `Prototype PR ${HEROKU_PR_NUMBER}` : 'Prototype',
      html: HEROKU_PR_NUMBER
        ? `This is a prototype for review. ${formatLink(pullRequestUrl, 'View pull request')}`
        : 'This is a prototype for review.'
    }
  }

  response.locals.environment = environments[environment]
  response.locals.themeName = environments[environment].colour

  next()
}
