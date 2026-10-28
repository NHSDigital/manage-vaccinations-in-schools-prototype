import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  SchoolUploadStatus,
  TeamUploadStatus,
  UploadStatus,
  UploadType
} from '../enums.js'
import { Patient, School, User } from '../models.js'
import { formatDate, today } from '../utils/date.js'
import { getUploadStatusProperties } from '../utils/enum-properties.js'
import {
  getPatientsMovingIn,
  getPatientsMovingOut,
  getUploadMoves
} from '../utils/moves.js'
import {
  formatList,
  formatProgress,
  formatTag,
  formatYearGroups,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} UploadOptions
 * @property {string} [id] - Upload ID
 * @property {UploadFormat} [format] - Upload format
 * @property {UploadType} [type] - Upload type
 * @property {string} [fileName] - Original file name
 * @property {Date} [requestedAt] - Upload requested from school at
 * @property {string} [requestedBy_uid] - Upload requested from school by
 * @property {Date} [uploadedAt] - File uploaded at
 * @property {string} [uploadedBy_uid] - File uploaded by
 * @property {Date} [submittedAt] - Sent for approval by school at
 * @property {string} [submittedBy_uid] - Sent for approval by school by
 * @property {Date} [approvedAt] - Approved at
 * @property {string} [approvedBy_uid] - Approved by
 * @property {Date} [rejectedAt] - Rejected at
 * @property {string} [rejectedBy_uid] - Rejected by
 * @property {string} [rejectionReason] - Rejection reason
 * @property {object} [validations] - File validations, keyed by row number
 * @property {boolean} [hasFailed] - Records failed data integrity checks
 * @property {Array<number>} [yearGroups] - Year groups
 * @property {Array<string>} [patient_uuids] - Patient record UUIDs
 * @property {Array<string>} [assignee_emails] - School emails request sent to
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
    this.uploadedBy_uid

    /** @type {User|undefined} */
    this.uploadedBy

    /** @type {string|undefined} */
    this.submittedBy_uid

    /** @type {User|undefined} */
    this.submittedBy

    /** @type {string|undefined} */
    this.approvedBy_uid

    /** @type {User|undefined} */
    this.approvedBy

    /** @type {string|undefined} */
    this.rejectedBy_uid

    /** @type {User|undefined} */
    this.rejectedBy

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
    this.uploadedAt = options?.uploadedAt && new Date(options.uploadedAt)
    this.submittedAt = options?.submittedAt && new Date(options.submittedAt)
    this.approvedAt = options?.approvedAt && new Date(options.approvedAt)
    this.rejectedAt = options?.rejectedAt && new Date(options.rejectedAt)
    this.rejectionReason = options?.rejectionReason
    this.validations = options?.validations || {}
    this.hasFailed = stringToBoolean(options?.hasFailed)
    this.patient_uuids = stringToArray(options?.patient_uuids)
    this.assignee_emails = stringToArray(options?.assignee_emails)

    if (this.type === UploadType.School) {
      this.yearGroups = stringToArray(options?.yearGroups)
    }
  }

  /**
   * File has validation errors
   *
   * @returns {boolean} File has validation errors
   */
  get hasValidationErrors() {
    return Object.keys(this.validations).length > 0
  }

  /**
   * Get upload progress
   * Fake this by getting number of seconds since file was uploaded. Files with
   * validation errors are rejected immediately, before any processing.
   *
   * @returns {number} Progress
   */
  get progress() {
    if (!this.uploadedAt) {
      return 0
    }

    if (this.hasValidationErrors) {
      return 100
    }

    const seconds = (today().getTime() - this.uploadedAt.getTime()) / 1000
    const speedIncrease = 8

    return Math.min(Math.floor(seconds * speedIncrease), 100)
  }

  /**
   * Records need checking by a school admin before being sent for approval
   *
   * @returns {boolean} Needs checking
   */
  get needsChecking() {
    return this.status === UploadStatus.Pending
  }

  /**
   * Records submitted to SAIS team for approval
   *
   * @returns {boolean} Submitted
   */
  get isSubmitted() {
    return this.schoolStatus === SchoolUploadStatus.Submitted
  }

  /**
   * Records need review before approval
   *
   * @returns {boolean} Needs review
   */
  get needsReview() {
    return this.status == UploadStatus.Review
  }

  /**
   * School moves reported by this upload are visible to SAIS teams
   * Only once the upload needs review or has been approved; until then it may
   * be private to a school admin, or the upload may have been rejected.
   *
   * @returns {boolean} School moves are visible to SAIS teams
   */
  get movesAreVisibleToTeam() {
    return [UploadStatus.Review, UploadStatus.Approved].includes(this.status)
  }

  /**
   * Get status
   * Derived from which steps have happened, checked in reverse pipeline order:
   * a decision (approved or rejected) always wins, then whether a file has
   * been uploaded, then the outcome of processing that file, and finally
   * whose review is outstanding.
   *
   * @returns {UploadStatus} Status
   */
  get status() {
    if (this.approvedAt) return UploadStatus.Approved
    if (this.rejectedAt) return UploadStatus.Rejected
    if (!this.uploadedAt) return UploadStatus.Requested
    if (this.progress < 100) return UploadStatus.Processing
    if (this.hasValidationErrors) return UploadStatus.Invalid
    if (this.hasFailed) return UploadStatus.Failed

    // School users check their upload before sending it to a SAIS team
    if (this.uploadedBy?.isSchoolUser && !this.submittedAt) {
      return UploadStatus.Pending
    }

    return UploadStatus.Review
  }

  /**
   * Upload is private to the school admin who uploaded it
   * A school admin’s upload is private until they send it for approval
   *
   * @returns {boolean} Upload is private to school admin
   */
  get isPrivateToSchool() {
    return Boolean(this.uploadedBy?.isSchoolUser && !this.submittedAt)
  }

  /**
   * Get status, as shown to SAIS teams
   * While an upload is private to a school admin, a SAIS team that requested
   * it sees it as still requested, and other SAIS teams can’t see it at all
   *
   * @returns {TeamUploadStatus|undefined} Status
   */
  get teamStatus() {
    if (this.isPrivateToSchool) {
      return this.requestedAt ? TeamUploadStatus.Requested : undefined
    }

    return /** @type {TeamUploadStatus} */ (this.status)
  }

  /**
   * Get status, as shown to school users
   * An upload that needs review by a SAIS team has been sent for approval
   *
   * @returns {SchoolUploadStatus} Status
   */
  get schoolStatus() {
    return this.status === UploadStatus.Review
      ? SchoolUploadStatus.Submitted
      : /** @type {SchoolUploadStatus} */ (this.status)
  }

  /**
   * Get uploaded patient records
   *
   * @returns {Array<Patient>} Patients
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
   * Get new patient records
   *
   * @returns {Array<Patient>} New patient records
   */
  get newPatients() {
    return this.patients.filter((patient) => patient.isNewUpload)
  }

  /**
   * Get matched patient records
   *
   * @returns {Array<Patient>} Matched patient records
   */
  get matchedPatients() {
    return this.patients.filter((patient) => patient.hasMatchingUpload)
  }

  /**
   * Get patient records with changes that need review
   *
   * @returns {Array<Patient>} Pending patient records
   */
  get pendingPatients() {
    return this.patients.filter((patient) => patient.hasPendingChanges)
  }

  /**
   * Get duplicate patient records in upload that need review
   *
   * @returns {Array<Patient>} Patient records with pending changes
   */
  get duplicates() {
    if (this.status !== UploadStatus.Review) {
      return []
    }

    return this.patients
      .filter((patient) => patient.hasPendingChanges)
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
  }

  /**
   * Get school moves reported by this upload
   *
   * @returns {Array<Move>} School moves
   */
  get moves() {
    return getUploadMoves(this.id, this.context)
  }

  /**
   * Get pupils joining the school
   * Patients in the class list but recorded as attending another school
   *
   * @returns {Array<Patient>} Patient records
   */
  get patientsMovingIn() {
    return getPatientsMovingIn(this.moves, this.school_id)
  }

  /**
   * Get pupils leaving the school
   * Patients recorded as attending the school but missing from the class list
   *
   * @returns {Array<Patient>} Patient records
   */
  get patientsMovingOut() {
    return getPatientsMovingOut(this.moves, this.school_id)
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const dateOptions = {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }

    /**
     * Format a step in the upload’s lifecycle as ‘date by name’
     *
     * @param {Date} [at] - When the step happened
     * @param {User} [by] - Who did it
     * @returns {string|undefined} Formatted step
     */
    const formatStep = (at, by) => {
      if (!at) return undefined

      const date = formatDate(at, dateOptions)
      return by ? `${date} by ${by.fullName}` : date
    }

    /**
     * Format a status as a progress bar or tag
     *
     * @param {UploadStatus|TeamUploadStatus|SchoolUploadStatus} status - Status
     * @returns {string} Formatted status
     */
    const formatStatus = (status) =>
      status === UploadStatus.Processing
        ? formatProgress(this.progress)
        : formatTag(getUploadStatusProperties(status))

    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          switch (prop) {
            case 'createdAt':
              return formatDate(this.createdAt, dateOptions)
            case 'createdBy':
              return this.createdBy?.fullName
            case 'updatedAt':
              return formatDate(this.updatedAt, dateOptions)
            case 'updatedBy':
              return this.updatedBy?.fullName
            case 'requested':
              return formatStep(this.requestedAt, this.requestedBy)
            case 'requestedAt':
              return formatDate(this.requestedAt, dateOptions)
            case 'uploaded':
              return formatStep(this.uploadedAt, this.uploadedBy)
            case 'uploadedAt':
              return formatDate(this.uploadedAt, dateOptions)
            case 'submitted':
              return formatStep(this.submittedAt, this.submittedBy)
            case 'submittedAt':
              return formatDate(this.submittedAt, dateOptions)
            case 'approved':
              return formatStep(this.approvedAt, this.approvedBy)
            case 'approvedAt':
              return formatDate(this.approvedAt, dateOptions)
            case 'rejected':
              return formatStep(this.rejectedAt, this.rejectedBy)
            case 'rejectedAt':
              return formatDate(this.rejectedAt, dateOptions)
            case 'assignees':
              return formatList(this.assignee_emails)
            case 'school':
              if (this.type !== UploadType.School) return undefined
              return this.school?.name
            case 'yearGroups': {
              if (this.type !== UploadType.School) return undefined
              return formatYearGroups(this.yearGroups)
            }
            case 'patients':
              return this.patients.length
            case 'status':
              return formatStatus(this.status)
            case 'teamStatus':
              return this.teamStatus && formatStatus(this.teamStatus)
            case 'schoolStatus':
              return formatStatus(this.schoolStatus)
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

  /**
   * Get status, as shown to user
   *
   * @param {User} user - User
   * @returns {SchoolUploadStatus|TeamUploadStatus|undefined} Status
   */
  statusFor(user) {
    return user?.isSchoolUser ? this.schoolStatus : this.teamStatus
  }

  /**
   * Get type, as shown to user
   *
   * @param {User} user - User
   * @returns {UploadType|string|undefined} Type
   */
  typeFor(user) {
    if (this.type === UploadType.School) {
      return user?.isSchoolUser ? 'Pupil records' : this.type
    }

    return this.type
  }

  /**
   * Get name, as shown to user
   *
   * @param {User} user - User
   * @param {boolean} [inSentence] - Use within a sentence
   * @returns {string} Name
   */
  nameFor(user, inSentence = false) {
    const type = inSentence
      ? this.typeFor(user).toLowerCase()
      : this.typeFor(user)

    if (user.isSchoolUser && this.isSubmitted) {
      return `${type} (sent for approval on ${this.formatted.submittedAt})`
    }

    switch (this.status) {
      case UploadStatus.Requested:
        return `${type} (requested on ${this.formatted.requestedAt})`
      case UploadStatus.Approved:
        return `${type} (approved on ${this.formatted.approvedAt})`
      case UploadStatus.Rejected:
        return `${type} (rejected on ${this.formatted.rejectedAt})`
      default:
        return `${type} (uploaded on ${this.formatted.uploadedAt})`
    }
  }

  /**
   * Get title, as shown to user
   *
   * @param {User} user - User
   * @returns {string} Title
   */
  titleFor(user) {
    if (this.needsChecking) {
      return `Check before sending ${this.nameFor(user, true)}`
    } else if (this.needsReview && !user.isSchoolUser) {
      return `Review and approve ${this.nameFor(user, true)}`
    }

    return this.nameFor(user)
  }

  /**
   * Upload is visible to user
   *
   * @param {User} user - User
   * @returns {boolean} Upload is visible to user
   */
  isVisibleTo(user) {
    if (!user) {
      return false
    }

    // School admins can only see class lists uploaded by users in their team
    if (user.isSchoolUser) {
      return (
        this.type === UploadType.School &&
        this.uploadedBy?.team_id === user.team_id
      )
    }

    // SAIS teams can’t see uploads that are private to a school admin
    if (this.teamStatus === undefined) {
      return false
    }

    // SAIS teams can only see uploads created by users in their team
    // (including requests sent to schools) and uploads from other teams that
    // have been sent for approval
    return this.createdBy?.team_id === user.team_id || Boolean(this.submittedAt)
  }

  /**
   * Upload permits user to perform action
   * Call via `User.can(action, upload)` rather than directly.
   *
   * @param {User} user - User
   * @param {'approve'|'delete'|'reject'|'submit'} action - Action
   * @returns {boolean} Upload permits user to perform action
   */
  permits(user, action) {
    if (!this.isVisibleTo(user)) {
      return false
    }

    const hasPatients = this.patients.length > 0

    if (user.isSchoolUser) {
      switch (action) {
        case 'submit':
          return this.needsChecking && hasPatients
        case 'delete':
          return ![UploadStatus.Processing, UploadStatus.Approved].includes(
            this.status
          )
        default:
          return false
      }
    }

    switch (action) {
      case 'approve':
        return this.needsReview && hasPatients
      case 'reject':
        return (
          this.type === UploadType.School && this.needsReview && hasPatients
        )
      case 'delete':
        return ![
          TeamUploadStatus.Invalid,
          TeamUploadStatus.Failed,
          TeamUploadStatus.Requested,
          TeamUploadStatus.Processing,
          TeamUploadStatus.Approved
        ].includes(this.teamStatus)
      default:
        return false
    }
  }
}

Upload.relate('requestedBy_uid', () => User, 'requestedBy')
Upload.relate('uploadedBy_uid', () => User, 'uploadedBy')
Upload.relate('submittedBy_uid', () => User, 'submittedBy')
Upload.relate('approvedBy_uid', () => User, 'approvedBy')
Upload.relate('rejectedBy_uid', () => User, 'rejectedBy')
Upload.relate('school_id', () => School, 'school')

/**
 * @import { UploadFormat } from '../enums.js'
 * @import { Move } from '../models.js'
 * @import { BaseModelOptions } from './base.js'
 */
