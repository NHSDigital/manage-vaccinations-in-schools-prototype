import { fakerEN_GB as faker } from '@faker-js/faker'

import { Team } from '../models.js'

/**
 * Generate fake team
 *
 * @returns {Team} Team
 */
export function generateTeam() {
  const ods = faker.helpers.replaceSymbols('???')

  return new Team({
    ods,
    name: `${faker.location.county()} Child Immunisation Service`,
    email: faker.internet
      .email({
        firstName: ods,
        lastName: 'sais',
        provider: 'example.nhs.net'
      })
      .toLowerCase(),
    tel: '01### ######'.replace(/#+/g, (m) => faker.string.numeric(m.length))
  })
}
