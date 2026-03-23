import { fakerEN_GB as faker } from '@faker-js/faker'
import { addMinutes } from 'date-fns'

import { ParentalRelationship, SessionType } from '../enums.js'
import { ClinicAppointment } from '../models.js'
import { getAge } from '../utils/date.js'

const clinicSlotLength = Number(process.env.CLINIC_SLOT_LENGTH) || 10

/**
 * Generate fake clinic appointment
 *
 * @param {import('../models/clinic-booking.js').ClinicBooking} booking - The booking this appointment will belong to
 * @param {object} context - The other data already defined (sessions, children, etc.)
 * @returns {ClinicAppointment} A new, fake clinic appointment
 */
export function generateClinicAppointment(booking, context) {
  const uuid = faker.string.uuid()

  // Find clinic sessions for this programme
  const clinicSessions = Object.values(context.sessions).filter(
    (session) =>
      session.type === SessionType.Clinic &&
      session.presetNames.includes(booking.sessionPreset.name)
  )
  if (!clinicSessions.length) {
    return null
  }

  // Choose a clinic session to book this appointment into
  const clinicSession = faker.helpers.arrayElement(clinicSessions)
  if (!clinicSession) {
    return null
  }
  const session_id = clinicSession.id

  // Work out the expected age range for children attending this session
  const yearGroups = clinicSession.programmes.flatMap((programme) => [
    ...new Set(programme.yearGroups)
  ])
  const minAge = yearGroups.length ? Math.min(...yearGroups) + 4 : 4
  const maxAge = yearGroups.length ? Math.max(...yearGroups) + 5 : 15

  // Find/create a child of an appropriate age for the chosen clinic and its programme
  let matchedPatient
  if (faker.datatype.boolean(0.9)) {
    const eligiblePatients = Object.values(context.patients).filter(
      (patient) => {
        const age = getAge(patient.dob)
        return age >= minAge && age <= maxAge
      }
    )
    if (!eligiblePatients.length) {
      return null
    }
    matchedPatient = faker.helpers.arrayElement(eligiblePatients)
  }
  const patient_uuid = matchedPatient?.uuid

  // Unmatched child details, if required
  const unmatchedFirstName = matchedPatient
    ? undefined
    : faker.person.firstName()
  const unmatchedLastName = matchedPatient ? undefined : faker.person.lastName()
  const unmatchedDob = matchedPatient
    ? undefined
    : faker.date.birthdate({ min: minAge, max: maxAge, mode: 'age' })

  // Set up the relationship to the child for this appointment
  const parent = booking.parent
  let parentalRelationship,
    parentalRelationshipOther,
    parentHasParentalResponsibility
  if (parent) {
    const mumOrDad = [
      ParentalRelationship.Mum,
      ParentalRelationship.Dad
    ].includes(parent.relationship)
    if (mumOrDad) {
      // Mum or Dad initially, and most likely to stay that way
      if (faker.datatype.boolean(0.1)) {
        parentalRelationship = faker.helpers.arrayElement([
          ParentalRelationship.Fosterer,
          ParentalRelationship.Guardian,
          ParentalRelationship.Other
        ])
        parentalRelationshipOther =
          parentalRelationship === ParentalRelationship.Other
            ? 'Grandparent'
            : undefined
        parentHasParentalResponsibility = true
      }
    } else {
      // Fosterer, Guardian or Other
      parentalRelationship = parent.relationship
      parentalRelationshipOther = parent.relationshipOther
      parentHasParentalResponsibility = parent.hasParentalResponsibility
    }
  }

  // Slot details (NB: session date is expected to specify midday)
  const needsExtraTime = faker.datatype.boolean(0.2)
  let extraTimeReason
  if (needsExtraTime) {
    const phobia = faker.helpers.weightedArrayElement([
      { value: 'needles', weight: 90 },
      { value: 'nurses', weight: 8 },
      { value: 'vaccines', weight: 2 }
    ])
    extraTimeReason = `Suffers from anxiety regarding ${phobia}`
  }
  const startAt = addMinutes(
    clinicSession.date,
    faker.number.int({ min: 0, max: 60, multipleOf: clinicSlotLength })
  )
  const endAt = addMinutes(startAt, clinicSlotLength * (needsExtraTime ? 2 : 1))

  // Have the child signed up for the clinic's primary programme plus a random selection of other programmes
  const primary_programme_ids = clinicSession.programme_ids
  const additionalProgramme_ids = Object.values(context.programmes)
    .filter((p) => p.hidden !== true)
    .map((p) => p.id)
    .filter(
      (id) =>
        !clinicSession.programme_ids.includes(id) && faker.datatype.boolean(0.2)
    )
  const selected_programme_ids = [
    ...primary_programme_ids,
    ...additionalProgramme_ids
  ]

  return new ClinicAppointment(
    {
      uuid,
      booking_uuid: booking.uuid,
      patient_uuid,
      unmatchedFirstName,
      unmatchedLastName,
      unmatchedDob,
      needsExtraTime,
      extraTimeReason,
      parentalRelationship,
      parentalRelationshipOther,
      parentHasParentalResponsibility,
      session_id,
      startAt,
      endAt,
      selected_programme_ids,
      primary_programme_ids
    },
    context
  )
}
