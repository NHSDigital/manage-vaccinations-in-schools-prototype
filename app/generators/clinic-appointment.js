import { fakerEN_GB as faker } from '@faker-js/faker'
import { addYears } from 'date-fns'

import {
  ClinicAppointmentStatus,
  ParentalRelationship,
  ReplyDecision
} from '../enums.js'
import { Child, ClinicAppointment } from '../models.js'

import { generateContact } from './contact.js'

/**
 * Decide which programmes and vaccine choices a patient's clinic appointment will cover
 *
 * Split out from generateClinicAppointment so the resulting appointment length is known before
 * a session (and slot within it) is chosen for the appointment
 *
 * @param {Patient} patient - The patient being invited to a clinic appointment
 * @returns {ClinicVaccinationChoices} The selected programmes and vaccine choices for the appointment
 */
export function decideClinicVaccinationChoices(patient) {
  const selected_programme_ids = patient.clinicProgramme_ids
  let fluDecision, fluAlternative, mmrAlternative

  if (selected_programme_ids.includes('flu')) {
    fluDecision = faker.helpers.weightedArrayElement([
      { value: ReplyDecision.Given, weight: 95 },
      { value: ReplyDecision.OnlyAlternativeInjection, weight: 5 }
    ])
    if (fluDecision === ReplyDecision.Given) {
      fluAlternative = faker.datatype.boolean(0.5)
    }
  }
  if (selected_programme_ids.includes('mmr')) {
    mmrAlternative = faker.datatype.boolean(0.15)
  }

  return {
    selected_programme_ids,
    fluDecision,
    fluAlternative,
    mmrAlternative
  }
}

/**
 * Generate fake clinic appointment
 *
 * @param {Patient} patient - The patient for whom the appointment is being created
 * @param {Session} session - The clinic session into which we're booking the patient
 * @param {ClinicBooking} booking - The booking this appointment will belong to
 * @param {ClinicVaccinationChoices} vaccinationChoices - Programmes and vaccine choices, from decideClinicVaccinationChoices
 * @param {Date} startAt - The bookable start time chosen for this appointment
 * @returns {ClinicAppointment} A new, fake clinic appointment
 */
export function generateClinicAppointment(
  patient,
  session,
  booking,
  vaccinationChoices,
  startAt
) {
  const uuid = faker.string.uuid()
  const booking_uuid = booking.uuid
  const session_id = session.id

  let patient_uuid, child
  if (faker.datatype.boolean(0.9)) {
    // Matched appointment
    patient_uuid = patient.uuid

    child = new Child({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dob: patient.dob,
      address: {
        ...patient.address
      },
      adjustments: [...patient.adjustments],
      adjustmentsOther: patient.adjustmentsOther,
      impairments: [...patient.impairments],
      impairmentsOther: patient.impairmentsOther
    })
  } else {
    // Unmatched appointment; no patient ID, and get one of the details 'wrong'
    const wrongness = faker.helpers.arrayElement([
      'firstName',
      'lastName',
      'dob'
    ])
    child = new Child({
      firstName: patient.firstName + (wrongness === 'firstName' ? 'e' : ''),
      lastName: patient.lastName + (wrongness === 'lastName' ? 's' : ''),
      dob:
        wrongness === 'dob'
          ? addYears(patient.dob, faker.helpers.arrayElement([-2, -1, 1, 2]))
          : patient.dob,
      address: {
        ...patient.address
      },
      adjustments: [...patient.adjustments],
      adjustmentsOther: patient.adjustmentsOther,
      impairments: [...patient.impairments],
      impairmentsOther: patient.impairmentsOther
    })
  }

  // Set up the relationship to the child for this appointment. If the booking
  // doesn’t already have a contact set up, we’ll create the booking and
  // appointment’s contact based on the first appointment’s child details
  let parentalRelationship,
    parentalRelationshipOther,
    parentHasParentalResponsibility
  if (!booking.contact.fullName) {
    // First appointment, so set up the booking’s contact
    booking.contact =
      patient.contacts[0] ||
      patient.contacts[1] ||
      generateContact(child, faker.datatype.boolean(0.5))
    // ...and their relationship to this child
    parentalRelationship = booking.contact.relationship
    parentalRelationshipOther = booking.contact.relationshipOther
    parentHasParentalResponsibility = booking.contact.hasParentalResponsibility
  } else {
    // This isn’t the first appointment, so set up contact details similar to the first one
    const contact = booking.contact
    const mumOrDad = [
      ParentalRelationship.Mum,
      ParentalRelationship.Dad
    ].includes(contact.relationship)
    if (mumOrDad) {
      // Mum or Dad initially, and most likely to stay that way
      if (faker.datatype.boolean(0.9)) {
        parentalRelationship = contact.relationship
        parentalRelationshipOther = contact.relationshipOther
        parentHasParentalResponsibility = contact.hasParentalResponsibility
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
      parentalRelationship = contact.relationship
      parentalRelationshipOther = contact.relationshipOther
      parentHasParentalResponsibility = contact.hasParentalResponsibility
    }
  }

  const {
    selected_programme_ids,
    fluDecision,
    fluAlternative,
    mmrAlternative
  } = vaccinationChoices

  const status = ClinicAppointmentStatus.Booked

  const appointment = booking.addAppointment({
    uuid,
    booking_uuid,
    patient_uuid,
    child,
    parentalRelationship,
    parentalRelationshipOther,
    parentHasParentalResponsibility,
    session_id,
    startAt,
    appointmentLength: session.calculateAppointmentLength(vaccinationChoices),
    selected_programme_ids,
    fluDecision,
    fluAlternative,
    mmrAlternative,
    status
  })

  return appointment
}

/**
 * @typedef {AppointmentLengthFactors & {fluAlternative: (boolean|undefined), mmrAlternative: (boolean|undefined)}} ClinicVaccinationChoices
 */

/**
 * @import { AppointmentLengthFactors, ClinicBooking, Patient, Session } from '../models.js'
 */
