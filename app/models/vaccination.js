import { fakerEN_GB as faker } from '@faker-js/faker'
import { isBefore } from 'date-fns'

import clinics from '../datasets/clinics.js'
import schools from '../datasets/schools.js'
import vaccines from '../datasets/vaccines.js'
import {
  LocationType,
  ProgrammeType,
  VaccinationMethod,
  VaccinationOutcome,
  VaccinationProtocol,
  VaccinationSite,
  VaccinationSource,
  VaccinationSyncStatus,
  VaccineCriteria
} from '../enums.js'
import {
  Batch,
  Clinic,
  PatientSession,
  Patient,
  Programme,
  School,
  User,
  Vaccine
} from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  today
} from '../utils/date.js'
import {
  getVaccinationOutcomeStatus,
  getVaccinationSyncStatus
} from '../utils/status.js'
import {
  formatCode,
  formatIdentifier,
  formatLink,
  formatLinkWithSecondaryText,
  formatMillilitres,
  formatMarkdown,
  formatSequence,
  formatTag,
  stringToBoolean,
  formatWithSecondaryText
} from '../utils/string.js'

/**
 * @typedef {object} VaccinationOptions
 * @property {string} [uuid] - Vaccination UUID
 * @property {Date} [createdAt] - Created date
 * @property {object} [createdAt_] - Created date (from `dateInput`)
 * @property {string} [createdBy_uid] - User who performed vaccination
 * @property {Date} [updatedAt] - Updated date
 * @property {Date} [reportedAt] - Reported date
 * @property {string} [reportedBy_uid] - User who reported vaccination
 * @property {string} [suppliedBy_uid] - Who supplied the vaccine
 * @property {Date} [nhseSyncedAt] - Date synced with NHS England API
 * @property {LocationType} [locationType] - Location
 * @property {string} [locationName] - Location name
 * @property {string} [addressLine1] - Address line 1
 * @property {string} [addressLine2] - Address line 2
 * @property {string} [addressLevel1] - Address level 2
 * @property {string} [country] - Country (in UK)
 * @property {string} [countryOther] - Country (outside UK)
 * @property {boolean} [selfId] - Child confirmed their identity?
 * @property {object} [identifiedBy] - Who identified child
 * @property {string} [identifiedBy.name] - Name of identifier
 * @property {string} [identifiedBy.relationship] - Relationship of identifier
 * @property {VaccinationOutcome} [outcome] - Outcome
 * @property {VaccinationMethod} [injectionMethod] - Injection method
 * @property {VaccinationSite} [injectionSite] - Injection site on body
 * @property {VaccinationSource} [source] - Vaccination reporting source
 * @property {number} [dose] - Dosage (ml)
 * @property {string} [sequence] - Dose sequence
 * @property {string} [protocol] - Protocol
 * @property {boolean} [scheduled] - Vaccination date was on schedule
 * @property {string} [note] - Note
 * @property {string} [clinic_id] - Clinic ID
 * @property {string} [school_id] - School ID
 * @property {string} [patient_uuid] - Patient UUID (used outside of a session)
 * @property {string} [patientSession_uuid] - Patient session UUID
 * @property {string} [programme_id] - Programme ID
 * @property {string} [programmeOther] - Non-NHS programme name
 * @property {string} [batch_id] - Batch ID
 * @property {boolean} [variant] - Is programme variant?
 * @property {string} [vaccine_snomed] - Vaccine SNOMED code
 */

/**
 * @class Vaccination
 */
