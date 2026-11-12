import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  AcademicYear,
  ContactPointSource,
  ContactPointType,
  NotifyEmailStatus,
  NotifySmsStatus,
  RelationshipType,
  UploadType
} from '../enums.js'
import { Contact } from '../models.js'
import { today } from '../utils/date.js'

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
 * @param {Array<ContactPointSource>} [overrides.sources] - Where the contact’s
 *   phone number and email address came from (by default, the child’s cohort
 *   or class list records)
 * @param {Date} [overrides.createdAt] - When the phone number and email
 *   address were given
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

  // Where the contact details came from, and when
  const sources =
    overrides.sources ||
    faker.helpers.weightedArrayElement([
      { value: [ContactPointSource.Cohort], weight: 6 },
      { value: [ContactPointSource.ClassList], weight: 3 },
      {
        value: [ContactPointSource.Cohort, ContactPointSource.ClassList],
        weight: 1
      }
    ])
  // Records were added to Mavis before the first academic year it has data for
  const firstAcademicYearStartsAt = new Date(
    Math.min(...Object.keys(AcademicYear).map(Number)),
    8,
    1
  )
  const createdAt =
    overrides.createdAt ||
    faker.date.past({ years: 2, refDate: firstAcademicYearStartsAt })
  const updatedAt =
    sources.length > 1
      ? faker.date.between({ from: createdAt, to: firstAcademicYearStartsAt })
      : undefined

  const contactPoints = []
  if (tel) {
    contactPoints.push({
      createdAt,
      updatedAt,
      type: ContactPointType.Phone,
      value: tel,
      status: smsStatus,
      sources
    })
  }
  if (email) {
    contactPoints.push({
      createdAt,
      updatedAt,
      type: ContactPointType.Email,
      value: email,
      status: emailStatus,
      sources
    })
  }

  // Sometimes keep an older phone number or email address that has since
  // been archived, because messages to it couldn’t be delivered
  if (!overrides.sources && faker.datatype.boolean(0.15)) {
    const isPhone = faker.datatype.boolean(0.5)

    contactPoints.unshift({
      createdAt: faker.date.past({ years: 3, refDate: createdAt }),
      type: isPhone ? ContactPointType.Phone : ContactPointType.Email,
      value: isPhone
        ? generatePhoneNumber()
        : generateEmailAddress(firstName, generateLastName()),
      status: isPhone ? NotifySmsStatus.Permanent : NotifyEmailStatus.Permanent,
      sources: [faker.helpers.arrayElement(sources)],
      archivedAt: faker.date.between({ from: createdAt, to: today() })
    })
  }

  return new Contact({
    fullName: `${firstName} ${lastName}`,
    relationship,
    ...(relationship === RelationshipType.Other && {
      relationshipOther: 'Grandparent'
    }),
    contactPoints,
    patient_uuid: patient.uuid
  })
}

/**
 * Generate the communication needs a parent gives in a consent response or
 * clinic booking
 *
 * @param {Contact} contact - Contact responding
 * @returns {object} Whether they have communication needs, and what they are
 */
