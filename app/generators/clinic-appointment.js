import { fakerEN_GB as faker } from '@faker-js/faker'
import { addMinutes, addYears } from 'date-fns'

import { ParentalRelationship } from '../enums.js'
import { ClinicAppointment } from '../models.js'

import { generateParent } from './parent.js'

const clinicSlotLength = Number(process.env.CLINIC_SLOT_LENGTH) || 10

/**
 * Generate fake clinic appointment
 *
 * @param {import('../models.js').Patient} patient - The patient for whom the appointment is being created
 * @param {import('../models.js').Session} session - The clinic session into which we're booking the patient
 * @param {import('../models.js').ClinicBooking} booking - The booking this appointment will belong to
 * @returns {ClinicAppointment} A new, fake clinic appointment
 */
export function generateClinicAppointment(patient, session, booking) {
  const uuid = faker.string.uuid()
  const booking_uuid = booking.uuid
  const session_id = session.id

  let patient_uuid, child
  if (faker.datatype.boolean(0.9)) {
    // Matched appointment
    patient_uuid = patient.uuid

    child = {
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: patient.dob
    }
  } else {
    // Unmatched appointment; no patient ID, and get one of the details 'wrong'
    const wrongness = faker.helpers.arrayElement([
      'firstName',
      'lastName',
      'dob'
    ])
    child = {
      firstName:
        wrongness === 'firstName'
          ? faker.person.firstName()
          : patient.firstName,
      lastName:
        wrongness === 'lastName' ? faker.person.lastName() : patient.lastName,
      dob:
        wrongness === 'dob'
          ? addYears(patient.dob, faker.helpers.arrayElement([-2, -1, 1, 2]))
          : patient.dob
    }
  }

  // Set up the relationship to the child for this appointment. If the booking doesn't already have
  // a parent set up, we'll create the booking and appointment's parent based on the first appointment's
  // child details
  let parentalRelationship,
    parentalRelationshipOther,
    parentHasParentalResponsibility
  if (!booking.parent.fullName) {
    // First appointment, so set up the booking's parent
    booking.parent =
      patient.parent1 ||
      patient.parent2 ||
      generateParent(child.lastName, faker.datatype.boolean(0.5))
    // ...and their relationship to this child
    parentalRelationship = booking.parent.relationship
    parentalRelationshipOther = booking.parent.relationshipOther
    parentHasParentalResponsibility = booking.parent.hasParentalResponsibility
  } else {
    // This isn't the first appointment, so set up parent details similar to the first one
    const parent = booking.parent
    const mumOrDad = [
      ParentalRelationship.Mum,
      ParentalRelationship.Dad
    ].includes(parent.relationship)
    if (mumOrDad) {
      // Mum or Dad initially, and most likely to stay that way
      if (faker.datatype.boolean(0.9)) {
        parentalRelationship = parent.relationship
        parentalRelationshipOther = parent.relationshipOther
        parentHasParentalResponsibility = parent.hasParentalResponsibility
      } else {
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
      // Fosterer, Guardian or Other - for these, we'll keep the relationship exactly the same
      parentalRelationship = parent.relationship
      parentalRelationshipOther = parent.relationshipOther
      parentHasParentalResponsibility = parent.hasParentalResponsibility
    }
  }

  // Extra time requirement (and reason)
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

  // Appointment time
  const startAt = faker.helpers.arrayElement(session.availableAppointmentTimes)
  const slotsCovered = 1 // TODO: needsExtraTime ? 2 : 1
  const endAt = addMinutes(startAt, clinicSlotLength * slotsCovered)

  // Have the child signed up for whatever they were invited for
  const selected_programme_ids = patient.clinicProgramme_ids

  return booking.addAppointment({
    uuid,
    booking_uuid,
    patient_uuid,
    child,
    needsExtraTime,
    extraTimeReason,
    parentalRelationship,
    parentalRelationshipOther,
    parentHasParentalResponsibility,
    session_id,
    startAt,
    endAt,
    selected_programme_ids
  })
}
