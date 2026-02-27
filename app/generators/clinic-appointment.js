import { fakerEN_GB as faker } from '@faker-js/faker'

import { ClinicAppointment } from '../models.js'
import { SessionType } from '../enums.js'
import { addMinutes } from 'date-fns'
import { getAge } from '../utils/date.js'
import _ from 'lodash'

const clinicSlotLength = Number(process.env.CLINIC_SLOT_LENGTH) || 10

/**
 * Generate fake clinic appointment
 *
 * @param {object} context The other data already defined (sessions, children, etc.)
 * @returns {ClinicAppointment} A new, fake clinic appointment
 */
export function generateClinicAppointment(context) {
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

  // Child details, taken from children of an appropriate age
  let matchedPatient
  if (faker.datatype.boolean(0.8)) {
    const eligiblePatients = Object.values(context.patients)
                                   .filter(p => {
                                     const age = getAge(p.dob)
                                     return (age >= minAge && age <= maxAge)
                                   })
    matchedPatient = faker.helpers.arrayElement(eligiblePatients)
  }
  const patient_uuid = matchedPatient?.uuid
  const unmatchedFirstName = matchedPatient ? undefined : faker.person.firstName()
  const unmatchedLastName = matchedPatient ? undefined : faker.person.lastName()
  const unmatchedDob = matchedPatient ? undefined : faker.date.birthdate({ min: minAge, max: maxAge, mode: 'age' })

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
    patient_uuid,
    unmatchedFirstName,
    unmatchedLastName,
    unmatchedDob,
    session_id,
    startAt,
    endAt,
    programme_ids,
  }, context)
}
