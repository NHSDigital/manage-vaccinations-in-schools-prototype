import i18n from '../utils/i18n.js'

export const internationalisation = async (request, response, next) => {
  i18n.init(request, response)

  next()
}
