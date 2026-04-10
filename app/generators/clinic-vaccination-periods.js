import { fakerEN_GB as faker } from '@faker-js/faker'
import { addMinutes } from 'date-fns'

import { Session } from '../models.js'

/**
 * Generate one or more time periods during which vaccinations will be administered at a clinic
 *
 * @param {Session} session - the session to which we're adding vaccination periods
 */
export function generateClinicVaccinationPeriods(session) {
  const periodCount = faker.helpers.weightedArrayElement([
    { value: 1, weight: 70 },
    { value: 2, weight: 30 }
  ])

  const vaccinationPeriodLengths = Array.from({ length: periodCount }).map(
    () => {
      return faker.number.int({ min: 60, max: 180, multipleOf: 30 })
    }
  )
  const breakLength =
    periodCount > 1 ? faker.number.int({ min: 15, max: 60, multipleOf: 15 }) : 0
  const totalSessionLength =
    vaccinationPeriodLengths.reduce((total, next) => total + next, 0) +
    breakLength

  const sessionDate = new Date(session.date)
  const earliestSessionStartTime = new Date(sessionDate.setUTCHours(9, 0)) // 9am
  const latestSessionFinishTime = new Date(sessionDate.setUTCHours(20, 0)) // 8pm
  const sessionWindow = Math.floor(
    (latestSessionFinishTime.getTime() - earliestSessionStartTime.getTime()) /
      1000 /
      60
  )
  const startOffset = faker.number.int({
    min: 0,
    max: sessionWindow - totalSessionLength,
    multipleOf: 15
  })
  const sessionStartTime = addMinutes(earliestSessionStartTime, startOffset)

  let nextPeriodStartTime = sessionStartTime
  vaccinationPeriodLengths.forEach((periodLength) => {
    session.addVaccinationPeriod({
      startAt: nextPeriodStartTime,
      endAt: addMinutes(nextPeriodStartTime, periodLength),
      vaccinatorCount: faker.helpers.weightedArrayElement([
        { value: 2, weight: 5 },
        { value: 3, weight: 85 },
        { value: 4, weight: 10 }
      ])
    })
    nextPeriodStartTime = addMinutes(
      nextPeriodStartTime,
      periodLength + breakLength
    )
  })
}
