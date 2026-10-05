import { fakerEN_GB as faker } from '@faker-js/faker'

import { RelationshipType } from '../enums.js'
import { Relationship } from '../models.js'

/**
 * Generate fake relationship
 *
 * @param {Child|Patient} patient - Child
 * @param {boolean} [isMum] - Contact is child’s mother
 * @returns {Relationship} Relationship
 */
export function generateRelationship(patient, isMum) {
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
      firstName = faker.person.firstName('female').replace(`'`, '’')
      lastName = patient.lastName
      break
    case RelationshipType.Dad:
      firstName = faker.person.firstName('male').replace(`'`, '’')
      lastName = patient.lastName
      break
    default:
      firstName = faker.person.firstName().replace(`'`, '’')
      lastName = faker.person.lastName().replace(`'`, '’')
  }

  // Contact preferences
  const canSms = faker.datatype.boolean(0.5)
  const hasCommunicationNeeds = faker.datatype.boolean(0.2)
  let communicationNeeds
  if (hasCommunicationNeeds) {
    communicationNeeds =
      'I sometimes have difficulty hearing phone calls, so it’s best to send me a text message.'
  }

  return new Relationship({
    fullName: `${firstName} ${lastName}`,
    relationship,
    ...(relationship === RelationshipType.Other && {
      relationshipOther: 'Grandparent'
    }),
    canSms,
    hasCommunicationNeeds,
    communicationNeeds,
    patient_uuid: patient.uuid
  })
}

/**
 * @import { Child, Patient } from '../models.js'
 */