export class Vaccination {
  /**
   * @param {VaccinationOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.createdAt = options?.createdAt && new Date(options.createdAt)
    this.createdAt_ = options?.createdAt_
    this.nhseSyncedAt = options?.nhseSyncedAt
      ? new Date(options.nhseSyncedAt)
      : undefined
    this.createdBy_uid = options?.createdBy_uid
    this.suppliedBy_uid = options?.suppliedBy_uid
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.locationType = options?.locationType
    this.locationName = options?.locationName
    this.country = options?.country || 'England'
    this.countryOther = this.country === 'Other' && options?.countryOther
    this.selfId = options?.selfId && stringToBoolean(options.selfId)
    this.identifiedBy = this.selfId !== true && options?.identifiedBy
    this.outcome = options?.outcome
    this.given = [
      VaccinationOutcome.Vaccinated,
      VaccinationOutcome.PartVaccinated,
      VaccinationOutcome.AlreadyVaccinated
    ].includes(this.outcome)
    this.injectionMethod = options?.injectionMethod
    this.injectionSite = options?.injectionSite
    this.source = options?.source || VaccinationSource.Service
    this.dose = this.given ? Number(options?.dose) : undefined
    this.sequence = options?.sequence
    this.protocol = this.given
      ? options?.protocol || VaccinationProtocol.PGD
      : undefined
    this.scheduled = stringToBoolean(options.scheduled)
    this.note = options?.note || ''
    this.clinic_id = options?.clinic_id
    this.school_id = options?.school_id
    this.patient_uuid = options?.patient_uuid
    this.patientSession_uuid = options?.patientSession_uuid
    this.programme_id = options?.programme_id
    this.programmeOther = options?.programmeOther
    this.batch_id = this.given ? options?.batch_id || '' : undefined
    this.variant = options?.variant
      ? stringToBoolean(options.variant)
      : undefined
    this.vaccine_snomed = options?.vaccine_snomed

    if (this.outcome === VaccinationOutcome.AlreadyVaccinated) {
      this.addressLine1 = options?.addressLine1
      this.addressLine2 = options?.addressLine2
      this.addressLevel1 = options?.addressLevel1
      this.country = options?.country
      this.reportedAt = today()
      this.reportedBy_uid = options?.reportedBy_uid
      this.protocol = undefined
    }
  }

  /**
   * Get created date for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get createdAt_() {
    return convertIsoDateToObject(this.createdAt)
  }

  /**
   * Set created date from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set createdAt_(object) {
    if (object) {
      this.createdAt = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get location (name and address)
   *
   * @returns {object|undefined} Location
   */
  get location() {
    if (this.locationType === LocationType.Home) {
      return {
        name: LocationType.Home
      }
    } else if (this.clinic_id) {
      return this.clinic.location
    } else if (this.school_id) {
      return this.school.location
    } else if (
      this.locationName ||
      this.addressLine1 ||
      this.addressLine2 ||
      this.addressLevel1
    ) {
      return {
        name: this.locationName || this.locationType,
        addressLine1: this.addressLine1,
        addressLine2: this.addressLine2,
        addressLevel1: this.addressLevel1,
        country: this.countryOther || this.country
      }
    }
  }

  /**
   * Get batch
   *
   * @returns {Batch|undefined} Batch
   */
  get batch() {
    try {
      if (this.batch_id) {
        return Batch.findOne(this.batch_id, this.context)
      }
    } catch (error) {
      console.error('Vaccination.batch', error.message)
    }
  }

  /**
   * Get batch expiry date for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get batch_expiry_() {
    return convertIsoDateToObject(this.batch.expiry)
  }

  /**
   * Set batch expiry date from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set batch_expiry_(object) {
    if (object) {
      this.context.batches[this.batch_id].expiry =
        convertObjectToIsoDate(object)
    }
  }

  /**
   * Get vaccine
   *
   * @returns {object|undefined} Vaccine
   */
  get vaccine() {
    if (this.vaccine_snomed) {
      return new Vaccine(vaccines[this.vaccine_snomed])
    }
  }

  /**
   * Get method
   *
   * @returns {VaccinationMethod|undefined} Method
   */
  get method() {
    if (!this.vaccine || !this.given) return

    if (this.vaccine.criteria === VaccineCriteria.Intranasal) {
      this.injectionMethod = VaccinationMethod.Intranasal
    }

    if (
      this.vaccine.criteria !== VaccineCriteria.Intranasal &&
      this.injectionMethod === VaccinationMethod.Intranasal
    ) {
      // Change previously set injection site to intramuscular (good default)
      this.injectionMethod = VaccinationMethod.Intramuscular
    }

    return this.injectionMethod
  }

  /**
   * Get anatomical site
   *
   * @returns {VaccinationSite|undefined} Anatomical site
   */
  get site() {
    if (!this.vaccine || !this.given) return

    if (this.method === VaccinationMethod.Intranasal) {
      // Method is nasal, so site is ‘Nose’
      this.injectionSite = VaccinationSite.Nose
    }

    if (
      this.method !== VaccinationMethod.Intranasal &&
      this.injectionSite === VaccinationSite.Nose
    ) {
      // Reset any previously set injection site as can no longer be ‘Nose’
      this.injectionSite = null
    }

    return this.injectionSite
  }

