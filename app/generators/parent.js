import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  NotifyEmailStatus,
  ParentalRelationship,
  NotifySmsStatus
} from '../enums.js'
import { Parent } from '../models.js'

/**
 * Generate fake parent
 *
 * @param {string} childLastName - Child’s last name
 * @param {boolean} [isMum] - Parent is child’s mother
 * @returns {Parent} Parent
 */
export function generateParent(childLastName, isMum) {
  // Relationship
  const relationship = isMum
    ? ParentalRelationship.Mum
    : faker.helpers.weightedArrayElement([
        { value: ParentalRelationship.Dad, weight: 3 },
        { value: ParentalRelationship.Guardian, weight: 1 },
        { value: ParentalRelationship.Other, weight: 1 }
      ])

  // Name
  let firstName
  let lastName
  switch (relationship) {
    case ParentalRelationship.Mum:
      firstName = faker.person.firstName('female').replace(`'`, '’')
      lastName = childLastName
      break
    case ParentalRelationship.Dad:
      firstName = faker.person.firstName('male').replace(`'`, '’')
      lastName = childLastName
      break
    default:
      firstName = faker.person.firstName().replace(`'`, '’')
      lastName = faker.person.lastName().replace(`'`, '’')
  }

  // Contact details
  const phoneNumber = '077## 9#####'.replace(/#+/g, (m) =>
    faker.string.numeric(m.length)
  )
  const tel = faker.helpers.maybe(() => phoneNumber, { probability: 0.4 })

  const sms = faker.datatype.boolean(0.5)
  const smsStatus = faker.helpers.weightedArrayElement([
    { value: NotifySmsStatus.Delivered, weight: 100 },
    { value: NotifySmsStatus.Permanent, weight: 10 },
    { value: NotifySmsStatus.Temporary, weight: 5 },
    { value: NotifySmsStatus.Technical, weight: 1 }
  ])

  const emailAddress = faker.internet
    .email({ firstName, lastName })
    .toLowerCase()
  const email = faker.helpers.maybe(() => emailAddress, { probability: 0.8 })
  const emailStatus = faker.helpers.weightedArrayElement([
    { value: NotifyEmailStatus.Delivered, weight: 100 },
    { value: NotifyEmailStatus.Permanent, weight: 10 },
    { value: NotifyEmailStatus.Temporary, weight: 5 },
    { value: NotifyEmailStatus.Technical, weight: 1 }
  ])

  const contactPreference = faker.datatype.boolean(0.2)

  return new Parent({
    fullName: `${firstName} ${lastName}`,
    relationship,
    ...(relationship === ParentalRelationship.Other && {
      relationshipOther: 'Foster parent'
    }),
    ...(email && {
      email,
      ...(emailStatus && { emailStatus })
    }),
    ...(tel && {
      tel,
      sms,
      ...(smsStatus && { smsStatus }),
      contactPreference,
      ...(contactPreference && {
        contactPreferenceDetails:
          'I sometimes have difficulty hearing phone calls, so it’s best to send me a text message.'
      })
    })
  })
}
