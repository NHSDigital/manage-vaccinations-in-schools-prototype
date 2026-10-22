import { fakerEN_GB as faker } from '@faker-js/faker'

import schoolsData from '../datasets/schools.js'
import { MoveSource, UploadType } from '../enums.js'
import { Move } from '../models.js'

/**
 * URN used for children whose school is not known
 */
const UNKNOWN_SCHOOL_URN = '888888'

/**
 * Upload has a file that could report school moves
 * A file must have been uploaded, and passed validation and data checks
 *
 * @param {Upload} upload - Upload
 * @returns {boolean} Upload can report school moves
 */
function canReportMoves(upload) {
  const hasValidationErrors = Object.keys(upload.validations || {}).length > 0

  return Boolean(upload.uploadedAt) && !hasValidationErrors && !upload.hasFailed
}

/**
 * Patient can be given a school move
 * Patients with a pending change to their school are excluded, as that change
 * is reviewed as part of a duplicate record instead
 *
 * @param {Patient} patient - Patient
 * @returns {boolean} Patient can be given a school move
 */
function canMove(patient) {
  return !patient.pendingChanges?.school_id
}

/**
 * Generate a school move reported by an upload
 *
 * @param {Upload} upload - Upload reporting move
 * @param {Patient} patient - Patient moving school
 * @param {string} from_urn - URN of school moving from
 * @param {string} to_urn - URN of school moving to
 * @returns {Move} School move
 */
function generateMove(upload, patient, from_urn, to_urn) {
  return new Move({
    createdAt: upload.uploadedAt,
    source:
      upload.type === UploadType.School ? MoveSource.School : MoveSource.Cohort,
    from_urn,
    to_urn,
    patient_uuid: patient.uuid,
    upload_id: upload.id
  })
}

/**
 * Get IDs of schools with patients, grouped by school phase
 * Home-educated children and children at unknown schools have no phase, so
 * are not included
 *
 * @param {Array<Patient>} patients - Patient records
 * @returns {Map<string, Array<string>>} School IDs, keyed by phase
 */
function getSchoolIdsByPhase(patients) {
  const schoolIdsByPhase = new Map()

  for (const school_id of new Set(patients.map(({ school_id }) => school_id))) {
    const phase = schoolsData.find(({ id }) => id === school_id)?.phase
    if (phase) {
      schoolIdsByPhase.set(phase, [
        ...(schoolIdsByPhase.get(phase) || []),
        school_id
      ])
    }
  }

  return schoolIdsByPhase
}

/**
 * Generate school moves found in a class list
 *
 * A class list lists the pupils a school says attend it, in the year groups
 * it was uploaded for. Comparing it with Mavis finds two kinds of move:
 *
 * - Joining: pupils in the class list who Mavis records as attending another
 *   school. These are added to the class list, with a move from their current
 *   school to this one.
 * - Leaving: pupils who Mavis records as attending this school, but who are
 *   missing from the class list. These are removed from the class list, with a
 *   move to an unknown school (a class list doesn’t say where a pupil went).
 *
 * @param {Upload} upload - Class list upload
 * @param {Array<Patient>} patients - All patient records
 * @returns {{ patient_uuids: Array<string>, moves: Array<Move> }} Patient
 *   records in the class list, and moves it reports
 */
function generateClassListMoves(upload, patients) {
  const yearGroups = (upload.yearGroups || []).map(Number)
  const inClassList = new Set(upload.patient_uuids)

  // Pick 1–5 pupils at other schools, in the year groups uploaded for
  const joining = faker.helpers.arrayElements(
    patients.filter(
      (patient) =>
        canMove(patient) &&
        patient.school_id !== upload.school_id &&
        yearGroups.includes(patient.yearGroup)
    ),
    { min: 1, max: 5 }
  )

  // Pick 1–5 pupils at this school
  const leaving = faker.helpers.arrayElements(
    patients.filter(
      (patient) => canMove(patient) && inClassList.has(patient.uuid)
    ),
    { min: 1, max: 5 }
  )
  const leavingUuids = new Set(leaving.map(({ uuid }) => uuid))

  return {
    patient_uuids: [
      ...upload.patient_uuids.filter((uuid) => !leavingUuids.has(uuid)),
      ...joining.map(({ uuid }) => uuid)
    ],
    moves: [
      ...joining.map((patient) =>
        generateMove(upload, patient, patient.school_id, upload.school_id)
      ),
      ...leaving.map((patient) =>
        generateMove(upload, patient, upload.school_id, UNKNOWN_SCHOOL_URN)
      )
    ]
  }
}

/**
 * Generate school moves found in cohort records
 *
 * Cohort records include each child’s school. Where this differs from the
 * school Mavis records, the child has moved school. Children are moved to
 * another school of the same phase (primary to primary, secondary to
 * secondary), chosen from schools that already have patients so that every
 * move is to a school in Mavis.
 *
 * @param {Upload} upload - Cohort upload
 * @param {Array<Patient>} patients - All patient records
 * @returns {{ patient_uuids: Array<string>, moves: Array<Move> }} Patient
 *   records in the cohort upload (unchanged), and moves it reports
 */
function generateCohortMoves(upload, patients) {
  const inCohort = new Set(upload.patient_uuids)
  const schoolIdsByPhase = getSchoolIdsByPhase(patients)

  // Other schools a patient could move to
  const getOtherSchoolIds = (patient) => {
    for (const schoolIds of schoolIdsByPhase.values()) {
      if (schoolIds.includes(patient.school_id)) {
        return schoolIds.filter((school_id) => school_id !== patient.school_id)
      }
    }

    return []
  }

  // Pick 3–8 children in the cohort who have another school to move to
  const moving = faker.helpers.arrayElements(
    patients.filter(
      (patient) =>
        canMove(patient) &&
        inCohort.has(patient.uuid) &&
        getOtherSchoolIds(patient).length > 0
    ),
    { min: 3, max: 8 }
  )

  return {
    patient_uuids: upload.patient_uuids,
    moves: moving.map((patient) =>
      generateMove(
        upload,
        patient,
        patient.school_id,
        faker.helpers.arrayElement(getOtherSchoolIds(patient))
      )
    )
  }
}

/**
 * Generate school moves found in an upload
 *
 * When a file is uploaded, the records in it are compared with those in
 * Mavis. Where a child’s school differs, the upload reports a school move,
 * which a SAIS team then reviews. Each move is linked to the upload that
 * reported it, so that school admins and SAIS teams see the same moves.
 *
 * Moves are only found in files that were uploaded and passed validation and
 * data checks. Only class lists and cohort records include a child’s school,
 * so vaccination records never report moves.
 *
 * Finding moves can change which patients an upload includes (for example,
 * pupils leaving a school are not in its class list), so the upload’s patient
 * records are returned alongside the moves.
 *
 * @param {Upload} upload - Upload
 * @param {Array<Patient>} patients - All patient records
 * @returns {{ patient_uuids: Array<string>, moves: Array<Move> }} Patient
 *   records in the upload, and moves it reports
 */
export function generateUploadMoves(upload, patients) {
  if (!canReportMoves(upload)) {
    return { patient_uuids: upload.patient_uuids, moves: [] }
  }

  switch (upload.type) {
    case UploadType.School:
      return generateClassListMoves(upload, patients)
    case UploadType.Cohort:
      return generateCohortMoves(upload, patients)
    default:
      return { patient_uuids: upload.patient_uuids, moves: [] }
  }
}

/**
 * @import { Patient, Upload } from '../models.js'
 */
