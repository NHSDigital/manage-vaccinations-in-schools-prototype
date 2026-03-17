import { fakerEN_GB as faker } from '@faker-js/faker'

import { ClinicBooking } from '../models.js'

/**
 * Generate fake clinic booking (initially without any appointments, which can be added later)
 *
 * @param context
 * @returns {ClinicBooking} ClinicBooking
 */
export function generateEmptyClinicBooking(context) {
  const uuid = faker.string.uuid()
  const bookingReference = ClinicBooking.generateReference()

  return new ClinicBooking(
    {
      uuid,
      bookingReference
    },
    context
  )
}
