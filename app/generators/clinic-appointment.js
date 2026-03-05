import { fakerEN_GB as faker } from '@faker-js/faker'

import { ClinicAppointment, Parent } from '../models.js'
import { ParentalRelationship, SessionType } from '../enums.js'
import { addMinutes } from 'date-fns'
import { getAge } from '../utils/date.js'
import _ from 'lodash'
import { generateParent } from './parent.js'

const clinicSlotLength = Number(process.env.CLINIC_SLOT_LENGTH) || 10

/**
 * Generate fake clinic appointment
 * 
 * @param {string} booking_uuid The UUID of the booking this appointment belongs to
 * @param {Parent|null} parentFromFirstAppointment The parent from the first appointment created in the same booking, if this appointment is not the first
 * @param {object} context The other data already defined (sessions, children, etc.)
 * @returns {ClinicAppointment} A new, fake clinic appointment
 */
export function generateClinicAppointment(booking_uuid, parentFromFirstAppointment, context) {
  const uuid = faker.string.uuid()

  // Choose a clinic session to book this appointment into
  const clinicSessions = Object.values(context.sessions).filter(s => s.type === SessionType.Clinic)
  const clinicSession = faker.helpers.arrayElement(clinicSessions)
  const session_id = clinicSession.id

  // Work out the expected age range for children attending this session
  const yearGroups = _.uniq(clinicSession.programmes.flatMap(p => p.yearGroups || []))
  const ageRanges = yearGroups.map(yg => ({ min: yg + 4, max: yg + 5 }))
  const allAgeLimits = ageRanges.flatMap(ar => [ar.min, ar.max])
  const minAge = Math.min(allAgeLimits) || 4
  const maxAge = Math.max(allAgeLimits) || 15

  // Find/create a child of an appropriate age for the chosen clinic and its programmme
  let matchedPatient
  if (faker.datatype.boolean(0.9)) {
    const eligiblePatients = Object.values(context.patients)
                                   .filter(p => {
                                     const age = getAge(p.dob)
                                     return (age >= minAge && age <= maxAge)
                                   })
    matchedPatient = faker.helpers.arrayElement(eligiblePatients)
  }
  const patient_uuid = matchedPatient?.uuid
  // Unmatched child details, if required
  const unmatchedFirstName = matchedPatient ? undefined : faker.person.firstName()
  const unmatchedLastName = matchedPatient ? undefined : faker.person.lastName()
  const unmatchedDob = matchedPatient ? undefined : faker.date.birthdate({ min: minAge, max: maxAge, mode: 'age' })

  // Parent details and relationship
  let parent
  if (!parentFromFirstAppointment) {
    // This is the first appointment for the booking, so we're free to CREATE the parent details
    if (matchedPatient) {
      parent = (matchedPatient.parent1 || matchedPatient.parent2)
        ?? generateParent(matchedPatient.lastName, faker.datatype.boolean(0.5))
    } else {
      parent = generateParent(unmatchedLastName, faker.datatype.boolean(0.5))
    }
  } else {
    // Copy parent details from the first appointment and possibly adapt the relationship
    parent = new Parent(parentFromFirstAppointment)
    parent.uuid = faker.string.uuid()

    // Set up the relationship to the child for this appointment
    if ([ParentalRelationship.Mum, ParentalRelationship.Dad].includes(parentFromFirstAppointment.relationship)) {
      // Mum or Dad initially, and most likely to stay that way
      if (faker.datatype.boolean(0.1)) {
        parent.relationship = faker.helpers.arrayElement([ParentalRelationship.Fosterer, ParentalRelationship.Guardian, ParentalRelationship.Other])
        parent.relationshipOther = parent.relationship === ParentalRelationship.Other ? "Grandparent" : undefined
      }
    } else {
      // Fosterer, Guardian or Other
      parent.relationship = parentFromFirstAppointment.relationship
      parent.relationshipOther = parentFromFirstAppointment.relationshipOther
    }
  }

  // Slot details (NB: session date is expected to specify midday)
  const startAt = addMinutes(clinicSession.date, faker.number.int({ min: 0, max: 60, multipleOf: clinicSlotLength }))
  const endAt = addMinutes(startAt, clinicSlotLength)

  // Have the child signed up for the clinic's primary programme plus a random selection of other programmes
  const additionalProgramme_ids = Object.values(context.programmes)
                                        .filter(p => p.hidden !== true)
                                        .map(p => p.id)
                                        .filter(id => !clinicSession.programme_ids.includes(id) && faker.datatype.boolean(0.2))
  const programme_ids = [...clinicSession.programme_ids, ...additionalProgramme_ids]

  return new ClinicAppointment({
    uuid,
    booking_uuid,
    patient_uuid,
    unmatchedFirstName,
    unmatchedLastName,
    unmatchedDob,
    parent,
    session_id,
    startAt,
    endAt,
    programme_ids,
  }, context)
}
