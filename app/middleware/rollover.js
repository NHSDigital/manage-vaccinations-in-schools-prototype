import { getCurrentAcademicYear, isBetweenDates, today } from '../utils/date.js'

export const rollover = (request, response, next) => {
  const thisYear = new Date().getFullYear()

  response.app.locals.isRollover = isBetweenDates(
    today(),
    `${thisYear}-07-01`,
    `${thisYear}-08-31`
  )

  response.app.locals.currentAcademicYear = getCurrentAcademicYear()

  next()
}
