import { fakerEN_GB as faker } from '@faker-js/faker'

import { ClinicBooking } from '../models.js'
import { generateParent } from './parent.js'
import { generateClinicAppointment } from './clinic-appointment.js'

/**
 * Generate fake clinic booking
 *
 * @returns {ClinicBooking} ClinicBooking
 */
export function generateClinicBooking(context) {
  const uuid = faker.string.uuid()
  const bookingReference = faker.helpers.replaceSymbols('CLN-####-####')

  // Make an appointment for the first (and possibly only) child in this booking
  let appointments = [ generateClinicAppointment(null, context) ]
  const firstAppointment = appointments[0]

  // Make the parent match the first child
  const parent = generateParent(firstAppointment.lastName, faker.datatype.boolean(0.5))
  const parentFullName = parent.fullName
  const parentEmail = parent.email
  const parentPhone = parent.tel
  const sms = parent.sms

  // Now update that first appointment with parent details
  firstAppointment.relationship = parent.relationship
  firstAppointment.relationshipOther = parent.relationshipOther

  // Make any additional appointments for this booking
  const appointmentCount = faker.datatype.boolean(0.9) ? 1 : faker.number.int({ min: 2, max: 4 })
  if (appointmentCount > 1) {
    appointments = [ firstAppointment, ...Array.from([...Array(appointmentCount - 1)]).map(() => {
      return generateClinicAppointment(parent, context)
    }) ]
  }

  return new ClinicBooking({
    uuid,
    bookingReference,
    parentFullName,
    parentEmail,
    parentPhone,
    sms,
    appointments,
  }, context)
}
