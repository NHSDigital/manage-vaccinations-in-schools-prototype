import { fakerEN_GB as faker } from '@faker-js/faker'
import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { UploadStatus, UploadType } from '../enums.js'
import { Move, Patient, School, User } from '../models.js'
import { formatDate, today } from '../utils/date.js'
import { getUploadStatusProperties } from '../utils/enum-properties.js'
import {
  formatLink,
  formatList,
  formatProgress,
  formatTag,
  formatWithSecondaryText,
  formatYearGroup,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} UploadOptions
 * @property {string} [id] - Upload ID
 * @property {Date} [requestedAt] - Upload requested at
 * @property {UploadFormat} [format] - Upload format
 * @property {UploadStatus} [status] - Upload status
 * @property {UploadType} [type] - Upload type
 * @property {string} [fileName] - Original file name
 * @property {string} [rejectionReason] - Rejection reason
 * @property {object} [validations] - File validations
 * @property {boolean} [hasFailed] - Records failed data integrity checks
 * @property {boolean} [isApproved] - Upload approved
 * @property {Array<number>} [yearGroups] - Year groups
 * @property {Array<string>} [patient_uuids] - Patient record UUIDs
 * @property {Array<string>} [assignee_uids] - School user UIDs request sent to
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
    this.requestedBy_uid

    /** @type {User|undefined} */
    this.requestedBy

    /** @type {string|undefined} */
    this.school_id

    /** @type {School|undefined} */
    this.school

    this.context = context
    this.id = options?.id || faker.string.hexadecimal({ length: 8, prefix: '' })
    this.format = options?.format
    this.type = options?.type || UploadType.Cohort
    this.fileName = options?.fileName
    this.requestedAt = options?.requestedAt && new Date(options.requestedAt)
    this.rejectionReason = options?.rejectionReason
    this.validations = options?.validations || []
    this.hasFailed = stringToBoolean(options?.hasFailed)
    this.isApproved = stringToBoolean(options?.isApproved)
    this.patient_uuids = stringToArray(options?.patient_uuids)
    this.assignee_uids = stringToArray(options?.assignee_uids)

    if (this.type === UploadType.School) {
      this.yearGroups = stringToArray(options?.yearGroups)
    }
  }

  /**
   * School users request sent to
   *
   * @returns {Array<User>} School users
   */
  get assignees() {
    return this.assignee_uids.map((uid) => User.findOne(uid, this.context))
  }

  /**
   * Upload is processed
   * An upload is processed if approved/reject or was recently submitted by a
   * school administrator
   *
   * @returns {boolean} Upload is processed
   */
  get isProcessed() {
    return (
      Object.keys(this.validations).length > 0 ||
      this.isApproved !== undefined ||
      this.updatedBy?.isSchoolUser
    )
  }

  /**
   * Get upload progress
   * Fake this by getting number of seconds since upload created
   *
   * @returns {number} Progress
   */
  get progress() {
    if (this.isProcessed) {
      return 100
    }

    const date = this.updatedAt || this.createdAt
    const seconds = (today().getTime() - new Date(date).getTime()) / 1000
    const speedIncrease = 8

    return Math.min(Math.floor(seconds * speedIncrease), 100)
  }

  /**
   * Can delete upload
   *
   * @returns {boolean} Can delete upload
   */
  get canDelete() {
    return ![
      UploadStatus.Requested,
      UploadStatus.Processing,
      UploadStatus.Approved
    ].includes(this.status)
  }

  /**
   * Get status
   *
   * @returns {UploadStatus} Status
   */
  get status() {
    if (this.requestedBy_uid) {
      return UploadStatus.Requested
    }

    if (this.progress < 100) {
      return UploadStatus.Processing
    }

    switch (true) {
      case Object.keys(this.validations).length > 0:
        return UploadStatus.Invalid
      case this.hasFailed === true:
        return UploadStatus.Failed
      case this.updatedBy?.isSchoolUser:
        return UploadStatus.Submitted
      case this.isApproved === true:
        return UploadStatus.Approved
      case this.isApproved === false:
        return UploadStatus.Rejected
      default:
        return UploadStatus.Review
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
            case 'requestedBy':
              return this.requestedBy?.fullName
            case 'assignees':
              return formatList(
                this.assignees.map((assignee) => assignee.fullName)
              )
            case 'isApproved':
              return this.isApproved === true
                ? this.updatedAt &&
                    `${getUpdatedAt()} by ${this.updatedBy?.fullName}`
                : ''
            case 'isRejected':
              return this.isApproved === false
                ? this.updatedAt &&
                    `${getUpdatedAt()} by ${this.updatedBy?.fullName}`
                : ''
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
                : formatTag(getUploadStatusProperties(this.status))
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

Upload.relate('requestedBy_uid', () => User, 'requestedBy')
Upload.relate('school_id', () => School, 'school')

/**
 * @import { UploadFormat } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
