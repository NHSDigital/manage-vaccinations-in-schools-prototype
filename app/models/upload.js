import { fakerEN_GB as faker } from '@faker-js/faker'
import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { UploadStatus, UploadType } from '../enums.js'
import { Move, Patient, School } from '../models.js'
import { formatDate } from '../utils/date.js'
import { getUploadStatus } from '../utils/status.js'
import {
  formatLink,
  formatProgress,
  formatTag,
  formatWithSecondaryText,
  formatYearGroup,
  stringToArray
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} UploadOptions
 * @property {string} [id] - Upload ID
 * @property {UploadStatus} [status] - Upload status
 * @property {UploadType} [type] - Upload type
 * @property {string} [fileName] - Original file name
 * @property {number} [progress] - Upload import progress
 * @property {object} [validations] - File validations
 * @property {Array<number>} [yearGroups] - Year groups
 * @property {Array<string>} [patient_uuids] - Patient record UUIDs
 */

/**
 * @class Upload
 */
export class Upload extends BaseModel {
  static contextKey = 'uploads'
  static identifierKey = 'id'
  static ns = 'upload'

  /**
   * @param {UploadOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.school_id

    /** @type {School|undefined} */
    this.school

    this.context = context
    this.id = options?.id || faker.string.hexadecimal({ length: 8, prefix: '' })
    this.status = options?.status || UploadStatus.Processing
    this.type = options?.type || UploadType.Cohort
    this.fileName = options?.fileName
    this.progress = options?.progress || 100
    this.validations = options?.validations || []
    this.patient_uuids = options?.patient_uuids || []

    if (this.type === UploadType.School) {
      this.yearGroups = stringToArray(options?.yearGroups)
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
        patients = patients.filter((patient) => patient.vaccinations.length > 0)
      }

      return patients
    }

    return []
  }

  /**
   * Upload needs review
   *
   * @returns {boolean} Upload needs review
   */
  get requiresReview() {
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
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          // Lazy formatting of timestamps
          const getCreatedAt = () =>
            formatDate(this.createdAt, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })

          const getUpdatedAt = () =>
            formatDate(this.updatedAt, {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            })

          switch (prop) {
            case 'createdAt':
              return getCreatedAt()
            case 'createdBy':
              return this.createdBy?.fullName
            case 'created':
              return `${getCreatedAt()} by ${this.createdBy?.fullName}`
            case 'updatedAt':
              return getUpdatedAt()
            case 'updatedBy':
              return this.updatedBy?.fullName
            case 'updated':
              return (
                this.updatedAt &&
                `${getUpdatedAt()} by ${this.updatedBy?.fullName}`
              )
            case 'school':
              if (this.type !== UploadType.School) return undefined
              return this.school?.name
            case 'yearGroups': {
              if (this.type !== UploadType.School) return undefined
              const yearGroups = this.yearGroups?.map((item) =>
                formatYearGroup(item)
              )
              return prototypeFilters.formatList(yearGroups)
            }
            case 'patients':
              return this.patients.length
            case 'status':
              return this.status === UploadStatus.Processing
                ? formatProgress(this.progress)
                : formatTag(getUploadStatus(this.status))
            default:
              return undefined
          }
        }
      }
    )
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/uploads/${this.id}`
  }
}

Upload.relate('school_id', () => School, 'school')

/**
 * @import { BaseModelOptions } from './base.js'
 */
