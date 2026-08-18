import filters from '../filters.js'

export const notification = (request, response, next) => {
  const { nunjucksEnv } = response.app.locals.settings

  response.locals.success = request.flash('success').map((text) => ({
    type: 'success',
    heading: {
      html: filters(nunjucksEnv)
        .nhsukMarkdown(text, { inline: true })
        .replace('nhsuk-link', 'nhsuk-notification-banner__link')
    }
  }))[0]

  response.locals.message = request.flash('message').map((text) => ({
    title: 'Information',
    heading: {
      html: filters(nunjucksEnv)
        .nhsukMarkdown(text, { inline: true })
        .replace('nhsuk-link', 'nhsuk-notification-banner__link')
    }
  }))[0]

  next()
}
