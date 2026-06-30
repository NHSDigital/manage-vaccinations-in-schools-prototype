import { User } from '../models.js'

export const authentication = (request, response, next) => {
  const { data } = request.session

  // Get user from logged in user, or default to first user in session data
  response.locals.account = data.token
    ? new User(data.token, data)
    : User.findAll(data)[0]

  next()
}
