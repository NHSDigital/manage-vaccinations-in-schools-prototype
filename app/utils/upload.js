import { UploadFormat, UploadOutcome, UploadType } from '../enums.js'
import { Patient } from '../models.js'

import { createUploadMoves } from './moves.js'

/**
 * Get outcome of processing a file uploaded in the prototype
 *
 * Prototype scenario: choosing ‘None of the above’ (Mavis CSV) as the format
 * means the file was in the wrong format. Only school admins are asked for a
 * format. A corrected file always passes.
 *
 * @param {Upload} upload - Upload
 * @param {boolean} [isCorrection] - File replaces an earlier one
 * @returns {UploadOutcome} Upload outcome
 */
export function getUploadOutcome(upload, isCorrection) {
  if (!isCorrection && upload.format === UploadFormat.Mavis) {
    return UploadOutcome.WrongFormat
  }

  return UploadOutcome.Valid
}

/**
 * Select patients a file of this type would contain
 * Children who have aged out of programmes are not included.
 *
 * @param {Upload} upload - Upload
 * @param {Array<Patient>} patients - All patients
 * @returns {Array<Patient>} Selected patients
 */
export function getUploadPatients(upload, patients) {
  const eligiblePatients = patients.filter(
    (patient) => !patient.hasAgedOutOfProgrammes
  )

  switch (upload.type) {
    case UploadType.School:
      // Pupils at the school in the chosen year groups
      return eligiblePatients.filter(
        (patient) =>
          upload.school_id === patient.school_id &&
          upload.yearGroups.map(Number).includes(patient.yearGroup)
      )
    case UploadType.Report:
      // Patients with vaccination records
      return eligiblePatients.filter(
        (patient) => patient.vaccinations.length > 0
      )
    default:
      return eligiblePatients
  }
}

/**
 * Generate validation errors for a file
 *
 * A file in the wrong format has errors on every row; an invalid file has
 * errors on a few rows. Other files have none.
 *
 * @param {UploadOutcome} outcome - Outcome of processing the file
 * @param {Array<Patient>} [patients] - Patients in the file
 * @returns {object} Validation errors, keyed by row number
 */
export function getUploadValidations(outcome, patients) {
  switch (outcome) {
    case UploadOutcome.WrongFormat: {
      const validations = {}

      for (const [i, patient] of patients.entries()) {
        validations[i + 1] = {
          CHILD_FIRST_NAME: 'is required but missing',
          CHILD_DOB: `‘${patient.firstName}’ should be formatted as YYYY-MM-DD`,
          CHILD_POSTCODE: `‘${patient.address.addressLine1}’ should be a postcode, like SW1A 1AA`
        }
      }

      return validations
    }
    case UploadOutcome.Invalid:
      return {
        3: {
          CHILD_FIRST_NAME: 'is required but missing',
          CHILD_POSTCODE:
            '‘24 High Street’ should be a postcode, like SW1A 1AA',
          CHILD_NHS_NUMBER:
            '‘QQ 12 34 56 A’ should be a valid NHS number, like 485 777 3456'
        },
        8: {
          CHILD_DOB: '‘Simon’ should be formatted as YYYY-MM-DD'
        }
      }
    default:
      return {}
  }
}

/**
 * Process an uploaded file
 *
 * Simulates what Mavis does with a file: finds the patients in it, checks it
 * for errors and, if it passes, finds any school moves it reports.
 *
 * @param {Upload} upload - Upload (must have been uploaded)
 * @param {UploadOutcome} uploadOutcome - Outcome of processing the file
 * @param {object} context - Context
 * @returns {Upload} Processed upload
 */
export function processUpload(upload, uploadOutcome, context) {
  const patients = getUploadPatients(upload, Patient.findAll(context))

  upload.patient_uuids = patients.map(({ uuid }) => uuid)
  upload.validations = getUploadValidations(uploadOutcome, patients)
  upload.hasFailed = uploadOutcome === UploadOutcome.Failed

  createUploadMoves(upload, context)

  return upload
}

/**
 * @import { Upload } from '../models.js'
 */
