import { isSafeRedirect } from '../utils/url.js'

export const referrer = (request, response, next) => {
  const { referrer } = request.query
  if (request.session && isSafeRedirect(referrer)) {
    request.session.referrer = referrer
  }

  next()
}
