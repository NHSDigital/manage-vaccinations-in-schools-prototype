import { ContactPointSource } from '../enums.js'

/**
 * Add the details a parent gave in a consent response to their contact
 *
 * The phone numbers and email addresses they gave are added to the contact,
 * with the response as their source (contact points the contact already has
 * get the response added as a source instead). Any contact preferences they
 * gave replace those given before.
 *
 * @param {Contact} contact - Contact who responded
 * @param {Reply} reply - Consent response
 * @returns {Contact} Contact, with the response’s details added
 */
export function addReplyDetailsToContact(contact, reply) {
  const details = reply.contact_
  if (!contact || !details) {
    return contact
  }

  const source = reply.clinicAppointment_uuid
    ? ContactPointSource.ClinicBooking
    : ContactPointSource.ConsentResponse

  for (const { type, value } of details.activeContactPoints) {
    contact.addContactPoint({
      createdAt: reply.createdAt,
      type,
      value,
      sources: [source]
    })
  }

  for (const key of ['canSms', 'hasCommunicationNeeds', 'communicationNeeds']) {
    if (details[key] !== undefined) {
      contact[key] = details[key]
    }
  }

  return contact
}

/**
 * @import { Contact, Reply } from '../models.js'
 */
