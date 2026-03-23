import { fakerEN_GB as faker } from '@faker-js/faker'

import { SessionPresets } from '../enums.js'
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
  const sessionPreset = faker.helpers.arrayElement(
    SessionPresets.filter((preset) => preset.active)
  )

  return new ClinicBooking(
    {
      uuid,
      bookingReference,
      sessionPreset
    },
    context
  )
}