  /**
   * Get patient session
   *
   * @returns {PatientSession|undefined} Patient session
   */
  get patientSession() {
    try {
      return PatientSession.findOne(this.patientSession_uuid, this.context)
    } catch (error) {
      console.error('Instruction.patientSession', error.message)
    }
  }

  /**
   * Get patient
   *
   * @returns {Patient|undefined} Patient
   */
  get patient() {
    if (this.patient_uuid) {
      return Patient.findOne(this.patient_uuid, this.context)
    } else if (this.patientSession_uuid) {
      return this.patientSession.patient
    }
  }

  /**
   * Get session
   *
   * @returns {Session|undefined} Session
   */
  get session() {
    if (this.patientSession) {
      return this.patientSession.session
    }
  }

  /**
   * Get user who performed vaccination
   *
   * @returns {User|undefined} User
   */
  get createdBy() {
    try {
      if (this.createdBy_uid) {
        return User.findOne(this.createdBy_uid, this.context)
      }
    } catch (error) {
      console.error('Vaccination.createdBy', error.message)
    }
  }

  /**
   * Get user who reported vaccination
   *
   * @returns {User|undefined} User
   */
  get reportedBy() {
    try {
      if (this.reportedBy_uid) {
        return User.findOne(this.reportedBy_uid, this.context)
      }
    } catch (error) {
      console.error('Vaccination.reportedBy', error.message)
    }
  }

  /**
   * Get user who supplied the vaccine
   *
   * @returns {User|undefined} User
   */
  get suppliedBy() {
    try {
      if (this.suppliedBy_uid) {
        return User.findOne(this.suppliedBy_uid, this.context)
      }
    } catch (error) {
      console.error('Vaccination.suppliedBy', error.message)
    }
  }

  /**
   * Get programme
   *
   * @returns {Programme|undefined} Programme
   */
  get programme() {
    try {
      return Programme.findOne(this.programme_id, this.context)
    } catch (error) {
      console.error('Vaccination.programme', error.message)
    }
  }

  /**
   * Get clinic
   *
   * @returns {Clinic|undefined} Clinic
   */
  get clinic() {
    if (this.clinic_id) {
      return new Clinic(clinics[this.clinic_id])
    }
  }

  /**
   * Get school
   *
   * @returns {School|undefined} School
   */
  get school() {
    if (this.school_id) {
      return new School(schools[this.school_id])
    }
  }

  /**
   * Get status of sync with NHS England API
   *
   * @returns {VaccinationSyncStatus} Sync status
   */
  get syncStatus() {
    const updatedAt = this.updatedAt || this.createdAt
    const oneMinuteAgo = new Date(new Date().getTime() - 1000 * 60)

    switch (true) {
      case !this.programme?.nhseSyncable:
      case this.patient?.hasMissingNhsNumber:
        return VaccinationSyncStatus.CannotSync
      case !this.given:
        return VaccinationSyncStatus.NotSynced
      case this.nhseSyncedAt > updatedAt:
        return VaccinationSyncStatus.Synced
      case isBefore(updatedAt, oneMinuteAgo):
        return VaccinationSyncStatus.Failed
      default:
        return VaccinationSyncStatus.Pending
    }
  }

