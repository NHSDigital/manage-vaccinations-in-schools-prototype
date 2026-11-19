import { ContactSource } from '../enums.js'
import { ContactRelationship } from '../models.js'

/**
 * Add the details a parent gave in a consent response to their contact
 *
 * The phone numbers and email addresses they gave are added to the contact,
 * with the response as their source (contact points the contact already has
 * get the response added as a source instead).
 *
 * @param {ContactRelationship} contactRelationship - Contact who responded
 * @param {Reply} reply - Consent response
 * @returns {ContactRelationship} Contact, with the response’s details added
 */
export function addReplyDetailsToContactRelationship(
  contactRelationship,
  reply
) {
  const details = reply.contactRelationship_
  if (!contactRelationship || !details) {
    return contactRelationship
  }

  const source = reply.clinicAppointment_uuid
    ? ContactSource.ClinicBooking
    : ContactSource.ConsentResponse

  for (const { type, value } of details.activeContacts) {
    contactRelationship.addContact({
      createdAt: reply.createdAt,
      type,
      value,
      sources: [source]
    })
  }

  if (details.canSms !== undefined) {
    contactRelationship.canSms = details.canSms
  }

  return contactRelationship
}

/**
 * Add the parent who gave a consent response or booked a clinic appointment
 * to a child’s contacts, with the details they gave
 *
 * The parent is the contact the response is linked to, or the matching
 * contact on the child’s record (including archived contacts), or else a new
 * contact. They’re added to the child’s contacts if they aren’t one already.
 * The phone numbers and email addresses they gave are then added to their
 * contact (restoring any that were archived), and the contact is saved.
 *
 * @param {Patient} patient - Patient
 * @param {Reply} reply - Consent response, or response from a booking
 * @param {object} context - Context
 * @returns {ContactRelationship|undefined} Contact who responded
 */
export function addRespondentToPatient(patient, reply, context) {
  const details = reply.contactRelationship_

  let contactRelationship =
    reply.contactRelationship_uuid &&
    ContactRelationship.findOne(reply.contactRelationship_uuid, context)

  if (!contactRelationship && details?.fullName) {
    contactRelationship =
      patient.allContactRelationshipsExcludingClinicBookings.find(
        (contactRelationship) => contactRelationship.isSamePersonAs(details)
      ) ||
      ContactRelationship.create(
        {
          fullName: details.fullName,
          relationship: details.relationship,
          relationshipOther: details.relationshipOther,
          hasParentalResponsibility: details.hasParentalResponsibility,
          patient_uuid: patient.uuid
        },
        context
      )
  }

  if (!contactRelationship) {
    return
  }

  if (!patient.contactRelationship_uuids.includes(contactRelationship.uuid)) {
    patient.addContactRelationship(contactRelationship)
  }

  if (details) {
    addReplyDetailsToContactRelationship(contactRelationship, reply)
    ContactRelationship.update(
      contactRelationship.uuid,
      contactRelationship,
      context
    )
  }

  return contactRelationship
}

/**
 * @import { Patient, Reply } from '../models.js'
 */
