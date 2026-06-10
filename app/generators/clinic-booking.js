import { fakerEN_GB as faker } from '@faker-js/faker'

import { ClinicBooking } from '../models.js'

/**
 * Generate fake clinic booking (initially without any appointments, which can be added later)
 *
 * @param {Array<string>} invited_programme_ids - the IDs of programmes to which the child is being invited
 * @param {object} context - the context to use in the booking
 * @returns {ClinicBooking} ClinicBooking
 */
export function generateEmptyClinicBooking(invited_programme_ids, context) {
  const uuid = faker.string.uuid()
  const bookingReference = ClinicBooking.generateReference()

  return new ClinicBooking(
    {
      uuid,
      bookingReference,
      invited_programme_ids
    },
    context
  )
}
