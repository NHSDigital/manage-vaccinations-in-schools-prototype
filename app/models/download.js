import { fakerEN_GB as faker } from '@faker-js/faker'
import xlsx from 'json-as-xlsx'

import { DownloadFormat, DownloadType } from '../enums.js'
import { Programme, Team, Vaccination, User } from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  today
} from '../utils/date.js'
import { formatList } from '../utils/string.js'

/**
 * @class Vaccination report download
 * @param {object} options - Options
 * @param {object} [context] - Context
 * @property {object} [context] - Context
 * @property {string} id - Download ID
 * @property {Date} [createdAt] - Created date
 * @property {string} [createdBy_uid] - User who created download
 * @property {Date} [updatedAt] - Updated date
 * @property {Date} [startAt] - Date to start report
 * @property {object} [startAt_] - Date to start report from (from `dateInput`)
 * @property {Date} [endAt] - Date to end report
 * @property {object} [endAt_] - Date to end report (from `dateInput`)
 * @property {DownloadFormat} [format] - Downloaded file format
 * @property {DownloadType} [type] - Download type
 * @property {string} [programme_id] - Programme ID
 * @property {Array<string>} [team_ids] - Team IDs
 * @property {Array<string>} [vaccination_uuids] - Vaccination UUIDs
 */
export class Download {
  constructor(options, context) {
    this.context = context
    this.id = options?.id || faker.string.hexadecimal({ length: 8, prefix: '' })
    this.createdAt = options?.createdAt ? new Date(options.createdAt) : today()
    this.createdBy_uid = options?.createdBy_uid
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.startAt = options?.startAt && new Date(options.startAt)
    this.startAt_ = options?.startAt_
    this.endAt = options?.endAt && new Date(options.endAt)
    this.endAt_ = options?.endAt_
    this.format = options?.format || DownloadFormat.CSV
    this.type = options?.type || DownloadType.Report
    this.programme_id = options?.programme_id
    this.team_ids = options?.team_ids
    this.vaccination_uuids = options?.vaccination_uuids || []
  }

  /**
   * Get user who created upload
   *
   * @returns {User} User
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
   * Get start date for `dateInput`
   *
   * @returns {object|undefined} `dateInput` object
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
   * @returns {object|undefined} `dateInput` object
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
      case this.type === DownloadType.Report:
        return `${this.programme.name} vaccination records`
      default:
        return 'Download'
    }
  }

  /**
   * Get programme
   *
   * @returns {Programme} Programme
   */
  get programme() {
    try {
      const programme = this.context?.programmes[this.programme_id]
      if (programme) {
        return new Programme(programme)
      }
    } catch (error) {
      console.error('Download.programme', error.message)
    }
  }

  /**
   * Get teams
   *
   * @returns {Array<Team>} Teams
   */
  get teams() {
    if (this.context?.teams && this.team_ids) {
      return this.team_ids
        .filter((id) => id !== '_unchecked')
        .map((id) => new Team(this.context?.teams[id], this.context))
    }

    return []
  }

  /**
   * Get vaccinations
   *
   * @returns {Array<Vaccination>} Vaccinations
   */
  get vaccinations() {
    return this.vaccination_uuids.map((uuid) =>
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
          parent: vaccination.patient?.parent1?.fullName,
          ethnicity: '',
          date: vaccination.createdAt,
          time: vaccination.createdAt,
          location_type: 'SC',
          location_urn: vaccination.school_id,
          user_role: '',
          user_code: '',
          attended: vaccination.given ? 'Y' : 'N',
          non_attendance: '',
          batch_expiry: vaccination.batch?.expiry,
          sequence: vaccination.sequence,
          refusal: !vaccination.given ? vaccination.outcome : '',
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
            REASON_NOT_VACCINATED: !vaccination.given
              ? vaccination.outcome
              : '',
            DATE_OF_VACCINATION: vaccination.createdAt,
            VACCINE_GIVEN: vaccination.vaccine?.brand,
            BATCH_NUMBER: vaccination.batch_id,
            BATCH_EXPIRY_DATE: vaccination.batch?.expiry,
            ANATOMICAL_SITE: vaccination.injectionSite,
            VACCINATED: vaccination.given ? 'Y' : 'N',
            PERFORMING_PROFESSIONAL: vaccination.createdBy?.fullName
          }[header]

          return `"${(value || '').toString().replace(/"/g, '""')}"`
        })
        .join(',')
    )

    return [headers.join(','), ...rows].join('\n')
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return {
      createdAt: formatDate(this.createdAt, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      createdBy: this.createdBy?.fullName,
      startAt: this.startAt
        ? formatDate(this.startAt, { dateStyle: 'long' })
        : 'Earliest recorded vaccination',
      endAt: this.endAt
        ? formatDate(this.endAt, { dateStyle: 'long' })
        : 'Latest recorded vaccination',
      teams:
        this.teams.length > 0
          ? formatList(this.teams.map(({ name }) => name))
          : this.teams.length,
      vaccinations: `${this.vaccinations.length} records`
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'download'
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
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Download>|undefined} Downloads
   * @static
   */
  static findAll(context) {
    return Object.values(context.downloads).map(
      (upload) => new Download(upload, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} id - Download ID
   * @param {object} context - Context
   * @returns {Download|undefined} Download
   * @static
   */
  static findOne(id, context) {
    if (context?.downloads?.[id]) {
      return new Download(context.downloads[id], context)
    }
  }

  /**
   * Create
   *
   * @param {object} download - Download
   * @param {object} context - Context
   * @returns {Download} Created download
   * @static
   */
  static create(download, context) {
    const createdDownload = new Download(download)

    // Update context
    context.downloads = context.downloads || {}
    context.downloads[createdDownload.id] = createdDownload

    return createdDownload
  }

  /**
   * Update
   *
   * @param {string} id - Download ID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Download} Updated download
   * @static
   */
  static update(id, updates, context) {
    const updatedDownload = Object.assign(
      Download.findOne(id, context),
      updates
    )
    updatedDownload.updatedAt = today()

    // Remove download context
    delete updatedDownload.context

    // Delete original download (with previous ID)
    delete context.downloads[id]

    // Update context
    context.downloads[updatedDownload.id] = updatedDownload

    return updatedDownload
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
