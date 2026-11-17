import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  ContactType,
  NotifyEmailStatus,
  NotifySmsStatus,
  RelationshipType,
  UploadType
} from '../enums.js'
import { ContactRelationship } from '../models.js'

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
 * @returns {ContactRelationship} Contact
 */
export function generateContactRelationship(patient, isMum, overrides = {}) {
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

  const contacts = []
  if (tel) {
    contacts.push({
      type: ContactType.Phone,
      value: tel,
      status: smsStatus
    })
  }
  if (email) {
    contacts.push({
      type: ContactType.Email,
      value: email,
      status: emailStatus
    })
  }

  // Sometimes keep an older phone number or email address that has since
  // been archived, because messages to it couldn’t be delivered
  if (faker.datatype.boolean(0.15)) {
    const isPhone = faker.datatype.boolean(0.5)
    const archivedAt = faker.date.past({ years: 2 })

    contacts.unshift({
      createdAt: faker.date.past({ years: 3, refDate: archivedAt }),
      type: isPhone ? ContactType.Phone : ContactType.Email,
      value: isPhone
        ? generatePhoneNumber()
        : generateEmailAddress(firstName, generateLastName()),
      status: isPhone ? NotifySmsStatus.Permanent : NotifyEmailStatus.Permanent,
      archivedAt
    })
  }

  return new ContactRelationship({
    fullName: `${firstName} ${lastName}`,
    relationship,
    ...(relationship === RelationshipType.Other && {
      relationshipOther: 'Grandparent'
    }),
    contacts,
    ...(tel && { canSms }),
    patient_uuid: patient.uuid
  })
}

/**
 * Generate the communication needs a parent gives in a consent response or
 * clinic booking
 *
 * @param {ContactRelationship} contactRelationship - Contact responding
 * @returns {object} Whether they have communication needs, and what they are
 */
export function generateCommunicationNeeds(contactRelationship) {
  const hasCommunicationNeeds = faker.datatype.boolean(0.2)
  if (!hasCommunicationNeeds) {
    return { hasCommunicationNeeds }
  }

  // Parents saying they have communication needs always say what they are
  // (the service wouldn’t let them continue without doing so)
  const communicationNeeds = faker.helpers.arrayElement([
    ...(contactRelationship?.tel
      ? [
          'I sometimes have difficulty hearing phone calls, so it’s best to send me a text message.',
          'I have dyslexia, so I find it easier to talk things through on the phone than read long emails.'
        ]
      : []),
    'English is not my first language. I’d like to speak to someone with an interpreter who speaks Polish.',
    'I’m partially sighted, so please send any letters in large print.',
    'Please use plain English when writing to me, as I find medical terms hard to follow.'
  ])

  return { hasCommunicationNeeds, communicationNeeds }
}

/**
 * Generate a variation of an existing contact, as if the same person has given
 * slightly different details, e.g. a mum who has remarried and changed her
 * surname, or has a new phone number
 *
 * @param {ContactRelationship} contactRelationship - Contact on the child’s record
 * @returns {ContactRelationship} Contact with some details changed
 */
export function generateContactRelationshipVariation(contactRelationship) {
  const [firstName, ...otherNames] = contactRelationship.fullName.split(' ')
  let lastName = otherNames.join(' ')
  // Copy the contact points the parent still uses
  const contacts = contactRelationship.activeContacts.map(
    ({ type, value, status }) => ({ type, value, status })
  )
  const hasPhone = contacts.some(({ type }) => type === ContactType.Phone)
  const hasEmail = contacts.some(({ type }) => type === ContactType.Email)
  const replaceValue = (type, value) => {
    const contact = contacts.find((point) => point.type === type)
    if (contact) {
      contact.value = value
      contact.status =
        type === ContactType.Email
          ? NotifyEmailStatus.Delivered
          : NotifySmsStatus.Delivered
    }
  }

  // Only vary details the contact already has, so they can still be reached
  const change = faker.helpers.weightedArrayElement([
    { value: 'surname', weight: 3 },
    ...(hasPhone ? [{ value: 'tel', weight: 1 }] : []),
    ...(hasEmail ? [{ value: 'email', weight: 1 }] : [])
  ])

  switch (change) {
    case 'surname': {
      const newLastName = generateLastName()
      lastName = faker.datatype.boolean(0.3)
        ? `${lastName}-${newLastName}`
        : newLastName

      // Email addresses are based on names, so a new surname means a new address
      replaceValue(ContactType.Email, generateEmailAddress(firstName, lastName))
      break
    }
    case 'tel':
      replaceValue(ContactType.Phone, generatePhoneNumber())
      break
    case 'email':
      replaceValue(ContactType.Email, generateEmailAddress(firstName, lastName))
      break
  }

  return new ContactRelationship({
    fullName: `${firstName} ${lastName}`,
    relationship: contactRelationship.relationship,
    relationshipOther: contactRelationship.relationshipOther,
    contacts,
    ...(hasPhone && { canSms: contactRelationship.canSms }),
    patient_uuid: contactRelationship.patient_uuid
  })
}

/**
 * Generate new contact points for parents of children in an upload
 *
 * Picks 1–5 parents who are missing a phone number or email address, and
 * generates the contact points the file adds for them. Only files that passed
 * validation and data checks are compared with records in Mavis, and
 * vaccination records don’t include parent details.
 *
 * @param {Upload} upload - Upload
 * @param {Array<Patient>} patients - All patients
 * @returns {Record<string, Array<object>>} New contact points, keyed by
 *   contact UUID
 */
export function generateUploadContactChanges(upload, patients) {
  if (!upload.hasPassedChecks || upload.type === UploadType.Report) {
    return {}
  }

  const inUpload = new Set(upload.patient_uuids)
  const contactRelationships = patients
    .filter((patient) => inUpload.has(patient.uuid) && !patient.isSensitive)
    .flatMap((patient) =>
      patient.contactRelationships.filter(({ uuid }) =>
        patient.contactRelationship_uuids.includes(uuid)
      )
    )
    .filter(
      (contactRelationship) =>
        !contactRelationship.firstActiveContact(ContactType.Phone) ||
        !contactRelationship.firstActiveContact(ContactType.Email)
    )

  const contactChanges = {}
  for (const contactRelationship of faker.helpers.arrayElements(
    contactRelationships,
    {
      min: 1,
      max: 5
    }
  )) {
    const [firstName, ...lastNames] = contactRelationship.fullName.split(' ')

    contactChanges[contactRelationship.uuid] = []

    if (!contactRelationship.firstActiveContact(ContactType.Phone)) {
      contactChanges[contactRelationship.uuid].push({
        type: ContactType.Phone,
        value: generatePhoneNumber()
      })
    }

    if (!contactRelationship.firstActiveContact(ContactType.Email)) {
      contactChanges[contactRelationship.uuid].push({
        type: ContactType.Email,
        value: generateEmailAddress(firstName, lastNames.join(' '))
      })
    }
  }

  return contactChanges
}

/**
 * @import { Child, Patient, Upload } from '../models.js'
 */
