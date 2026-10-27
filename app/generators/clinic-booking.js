import { fakerEN_GB as faker } from '@faker-js/faker'
import { min } from 'date-fns'

import { ClinicBooking } from '../models.js'
import { removeDays, today } from '../utils/date.js'

// Let's say parents book clinic appointments up to 4 weeks in advance
const maxDaysBookedInAdvance = 28

/**
 * Generate fake clinic booking (initially without any appointments, which can be added later)
 *
 * @param {object} context - the context to use in the booking
 * @param {Date} sessionDate - Date of the clinic session the appointment is in
 * @returns {ClinicBooking} ClinicBooking
 */
export function generateEmptyClinicBooking(context, sessionDate) {
  const uuid = faker.string.uuid()
  const bookingReference = ClinicBooking.generateReference()

  // Booked at least a day before the clinic, and not in the future
  const latestBookedAt = min([today(), removeDays(sessionDate, 1)])
  const createdAt = faker.date.recent({
    days: maxDaysBookedInAdvance,
    refDate: latestBookedAt
  })

  return new ClinicBooking(
    {
      uuid,
      bookingReference,
      createdAt
    },
    context
  )
}