  /**
   * Get explanatory notes about sync with NHS England API
   *
   * @returns {string} Explanatory notes
   */
  get syncStatusNotes() {
    const nhseSyncedAt = formatDate(this.nhseSyncedAt, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const lastSynced = this.nhseSyncedAt ? `Last synced: ${nhseSyncedAt}` : ''

    switch (this.syncStatus) {
      case VaccinationSyncStatus.CannotSync:
        return this.patient?.hasMissingNhsNumber
          ? `You must add an NHS number to the child's record before this record will sync<br>${lastSynced}`
          : `Records are currently not synced for this programme<br>${lastSynced}`
      case VaccinationSyncStatus.NotSynced:
        return `Records are not synced if the vaccination was not given<br>${lastSynced}`
      case VaccinationSyncStatus.Failed:
        return `The Mavis team is aware of the issue and is working to resolve it<br>${lastSynced}`
      default:
        return lastSynced
    }
  }

  /**
   * Get programme or programme variant name
   *
   * @returns {string} Programme or programme variant name
   */
  get programmeOrVariantName() {
    if (this.variant && this.programme.type === ProgrammeType.MMR) {
      return 'MMRV'
    }

    return this.programme.name
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
          const getProgrammeTag = () => {
            return this.variant
              ? formatTag({
                  text: this.programmeOrVariantName,
                  colour: 'transparent'
                })
              : this.programme?.nameTag
          }

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
            case 'createdAt_date':
              return formatDate(this.createdAt, { dateStyle: 'long' })
            case 'createdAt_time':
              return formatDate(this.createdAt, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'createdAt_dateShort':
              return formatDate(this.createdAt, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            case 'createdBy':
              return this.createdBy?.fullName || 'Unknown'
            case 'suppliedBy':
              return this.suppliedBy?.fullName || ''
            case 'updatedAt':
              return formatDate(this.updatedAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'reportedAt':
              return (
                this.reportedAt &&
                formatDate(this.reportedAt, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              )
            case 'reportedBy':
              return this.reportedBy?.fullName || ''
            case 'syncStatus':
              return formatWithSecondaryText(
                formatTag(getVaccinationSyncStatus(this.syncStatus)),
                this.syncStatusNotes,
                true
              )
            case 'batch':
              return this.batch?.summary
            case 'batch_id':
              return formatCode(this.batch_id)
            case 'dose':
              return formatMillilitres(this.dose)
            case 'sequence':
              return this.sequence && formatSequence(this.sequence)
            case 'vaccine_snomed':
              return this.vaccine_snomed ? this.vaccine?.brand : 'Unknown'
            case 'note':
              return formatMarkdown(this.note)
            case 'outcome':
              return formatTag(getVaccinationOutcomeStatus(this.outcome))
            case 'programme':
              return this.programmeOther || getProgrammeTag()
            case 'programmeWithSequence':
              return (
                this.programmeOther ||
                formatWithSecondaryText(
                  getProgrammeTag(),
                  formatSequence(this.sequence),
                  false
                )
              )
            case 'location':
              return (
                (this?.location &&
                  Object.values(this.location).filter(Boolean).join(', ')) ||
                'Unknown'
              )
            case 'country':
              return this.countryOther || this.country || 'England'
            case 'school':
              return this.school && this.school.name
            case 'identifiedBy':
              return this.selfId
                ? 'The child'
                : formatIdentifier(this.identifiedBy)
            default:
              return undefined
          }
        }
      }
    )
  }

  /**
   * Get formatted links
   *
   * @returns {object} Formatted links
   */
  get link() {
    return {
      createdAt: formatLink(this.uri, this.formatted.createdAt),
      fullName: this.patient && formatLink(this.uri, this.patient.fullName),
      fullNameAndNhsn:
        this.patient &&
        formatLinkWithSecondaryText(
          this.uri,
          this.patient.fullName,
          this.patient.formatted.nhsn || 'Missing NHS number'
        )
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'vaccination'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/reports/${this.programme_id}/vaccinations/${this.uuid}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Vaccination>|undefined} Vaccinations
   * @static
   */
  static findAll(context) {
    return Object.values(context.vaccinations).map(
      (vaccination) => new Vaccination(vaccination, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} uuid - Vaccination UUID
   * @param {object} context - Context
   * @returns {Vaccination|undefined} Vaccination
   * @static
   */
  static findOne(uuid, context) {
    if (context?.vaccinations?.[uuid]) {
      return new Vaccination(context.vaccinations[uuid], context)
    }
  }

  /**
   * Create
   *
   * @param {object} vaccination - Vaccination
   * @param {object} context - Context
   * @returns {Vaccination} Created vaccination
   * @static
   */
  static create(vaccination, context) {
    const createdVaccination = new Vaccination(vaccination)

    // Update context
    context.vaccinations = context.vaccinations || {}
    context.vaccinations[createdVaccination.uuid] = createdVaccination

    return createdVaccination
  }

  /**
   * Update
   *
   * @param {string} uuid - Vaccination UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Vaccination} Updated vaccination
   * @static
   */
  static update(uuid, updates, context) {
    const updatedVaccination = Object.assign(
      Vaccination.findOne(uuid, context),
      updates
    )
    updatedVaccination.updatedAt = today()

    // Make sure sync isn’t always successful
    const syncSuccess = Math.random() > 0.3
    if (syncSuccess && updatedVaccination.given) {
      updatedVaccination.nhseSyncedAt = today(Math.random() * 60 * 5)
    }

    // Remove patient context
    delete updatedVaccination.context

    // Delete original patient (with previous UUID)
    delete context.vaccinations[uuid]

    // Update context
    context.vaccinations[updatedVaccination.uuid] = updatedVaccination

    return updatedVaccination
  }
}

/**
 * @import { Session } from '../models.js'
 */
