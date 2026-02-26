import { fakerEN_GB as faker } from '@faker-js/faker'

import { ClinicAppointment, Parent } from '../models.js'
import { ParentalRelationship, SessionType } from '../enums.js'
import { addMinutes } from 'date-fns'

const clinicSlotLength = Number(process.env.CLINIC_SLOT_LENGTH) || 10

/**
 * Generate fake clinic appointment
 *
 * @param {string} booking_uuid The unique ID of the booking in which this appointment was made
 * @param {Parent} parent The parent of the child being booked in (optional)
 * @param {object} context The other data already defined (sessions, children, etc.)
 * @returns {ClinicAppointment} A new, fake clinic appointment
 */
export function generateClinicAppointment(booking_uuid, parent, context) {
  const uuid = faker.string.uuid()
  
  // Child details
  const isMatched = faker.datatype.boolean(0.8)
  const matchedPatient = isMatched ? faker.helpers.arrayElement(Object.values(context.patients)) : null
  const patient_uuid = matchedPatient?.uuid
  const firstName = matchedPatient ? undefined : faker.person.firstName()  
  const lastName = matchedPatient ? undefined : faker.person.lastName()
  const dob = matchedPatient ? undefined : faker.date.birthdate({ min: 4, max: 15, mode: 'age' })   // TODO: make the faked age make sense for the programme and vice versa

  // Define parent details later, outside this generator function
  const relationship = parent
    ? (parent.fullName.endsWith(lastName) ? ParentalRelationship.Mum : ParentalRelationship.Guardian) // NOTE: could end up with parent being both mum and dad for different children, but /shrug
    : ParentalRelationship.Unknown
  const relationshipOther = ""
  
  // Hook up to a clinic session
  // TODO: replace this later with the new clinic information about start and end time, slots, etc.
  const clinicSessions = Object.values(context.sessions).filter(s => s.type === SessionType.Clinic)
  const clinicSession = faker.helpers.arrayElement(clinicSessions)
  const sessionId = clinicSession.id
  const startAt = addMinutes(clinicSession.date, faker.number.int({ min: 0, max: 60, multipleOf: clinicSlotLength }))
  const endAt = addMinutes(startAt, clinicSlotLength)

  // TODO: replace this with a subset of the programmes being offered at the clinic, but including the primary programme
  const programmes = clinicSession.programmes()

  return new ClinicAppointment({
    uuid,
    booking_uuid,
    patient_uuid,
    firstName,
    lastName,
    dob,
    relationship,
    relationshipOther,
    sessionId,
    startAt,
    endAt,
    programmes,
  }, context)
}
