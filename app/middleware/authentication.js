import { UserRole, VaccineMethod } from '../enums.js'
import { User } from '../models.js'

export const authentication = (request, response, next) => {
  const { data } = request.session

  // Get user from logged in user, or default to last user in session data
  const user = data.token ? new User(data.token) : User.findAll(data).at(-1)

  // Vaccine method(s)
  if ([UserRole.Nurse, UserRole.NursePrescriber].includes(user.role)) {
    user.vaccineMethods = [VaccineMethod.Injection, VaccineMethod.Intranasal]
  } else if (data?.token?.role === UserRole.HCA) {
    user.vaccineMethods = [VaccineMethod.Intranasal]
  } else {
    user.vaccineMethods = []
  }

  // Instructions
  if ([UserRole.NursePrescriber, UserRole.Pharmacist].includes(user.role)) {
    user.canPrescribe = true
  }

  request.app.locals.account = user

  next()
}
