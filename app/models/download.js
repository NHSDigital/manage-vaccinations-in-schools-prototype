import { fakerEN_GB as faker } from '@faker-js/faker'
import { addSeconds } from 'date-fns'
import xlsx from 'json-as-xlsx'

import { DownloadFormat, DownloadStatus, DownloadType } from '../enums.js'
import { Programme, School, Session, Team, Vaccination } from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  getCurrentAcademicYear,
  today
} from '../utils/date.js'
import { getDownloadStatus } from '../utils/status.js'
import {
  formatList,
  formatProgress,
  formatTag,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} DownloadOptions
 * @property {string} [id] - Download ID
 * @property {Date} [startAt] - Date to start report
 * @property {object} [startAt_] - Date to start report from (from `dateInput`)
 * @property {Date} [endAt] - Date to end report
 * @property {object} [endAt_] - Date to end report (from `dateInput`)
 * @property {DownloadFormat} [format] - Downloaded file format
 * @property {DownloadType} [type] - Download type
 * @property {boolean} [canRecordOffline] - Include columns for recording offline
 * @property {Array<DownloadVariable>} [variables] - Download variables
 * @property {number} [academicYear] - Programme year
 * @property {Array<string>} [team_ids] - Team IDs
 * @property {Array<string>} [vaccination_uuids] - Vaccination UUIDs
 */

/**
 * @class Vaccination report download
 */
export class Download extends BaseModel {
  static contextKey = 'downloads'
  static identifierKey = 'id'
  static ns = 'download'

  /**
   * @param {DownloadOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.programme_id

    /** @type {Programme|undefined} */
    this.programme

    /** @type {string|undefined} */
    this.session_id

    /** @type {Session|undefined} */
    this.session

    /** @type {string|undefined} */
    this.school_id

    /** @type {School|undefined} */
    this.school

    this.context = context
    this.id = options?.id || faker.string.hexadecimal({ length: 8, prefix: '' })
    this.format = options?.format || DownloadFormat.CSV
    this.type = options?.type || DownloadType.Report
    this.team_ids = stringToArray(options?.team_ids)

    if (this.type === DownloadType.Cohort) {
      this.variables = stringToArray(options?.variables)
    }

    if (this.type === DownloadType.Report) {
      this.academicYear = options?.academicYear || getCurrentAcademicYear()
    }

    if ([DownloadType.Cohort, DownloadType.Report].includes(this.type)) {
      this.vaccination_uuids = stringToArray(options?.vaccination_uuids)
    }

    if ([DownloadType.Report, DownloadType.Moves].includes(this.type)) {
      this.startAt = options?.startAt && new Date(options.startAt)
      this.startAt_ = options?.startAt_
      this.endAt = options?.endAt && new Date(options.endAt)
      this.endAt_ = options?.endAt_
    }

