import { fakerEN_GB as faker } from '@faker-js/faker'
import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { UploadStatus, UploadType } from '../enums.js'
import { Move, Patient, School, User } from '../models.js'
import { formatDate, today } from '../utils/date.js'
import { getUploadStatus } from '../utils/status.js'
import {
  formatLink,
  formatProgress,
  formatTag,
  formatWithSecondaryText,
  formatYearGroup
} from '../utils/string.js'

/**
 * @class Upload
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {object} [context] - Global context
 * @property {string} id - Upload ID
 * @property {UploadStatus} status - Upload status
 * @property {UploadType} type - Upload type
 * @property {Date} [createdAt] - Created date
 * @property {string} [createdBy_uid] - User who created upload
 * @property {Date} [updatedAt] - Updated date
 * @property {string} [fileName] - Original file name
 * @property {number} [progress] - Upload import progress
 * @property {object} [validations] - File validations
 * @property {Array<string>} [patient_uuids] - Patient record UUIDs
 */
export class Upload {
  constructor(options, context) {
    this.context = context
    this.id = options?.id || faker.string.hexadecimal({ length: 8, prefix: '' })
    this.status = options?.status || UploadStatus.Processing
    this.type = options?.type || UploadType.Cohort
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdBy_uid = options?.createdBy_uid
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.updatedBy_uid = options?.updatedBy_uid
    this.fileName = options?.fileName
    this.progress = options?.progress || 100
    this.validations = options?.validations || []
    this.patient_uuids = options?.patient_uuids || []

    if (this.type === UploadType.School) {
      this.yearGroups = options?.yearGroups
      this.school_id = options?.school_id
    }
  }

  /**
   * Get user who created upload
   *
   * @returns {User|undefined} User
   */
  get createdBy() {
    try {
      if (this.createdBy_uid) {
        return User.findOne(this.createdBy_uid, this.context)
      }
    } catch (error) {
      console.error('Upload.createdBy', error.message)
    }
  }

  /**
   * Get user who approved upload
   *
   * @returns {User|undefined} User
   */
  get updatedBy() {
    try {
      if (this.updatedBy_uid) {
        return User.findOne(this.updatedBy_uid, this.context)
      }
    } catch (error) {
      console.error('Upload.updatedBy', error.message)
    }
  }

  /**
   * Get uploaded patient records
   *
   * @returns {Array<Patient>} Records
   */
  get patients() {
    if (this.context?.patients && this.patient_uuids) {
      let patients = this.patient_uuids.map((uuid) =>
        Patient.findOne(uuid, this.context)
      )

      if (this.type === UploadType.Report) {
        patients = patients
          .filter((patient) => patient.vaccinations.length > 0)
          .map((patient) => {
            patient.vaccination = patient.vaccinations[0]
            return patient
          })
      }

      // Simulate a subset of patient records being new
      // Use the existence of a second parent as a proxy for this
      patients = patients.map((patient) => {
        patient.isNew =
          patient.parent2 !== undefined && !patient.hasPendingChanges
        patient.hasMatch = !patient.parent2 && !patient.hasPendingChanges
        return patient
      })

      return patients
    }

    return []
  }

  /**
   * Get number of invalid patient records (no vaccination recorded)
   *
   * @returns {Array<Patient>|undefined} Invalid patient records
   */
  get invalid() {
    if (
      this.status === UploadStatus.Review &&
      this.type === UploadType.Report
    ) {
      if (this.context?.patients && this.patient_uuids) {
        return this.patient_uuids
          .map((uuid) => Patient.findOne(uuid, this.context))
          .filter((patient) => patient.vaccinations.length === 0)
      }

      return []
    }
  }

  /**
   * Upload needs review
   *
   * @returns {boolean} Upload needs review
   */
  get needsReview() {
    return this.status === UploadStatus.Review
  }

