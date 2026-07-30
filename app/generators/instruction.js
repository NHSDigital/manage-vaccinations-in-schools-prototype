import { Instruction } from '../models.js'
import { removeDays } from '../utils/date.js'

/**
 * Generate fake PSD instruction
 *
 * @param {Programme} programme - Programme
 * @param {Session} session - Session
 * @param {User} user - User
 * @returns {Instruction} PSD instruction
 */
export function generateInstruction(programme, session, user) {
  return new Instruction({
    createdAt: removeDays(session.date, 7),
    createdBy_uid: user.uid,
    programme_id: programme?.id
  })
}

/**
 * @import { PatientSession, Programme, Session, User } from '../models.js'
 */
