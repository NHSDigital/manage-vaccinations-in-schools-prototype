import { Instruction } from '../models.js'
import { removeDays } from '../utils/date.js'

/**
 * Generate fake PSD instruction
 *
 * @param {PatientSession} patientSession - Patient session
 * @param {User} user - User
 * @returns {Instruction} PSD instruction
 */
export function generateInstruction(patientSession, user) {
  return new Instruction({
    createdAt: removeDays(patientSession.session.date, 7),
    createdBy_uid: user.uid,
    programme_id: patientSession.programme?.id
  })
}

/**
 * @import { PatientSession, User } from '../models.js'
 */