  /**
   * Get duplicate patient records in upload that need review
   *
   * @returns {Array<Patient>|undefined} Patient records with pending changes
   */
  get duplicates() {
    if (this.status === UploadStatus.Review) {
      if (this.patients) {
        return this.patients
          .filter((patient) => patient.hasPendingChanges)
          .sort((a, b) => a.firstName.localeCompare(b.firstName))
      }

      return []
    }
  }

  /**
   * Get patient school movements
   *
   * @returns {Array<Move>|undefined} Patient school movements
   */
  get moves() {
    if (this.status === UploadStatus.Review) {
      return Move.findAll(this.context).filter((move) =>
        this.patient_uuids.includes(move.patient_uuid)
      )
    }
  }

  /**
   * Get school
   *
   * @returns {object|undefined} School
   */
  get school() {
    if (this.type === UploadType.School && this.school_id) {
      return School.findOne(this.school_id, this.context)
    }
  }

  /**
   * Get formatted summary
   *
   * @returns {object} Formatted summaries
   */
  get summary() {
    return {
      type:
        this.type === UploadType.School
          ? formatWithSecondaryText(this.type, this.school?.name)
          : this.type
    }
  }

  /**
   * Get formatted links
   *
   * @returns {object} Formatted links
   */
  get link() {
    return {
      summary: formatWithSecondaryText(
        formatLink(this.uri, this.formatted.createdAt),
        this.fileName
      )
    }
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const yearGroups =
      this.yearGroups &&
      this.yearGroups
        .filter((yearGroup) => yearGroup !== '_unchecked')
        .map((yearGroup) => formatYearGroup(yearGroup))

    const createdAt = formatDate(this.createdAt, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
    const updatedAt = formatDate(this.updatedAt, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    return {
      createdAt,
      createdBy: this.createdBy?.fullName,
      created: `${createdAt} by ${this.createdBy?.fullName}`,
      updatedAt,
      updatedBy: this.updatedBy?.fullName,
      updated: this.updatedAt && `${updatedAt} by ${this.updatedBy?.fullName}`,
      ...(this.type === UploadType.School && {
        school: this.school?.name,
        yearGroups: prototypeFilters.formatList(yearGroups)
      }),
      ...(this.type === UploadType.School && {
        school: this.school?.name,
        yearGroups: prototypeFilters.formatList(yearGroups)
      }),
      patients: this.patients.length,
      status:
        this.status === UploadStatus.Processing
          ? formatProgress(this.progress)
          : formatTag(getUploadStatus(this.status))
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'upload'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/uploads/${this.id}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Upload>|undefined} Uploads
   * @static
   */
  static findAll(context) {
    return Object.values(context.uploads).map(
      (upload) => new Upload(upload, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} id - Upload ID
   * @param {object} context - Context
   * @returns {Upload|undefined} Upload
   * @static
   */
  static findOne(id, context) {
    if (context.uploads?.[id]) {
      return new Upload(context.uploads[id], context)
    }
  }

  /**
   * Create
   *
   * @param {object} upload - Upload
   * @param {object} context - Context
   * @returns {Upload} Created upload
   * @static
   */
  static create(upload, context) {
    const createdUpload = new Upload(upload)

    // Update context
    context.uploads = context.uploads || {}
    context.uploads[createdUpload.id] = createdUpload

    return createdUpload
  }

  /**
   * Update
   *
   * @param {string} id - Upload ID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Upload} Updated upload
   * @static
   */
  static update(id, updates, context) {
    const updatedUpload = Object.assign(Upload.findOne(id, context), updates)
    updatedUpload.updatedAt = today()

    // Remove upload context
    delete updatedUpload.context

    // Delete original upload (with previous ID)
    delete context.uploads[id]

    // Update context
    context.uploads[updatedUpload.id] = updatedUpload

    return updatedUpload
  }

  /**
   * Delete
   *
   * @param {string} id - Upload ID
   * @param {object} context - Context
   * @static
   */
  static delete(id, context) {
    delete context.uploads[id]
  }
}