    if (this.type === DownloadType.Session) {
      this.canRecordOffline = stringToBoolean(options?.canRecordOffline)
    }
  }

  /**
   * Get start date for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get startAt_() {
    return convertIsoDateToObject(this.startAt)
  }

  /**
   * Set start date from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set startAt_(object) {
    if (object) {
      this.startAt = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get end date for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get endAt_() {
    return convertIsoDateToObject(this.endAt)
  }

  /**
   * Set end date from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set endAt_(object) {
    if (object) {
      this.endAt = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get name
   *
   * @returns {string} Name
   */
  get name() {
    switch (true) {
      case this.type === DownloadType.Moves:
        return `School moves (${this.formatted.createdAt})`
      case this.type === DownloadType.Report:
        return `${this.programme?.name} vaccination records (${this.formatted.startEndAt})`
      case this.type === DownloadType.Session && !!this.session_id:
        return `Session spreadsheet for ${this.session?.shortName}`
      case this.type === DownloadType.Session && !!this.school_id:
        return `Session spreadsheet for ${this.school?.name}`
      case this.type === DownloadType.Session:
        return `Session spreadsheet`
      default:
        return 'Download'
    }
  }

  /**
   * Get teams
   *
   * @returns {Array<Team>} Teams
   */
  get teams() {
    if (this.context?.teams && this.team_ids) {
      return this.team_ids.map(
        (id) => new Team(this.context?.teams[id], this.context)
      )
    }

    return []
  }

  /**
   * Get vaccinations
   *
   * @returns {Array<Vaccination>} Vaccinations
   */
  get vaccinations() {
    return this.vaccination_uuids?.map((uuid) =>
      Vaccination.findOne(uuid, this.context)
    )
  }

  /**
   * Get CarePlus XLSX data
   *
   * @returns {Array} XLSX data
   */
  get carePlus() {
    return [
      {
        sheet: 'Vaccinations',
        columns: [
          { label: 'NHSNumber', value: 'nhsn' },
          { label: 'Surname', value: 'lastName' },
          { label: 'Firstname', value: 'firstName' },
          {
            label: 'DateOfBirth',
            value: (row) =>
              formatDate(row.dob, {
                timeStyle: 'short'
              })
          },
          { label: 'Address_Line1', value: 'address_line1' },
          { label: 'PersonGivingConsent', value: 'parent' },
          { label: 'Ethnicity', value: 'ethnicity' },
          {
            label: 'DateAttended',
            value: (row) =>
              formatDate(row.date, {
                dateStyle: 'short'
              })
          },
          {
            label: 'TimeAttended',
            value: (row) =>
              formatDate(row.time, {
                timeStyle: 'short'
              })
          },
          { label: 'VenueType', value: 'location_type' },
          { label: 'VenueCode', value: 'location_urn' },
          { label: 'StaffType', value: 'user_role' },
          { label: 'StaffCode', value: 'user_code' },
          { label: 'Attended', value: 'attended' },
          { label: 'ReasonNOTAttended', value: 'non_attendance' },
          {
            label: 'SuspensionEndDate',
            value: (row) =>
              formatDate(row.batch_expiry, {
                timeStyle: 'short'
              })
          },
          { label: 'Vaccine1', value: 'vaccine_type' },
          { label: 'Dose1', value: 'sequence' },
          { label: 'ReasonNOTGiven1', value: 'refusal' },
          { label: 'Site1', value: 'site' },
          { label: 'Manufacture', value: 'vaccine_manufacturer' },
          { label: 'BatchNO1', value: 'batch_id' }
        ],
        content: this.vaccinations.map((vaccination) => ({
          nhsn: vaccination.patient?.nhsn,
          lastName: vaccination.patient?.lastName,
          firstName: vaccination.patient?.firstName,
          dob: vaccination.patient?.dob,
          address_line1: vaccination.patient?.address?.addressLine1,
          contact: vaccination.patient?.contacts[0]?.fullName,
          ethnicity: '',
          date: vaccination.createdAt,
          time: vaccination.createdAt,
          location_type: 'SC',
          location_urn: vaccination.school_id,
          user_role: '',
          user_code: '',
          attended: vaccination.wasGiven ? 'Y' : 'N',
          non_attendance: '',
          batch_expiry: vaccination.batch?.expiry,
          sequence: vaccination.sequence,
          refusal: !vaccination.wasGiven ? vaccination.outcome : '',
          batch_id: vaccination.batch_id,
          // FIX: Resolve Getters from Vaccination model
          site: vaccination.injectionSite,
          vaccine_type: vaccination.vaccine?.type,
          vaccine_manufacturer: vaccination.vaccine?.manufacturer
        }))
      }
    ]
  }

  /**
   * Get CSV definition
   *
   * @returns {string} CSV data
   * @todo Use Mavis CSV export headers
   */
  get csv() {
    const headers = [
      'NHS_NUMBER',
      'PERSON_FORENAME',
      'PERSON_SURNAME',
      'PERSON_DOB',
      'PERSON_GENDER_CODE',
      'PERSON_POSTCODE',
      'SCHOOL_NAME',
      'school_id',
      'REASON_NOT_VACCINATED',
      'DATE_OF_VACCINATION',
      'VACCINE_GIVEN',
      'BATCH_NUMBER',
      'BATCH_EXPIRY_DATE',
      'ANATOMICAL_SITE',
      'VACCINATED',
      'PERFORMING_PROFESSIONAL'
    ]
    const rows = this.vaccinations.map((vaccination) =>
      headers
        .map((header) => {
          const value = {
            NHS_NUMBER: vaccination.patient?.nhsn,
            PERSON_FORENAME: vaccination.patient?.firstName,
            PERSON_SURNAME: vaccination.patient?.lastName,
            PERSON_DOB: vaccination.patient?.dob,
            PERSON_GENDER_CODE: vaccination.patient?.gender,
            PERSON_POSTCODE: vaccination.patient?.postalCode,
            SCHOOL_NAME: vaccination.location,
            school_id: vaccination.school_id,
            REASON_NOT_VACCINATED: !vaccination.wasGiven
              ? vaccination.outcome
              : '',
            DATE_OF_VACCINATION: vaccination.createdAt,
            VACCINE_GIVEN: vaccination.vaccine?.brand,
            BATCH_NUMBER: vaccination.batch_id,
            BATCH_EXPIRY_DATE: vaccination.batch?.expiry,
            ANATOMICAL_SITE: vaccination.injectionSite,
            VACCINATED: vaccination.wasGiven ? 'Y' : 'N',
            PERFORMING_PROFESSIONAL: vaccination.createdBy?.fullName
          }[header]

          return `"${(value || '').toString().replace(/"/g, '""')}"`
        })
        .join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  get progress() {
    return 50
  }

  get status() {
    if (this.createdAt) {
      const completedAt = addSeconds(this.createdAt, 30)
      const now = today()

      if (completedAt < now) {
        return DownloadStatus.Ready
      }
    }

    return DownloadStatus.Processing
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
          switch (prop) {
            case 'createdAt':
              return formatDate(this.createdAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'createdBy':
              return this.createdBy?.fullName
            case 'startAt':
              return (
                this.startAt && formatDate(this.startAt, { dateStyle: 'long' })
              )
            case 'endAt':
              return this.endAt && formatDate(this.endAt, { dateStyle: 'long' })
            case 'startEndAt':
              return (
                this.startAt &&
                this.endAt &&
                new Intl.DateTimeFormat('en', {
                  dateStyle: 'long'
                }).formatRange(this.startAt, this.endAt)
              )
            case 'status':
              return this.status === DownloadStatus.Processing
                ? formatProgress(this.progress)
                : formatTag(getDownloadStatus(this.status))
            case 'programme':
              return this.programme?.nameTag
            case 'teams':
              return this.teams?.length > 0
                ? formatList(this.teams.map(({ name }) => name))
                : this.teams.length
            case 'vaccinations':
              return `${this.vaccinations?.length} records`
            case 'canRecordOffline':
              if (this.type !== DownloadType.Session) return undefined
              return this.canRecordOffline === true ? 'Yes' : 'No'
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
    return `/downloads/${this.id}`
  }

  /**
   * Create file
   *
   * @param {object} context - Context
   * @returns {object} File buffer, name and mime type
   */
  createFile(context) {
    const { name } = new Download(this, context)

    let buffer
    let extension
    let mimetype
    switch (this.format) {
      case DownloadFormat.CarePlus:
        // @ts-ignore
        buffer = xlsx(this.carePlus, { name, writeOptions: { type: 'buffer' } })
        extension = 'xlsx'
        mimetype = 'application/octet-stream'
        break
      default:
        buffer = Buffer.from(this.csv)
        extension = 'csv'
        mimetype = 'text/csv'
    }

    return { buffer, fileName: `${name}.${extension}`, mimetype }
  }
}

Download.relate('programme_id', () => Programme, 'programme')
Download.relate('school_id', () => School, 'school')
Download.relate('session_id', () => Session, 'session')

/**
 * @import { DownloadVariable } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
