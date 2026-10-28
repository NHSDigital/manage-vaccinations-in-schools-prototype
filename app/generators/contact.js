import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  NotifyEmailStatus,
  NotifySmsStatus,
  RelationshipType,
  UploadType
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
 * Generate a UK mobile phone number
 *
 * @returns {string} Phone number
 */
function generatePhoneNumber() {
  return '077## 9#####'.replace(/#+/g, (m) => faker.string.numeric(m.length))
}

/**
 * Generate fake contact
 *
 * @param {Child|Patient} patient - Child
 * @param {boolean} [isMum] - Contact is child’s mother
 * @param {object} [overrides] - Choices to make instead of leaving them to chance
 * @param {boolean} [overrides.isEmailDelivered] - Contact has an email address
 *   that messages are delivered to
 * @returns {Contact} Contact
 */
export function generateContact(patient, isMum, overrides = {}) {
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
  const tel = faker.helpers.maybe(generatePhoneNumber, { probability: 0.6 })

  const canSms = faker.datatype.boolean(0.5)
  const smsStatus = faker.helpers.weightedArrayElement([
    { value: NotifySmsStatus.Delivered, weight: 100 },
    { value: NotifySmsStatus.Permanent, weight: 10 },
    { value: NotifySmsStatus.Temporary, weight: 5 },
    { value: NotifySmsStatus.Technical, weight: 1 }
  ])

  const emailAddress = generateEmailAddress(firstName, lastName)
  const email = overrides.isEmailDelivered
    ? emailAddress
    : faker.helpers.maybe(() => emailAddress, { probability: 0.8 })
  const emailStatus = overrides.isEmailDelivered
    ? NotifyEmailStatus.Delivered
    : faker.helpers.weightedArrayElement([
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
 * Generate new contact details for parents of children in an upload
 *
 * Picks 1–5 parents who are missing a phone number or email address, and
 * generates the details the file adds for them. Only files that passed
 * validation and data checks are compared with records in Mavis, and
 * vaccination records don’t include parent details.
 *
 * @param {Upload} upload - Upload
 * @param {Array<Patient>} patients - All patients
 * @returns {object} New contact details, keyed by contact UUID
 */
export function generateUploadContactChanges(upload, patients) {
  if (
    !upload.uploadedAt ||
    upload.hasValidationErrors ||
    upload.hasFailed ||
    upload.type === UploadType.Report
  ) {
    return {}
  }

  const inUpload = new Set(upload.patient_uuids)
  const contacts = patients
    .filter((patient) => inUpload.has(patient.uuid) && !patient.isSensitive)
    .flatMap((patient) =>
      patient.contacts.filter(({ uuid }) =>
        patient.contact_uuids.includes(uuid)
      )
    )
    .filter((contact) => !contact.tel || !contact.email)

  const contactChanges = {}
  for (const contact of faker.helpers.arrayElements(contacts, {
    min: 1,
    max: 5
  })) {
    const [firstName, ...lastNames] = contact.fullName.split(' ')

    contactChanges[contact.uuid] = {
      ...(!contact.tel && { tel: generatePhoneNumber() }),
      ...(!contact.email && {
        email: generateEmailAddress(firstName, lastNames.join(' '))
      })
    }
  }

  return contactChanges
}

/**
 * @import { Child, Patient, Upload } from '../models.js'
 */
