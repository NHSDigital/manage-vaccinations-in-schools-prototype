import { Team, User } from '../models.js'

export const authentication = (request, response, next) => {
  const { data } = request.session

  // Get user from logged in user, or default to first user in session data
  const account = data.token
    ? new User(data.token, data)
    : User.findAll(data)[0]
  response.locals.account = account

  // Give pages access to the team (which isn't otherwise accessible via the account)
  response.locals.team = Team.findOne(account.team_id, data)

  next()
}
