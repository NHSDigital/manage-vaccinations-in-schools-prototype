import { fakerEN_GB as faker } from '@faker-js/faker'
import { max, min } from 'date-fns'

import { ClinicBooking } from '../models.js'
import { removeDays, today } from '../utils/date.js'

// Let's say parents book clinic appointments up to 4 weeks in advance
const maxDaysBookedInAdvance = 28

/**
 * Get the latest date a parent could book an appointment in a clinic: at
 * least a day before the clinic, and not in the future
 *
 * @param {Date} sessionDate - Date of the clinic session
 * @returns {Date} Latest booking date
 */
export function getLatestClinicBookingDate(sessionDate) {
  return min([today(), removeDays(sessionDate, 1)])
}

/**
 * Generate fake clinic booking (initially without any appointments, which can be added later)
 *
 * @param {object} context - the context to use in the booking
 * @param {Date} sessionDate - Date of the clinic session the appointment is in
 * @param {Date} [invitedAt] - When the parent was invited to book, if they
 *   were. They can only book after that, so this must be before the latest
 *   booking date (see `getLatestClinicBookingDate`)
 * @returns {ClinicBooking} ClinicBooking
 */
export function generateEmptyClinicBooking(context, sessionDate, invitedAt) {
  const uuid = faker.string.uuid()
  const bookingReference = ClinicBooking.generateReference()

  // Booked up to 4 weeks before the latest date it could have been booked,
  // but never before the parent was invited to book
  const latestBookedAt = getLatestClinicBookingDate(sessionDate)
  const earliestBookedAt = max([
    removeDays(latestBookedAt, maxDaysBookedInAdvance),
    invitedAt ?? removeDays(latestBookedAt, maxDaysBookedInAdvance)
  ])
  const createdAt = faker.date.between({
    from: earliestBookedAt,
    to: latestBookedAt
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
