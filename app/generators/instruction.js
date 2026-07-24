import { fakerEN_GB as faker } from '@faker-js/faker'

import { Instruction } from '../models.js'
import { removeDays } from '../utils/date.js'

/**
 * Generate fake PSD instruction
 *
 * @param {Programme} programme - Programme
 * @param {Session} session - Session
 * @param {Array<User>} users - Users
 * @returns {Instruction} PSD instruction
 */
export function generateInstruction(programme, session, users) {
  const user = faker.helpers.arrayElement(users)

  return new Instruction({
    createdAt: removeDays(session.date, 7),
    createdBy_uid: user.uid,
    programme_id: programme?.id
  })
}

/**
 * @import { PatientSession, Programme, Session, User } from '../models.js'
 */
