import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  NotifyEmailStatus,
  NotifySmsStatus,
  RelationshipType
} from '../enums.js'
import { Contact } from '../models.js'

import { generateLastName, generateParentFirstName } from './name.js'

/**
 * Generate an email address based on a person’s name
 *
 * @param {string} firstName - First name
 * @param {string} lastName - Last name
 * @returns {string} Email address
 */
function generateEmailAddress(firstName, lastName) {
  // Apostrophes (e.g. O’Brien) would turn into odd characters in the address
  return faker.internet
    .email({ firstName, lastName: lastName.replace(/[’']/g, '') })
    .toLowerCase()
}

/**
 * Generate fake contact
 *
 * @param {Child|Patient} patient - Child
 * @param {boolean} [isMum] - Contact is child’s mother
 * @returns {Contact} Contact
 */
export function generateContact(patient, isMum) {
  // Relationship
  const relationship = isMum
    ? RelationshipType.Mum
    : faker.helpers.weightedArrayElement([
        { value: RelationshipType.Dad, weight: 4 },
        { value: RelationshipType.Guardian, weight: 1 },
        { value: RelationshipType.Fosterer, weight: 1 },
        { value: RelationshipType.Other, weight: 1 }
      ])

  // Name
  let firstName
  let lastName
  switch (relationship) {
    case RelationshipType.Mum:
      lastName = patient.lastName
      firstName = generateParentFirstName(lastName, 'Female')
      break
    case RelationshipType.Dad:
      lastName = patient.lastName
      firstName = generateParentFirstName(lastName, 'Male')
      break
    default:
      lastName = generateLastName()
      firstName = generateParentFirstName(
        lastName,
        faker.helpers.arrayElement(['Female', 'Male'])
      )
  }

  // Contact details
  const phoneNumber = '077## 9#####'.replace(/#+/g, (m) =>
    faker.string.numeric(m.length)
  )
  const tel = faker.helpers.maybe(() => phoneNumber, { probability: 0.6 })

  const canSms = faker.datatype.boolean(0.5)
  const smsStatus = faker.helpers.weightedArrayElement([
    { value: NotifySmsStatus.Delivered, weight: 100 },
    { value: NotifySmsStatus.Permanent, weight: 10 },
    { value: NotifySmsStatus.Temporary, weight: 5 },
    { value: NotifySmsStatus.Technical, weight: 1 }
  ])

  const emailAddress = generateEmailAddress(firstName, lastName)
  const email = faker.helpers.maybe(() => emailAddress, { probability: 0.8 })
  const emailStatus = faker.helpers.weightedArrayElement([
    { value: NotifyEmailStatus.Delivered, weight: 100 },
    { value: NotifyEmailStatus.Permanent, weight: 10 },
    { value: NotifyEmailStatus.Temporary, weight: 5 },
    { value: NotifyEmailStatus.Technical, weight: 1 }
  ])

  // If telephone number provided, sometimes add a communication need
  const hasCommunicationNeeds = faker.datatype.boolean(0.2)
  let communicationNeeds
  if (tel && hasCommunicationNeeds) {
    communicationNeeds =
      'I sometimes have difficulty hearing phone calls, so it’s best to send me a text message.'
  }

  return new Contact({
    fullName: `${firstName} ${lastName}`,
    relationship,
    ...(relationship === RelationshipType.Other && {
      relationshipOther: 'Grandparent'
    }),
    ...(email && {
      email,
      ...(emailStatus && { emailStatus })
    }),
    ...(tel && {
      tel,
      canSms,
      ...(smsStatus && { smsStatus })
    }),
    hasCommunicationNeeds,
    communicationNeeds,
    patient_uuid: patient.uuid
  })
}

/**
 * Generate a variation of an existing contact, as if the same person has given
 * slightly different details, e.g. a mum who has remarried and changed her
 * surname, or has a new phone number
 *
 * @param {Contact} contact - Contact on the child’s record
 * @returns {Contact} Contact with some details changed
 */
export function generateContactVariation(contact) {
  const [firstName, ...otherNames] = contact.fullName.split(' ')
  let lastName = otherNames.join(' ')
  let { email, emailStatus, tel, smsStatus } = contact

  // Only vary details the contact already has, so they can still be reached
  const change = faker.helpers.weightedArrayElement([
    { value: 'surname', weight: 3 },
    ...(tel ? [{ value: 'tel', weight: 1 }] : []),
    ...(email ? [{ value: 'email', weight: 1 }] : [])
  ])

  switch (change) {
    case 'surname': {
      const newLastName = generateLastName()
      lastName = faker.datatype.boolean(0.3)
        ? `${lastName}-${newLastName}`
        : newLastName

      // Email addresses are based on names, so a new surname means a new address
      if (email) {
        email = generateEmailAddress(firstName, lastName)
        emailStatus = NotifyEmailStatus.Delivered
      }
      break
    }
    case 'tel':
      tel = faker.helpers.replaceSymbols('077## 9#####')
      smsStatus = NotifySmsStatus.Delivered
      break
    case 'email':
      email = generateEmailAddress(firstName, lastName)
      emailStatus = NotifyEmailStatus.Delivered
      break
  }

  return new Contact({
    fullName: `${firstName} ${lastName}`,
    relationship: contact.relationship,
    relationshipOther: contact.relationshipOther,
    ...(email && { email, emailStatus }),
    ...(tel && { tel, canSms: contact.canSms, smsStatus }),
    hasCommunicationNeeds: contact.hasCommunicationNeeds,
    communicationNeeds: contact.communicationNeeds,
    patient_uuid: contact.patient_uuid
  })
}

/**
 * @import { Child, Patient } from '../models.js'
 */
