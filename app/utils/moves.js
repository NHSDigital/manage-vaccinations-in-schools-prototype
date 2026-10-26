import { generateUploadMoves } from '../generators/move.js'
import { Move, Patient } from '../models.js'

/**
 * Get school moves reported by an upload
 *
 * @param {string} upload_id - Upload ID
 * @param {object} context - Context
 * @returns {Array<Move>} School moves
 */
export function getUploadMoves(upload_id, context) {
  return Move.findAll(context).filter((move) => move.upload_id === upload_id)
}

/**
 * Delete school moves reported by an upload
 * For example, when a file is re-uploaded, or the upload is deleted
 *
 * @param {string} upload_id - Upload ID
 * @param {object} context - Context
 */
export function deleteUploadMoves(upload_id, context) {
  for (const move of getUploadMoves(upload_id, context)) {
    Move.delete(move.uuid, context)
  }
}

/**
 * Save school moves
 *
 * @param {Array<Move>} moves - School moves
 * @param {object} context - Context
 * @returns {Array<Move>} Saved school moves
 */
export function createMoves(moves, context) {
  return moves.map((move) => Move.create(move, context))
}

/**
 * Create school moves reported by an upload
 *
 * Replaces any moves reported by a previous file. Finding moves can change
 * which patients an upload includes (pupils leaving a school are not in its
 * class list), so the upload’s patients are updated too.
 *
 * @param {Upload} upload - Upload
 * @param {object} context - Context
 * @returns {Array<Move>} Saved school moves
 */
export function createUploadMoves(upload, context) {
  deleteUploadMoves(upload.id, context)

  const { patient_uuids, moves } = generateUploadMoves(
    upload,
    Patient.findAll(context)
  )
  upload.patient_uuids = patient_uuids

  return createMoves(moves, context)
}

/**
 * School move is visible to SAIS teams
 *
 * A move reported by an upload is only visible once that upload needs review
 * or has been approved. Until then, it may be private to a school admin, or
 * the upload may have been rejected.
 *
 * @param {Move} move - School move
 * @returns {boolean} Move is visible to SAIS teams
 */
export function isMoveVisibleToTeam(move) {
  if (!move.upload_id) {
    return true
  }

  return Boolean(move.upload?.movesAreVisibleToTeam)
}

/**
 * Get patients moving into a school
 *
 * @param {Array<Move>} moves - School moves
 * @param {string} school_id - School ID
 * @returns {Array<Patient>} Patient records
 */
export function getPatientsMovingIn(moves, school_id) {
  return moves
    .filter((move) => move.to_urn === school_id)
    .map((move) => move.patient)
    .filter(Boolean)
}

/**
 * Get patients moving out of a school
 *
 * @param {Array<Move>} moves - School moves
 * @param {string} school_id - School ID
 * @returns {Array<Patient>} Patient records
 */
export function getPatientsMovingOut(moves, school_id) {
  return moves
    .filter((move) => move.from_urn === school_id)
    .map((move) => move.patient)
    .filter(Boolean)
}

/**
 * @import { Upload } from '../models.js'
 */
