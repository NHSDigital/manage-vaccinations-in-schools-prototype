import { fakerEN_GB as faker } from '@faker-js/faker'

import { NotifyStatus } from '../enums.js'
import { Contact, Relationship } from '../models.js'

/**
 * Generate fake contact
 *
 * @param {Relationship} relationship - Relationship
 * @returns {Contact} Contact
 */
export function generateContact(relationship) {
  const firstName = relationship.fullName.split(' ')[0]
  const lastName = relationship.fullName.split(' ').at(-1)
  const email = faker.internet.email({ firstName, lastName }).toLowerCase()
  const tel = '077## 9#####'.replace(/#+/g, (m) =>
    faker.string.numeric(m.length)
  )

  return new Contact({
    identifier: faker.helpers.arrayElement([email, tel]),
    status: faker.helpers.weightedArrayElement([
      { value: NotifyStatus.Delivered, weight: 100 },
      { value: NotifyStatus.Permanent, weight: 10 },
      { value: NotifyStatus.Temporary, weight: 5 },
      { value: NotifyStatus.Technical, weight: 1 }
    ]),
    relationship_uuid: relationship.uuid
  })
}