export function generateCommunicationNeeds(contact) {
  const hasCommunicationNeeds = faker.datatype.boolean(0.2)
  if (!hasCommunicationNeeds) {
    return { hasCommunicationNeeds }
  }

  // Parents saying they have communication needs always say what they are
  // (the service wouldn’t let them continue without doing so)
  const communicationNeeds = faker.helpers.arrayElement([
    ...(contact?.tel
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
 * Generate the contact preferences a parent gives in a consent response
 *
 * @param {Contact} contact - Contact
 * @returns {object} Whether they can get text messages, and any communication
 *   needs
 */
export function generateContactPreferences(contact) {
  const hasPhone = !!contact.firstActiveContactPoint(ContactPointType.Phone)

  // If telephone number provided, sometimes add a communication need
  const hasCommunicationNeeds = faker.datatype.boolean(0.2)
  let communicationNeeds
  if (hasPhone && hasCommunicationNeeds) {
    communicationNeeds =
      'I sometimes have difficulty hearing phone calls, so it’s best to send me a text message.'
  }

  return {
    ...(hasPhone && { canSms: faker.datatype.boolean(0.5) }),
    hasCommunicationNeeds,
    communicationNeeds
  }
}

/**
 * Generate the details a parent gives about themselves when responding to a
 * request for consent, or booking a clinic appointment
 *
 * These are the contact’s current phone numbers and email addresses, and
 * their contact preferences (the same as any they’ve given before)
 *
 * @param {Contact} contact - Contact responding
 * @param {object} options - Options
 * @param {Date} options.createdAt - When they responded
 * @param {ContactPointSource} options.source - How they responded
 * @returns {Contact} Details given in the response
 */
export function generateRespondentDetails(contact, { createdAt, source }) {
  // The text message preference defaults to ‘No’, so use whether the contact
  // has responded before to tell if they’ve given any preferences
  const hasResponded = contact.contactPoints.some(({ sources }) =>
    sources.some((source) =>
      [
        ContactPointSource.ConsentResponse,
        ContactPointSource.ClinicBooking
      ].includes(source)
    )
  )
  const preferences = hasResponded
    ? {
        canSms: contact.canSms,
        hasCommunicationNeeds: contact.hasCommunicationNeeds,
        communicationNeeds: contact.communicationNeeds
      }
    : generateContactPreferences(contact)

  return new Contact({
    uuid: contact.uuid,
    fullName: contact.fullName,
    relationship: contact.relationship,
    relationshipOther: contact.relationshipOther,
    hasParentalResponsibility: contact.hasParentalResponsibility,
    contactPoints: contact.activeContactPoints.map(
      ({ type, value, status }) => ({
        createdAt,
        type,
        value,
        status,
        sources: [source]
      })
    ),
    ...preferences,
    patient_uuid: contact.patient_uuid
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

  // Copy the contact points the parent still uses. They’re given in a consent
  // response, so `addConsentResponseDetails` adds their source
  const contactPoints = contact.activeContactPoints.map(
    ({ type, value, status }) => ({ type, value, status })
  )
  const hasPhone = contactPoints.some(
    ({ type }) => type === ContactPointType.Phone
  )
  const hasEmail = contactPoints.some(
    ({ type }) => type === ContactPointType.Email
  )
  const replaceValue = (type, value) => {
    const contactPoint = contactPoints.find((point) => point.type === type)
    if (contactPoint) {
      contactPoint.value = value
      contactPoint.status =
        type === ContactPointType.Email
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
      replaceValue(
        ContactPointType.Email,
        generateEmailAddress(firstName, lastName)
      )
      break
    }
    case 'tel':
      replaceValue(ContactPointType.Phone, generatePhoneNumber())
      break
    case 'email':
      replaceValue(
        ContactPointType.Email,
        generateEmailAddress(firstName, lastName)
      )
      break
  }

  return new Contact({
    fullName: `${firstName} ${lastName}`,
    relationship: contact.relationship,
    relationshipOther: contact.relationshipOther,
    contactPoints,
    patient_uuid: contact.patient_uuid
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
  const contacts = patients
    .filter((patient) => inUpload.has(patient.uuid) && !patient.isSensitive)
    .flatMap((patient) =>
      patient.contacts.filter(({ uuid }) =>
        patient.contact_uuids.includes(uuid)
      )
    )
    .filter(
      (contact) =>
        !contact.firstActiveContactPoint(ContactPointType.Phone) ||
        !contact.firstActiveContactPoint(ContactPointType.Email)
    )

  const contactChanges = {}
  for (const contact of faker.helpers.arrayElements(contacts, {
    min: 1,
    max: 5
  })) {
    const [firstName, ...lastNames] = contact.fullName.split(' ')

    contactChanges[contact.uuid] = []

    if (!contact.firstActiveContactPoint(ContactPointType.Phone)) {
      contactChanges[contact.uuid].push({
        type: ContactPointType.Phone,
        value: generatePhoneNumber()
      })
    }

    if (!contact.firstActiveContactPoint(ContactPointType.Email)) {
      contactChanges[contact.uuid].push({
        type: ContactPointType.Email,
        value: generateEmailAddress(firstName, lastNames.join(' '))
      })
    }
  }

  return contactChanges
}

/**
 * @import { Child, Patient, Upload } from '../models.js'
 */
