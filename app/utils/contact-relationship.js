import { ContactSource } from '../enums.js'

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
 * @import { ContactRelationship, Reply } from '../models.js'
 */
