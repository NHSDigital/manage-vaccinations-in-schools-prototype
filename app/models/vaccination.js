import { fakerEN_GB as faker } from '@faker-js/faker'
import { isBefore } from 'date-fns'

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
  getVaccinationOutcomeProperties,
  getVaccinationSyncStatusProperties
} from '../utils/enum-properties.js'
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

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} VaccinationOptions
 * @property {string} [uuid] - Vaccination UUID
 * @property {Date} [administeredAt] - Administered date
 * @property {object} [administeredAt_] - Administered date (from `dateInput`)
 * @property {Date} [nhseSyncedAt] - Date synced with NHS England API
 * @property {LocationType} [locationType] - Location
 * @property {string} [locationName] - Location name
 * @property {string} [addressLine1] - Address line 1
 * @property {string} [addressLine2] - Address line 2
 * @property {string} [addressLevel1] - Address level 2
 * @property {string} [country] - Country (in UK)
 * @property {string} [countryOther] - Country (outside UK)
 * @property {boolean} [hasSelfIdentified] - Child confirmed their identity?
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
 * @property {boolean} [isScheduled] - Vaccination date was on schedule
 * @property {string} [note] - Note
 * @property {string} [programmeOther] - Non-NHS programme name
 * @property {boolean} [isVariant] - Is programme variant?
 */

/**
 * @class Vaccination
 */
export class Vaccination extends BaseModel {
  static contextKey = 'vaccinations'
  static identifierKey = 'uuid'
  static ns = 'vaccination'

  /**
   * @param {VaccinationOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.administeredBy_uid

    /** @type {User|undefined} */
    this.administeredBy

    /** @type {string|undefined} */
    this.assessedBy_uid

    /** @type {User|undefined} */
    this.assessedBy

    /** @type {string|undefined} */
    this.batch_id

    /** @type {Batch|undefined} */
    this.batch

    /** @type {string|undefined} */
    this.clinic_id

    /** @type {Clinic|undefined} */
    this.clinic

    /** @type {string|undefined} */
    this.school_id

    /** @type {School|undefined} */
    this.school

    /** @type {string|undefined} */
    this.patient_uuid

    /** @type {Patient|undefined} */
    this.patient

    /** @type {string|undefined} */
    this.patientSession_uuid

    /** @type {PatientSession|undefined} */
    this.patientSession

    /** @type {string|undefined} */
    this.programme_id

    /** @type {Programme|undefined} */
    this.programme

    /** @type {string|undefined} */
    this.vaccine_snomed

    /** @type {Vaccine|undefined} */
    this.vaccine

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.administeredAt = options?.administeredAt
      ? new Date(options.administeredAt)
      : today()
    this.administeredAt_ = options?.administeredAt_
    this.nhseSyncedAt = options?.nhseSyncedAt
      ? new Date(options.nhseSyncedAt)
      : undefined
    this.locationType = options?.locationType
    this.locationName = options?.locationName
    this.country = options?.country || 'England'
    this.countryOther = this.country === 'Other' && options?.countryOther
    this.hasSelfIdentified =
      options?.hasSelfIdentified && stringToBoolean(options.hasSelfIdentified)
    this.identifiedBy = this.hasSelfIdentified !== true && options?.identifiedBy
    this.outcome = options?.outcome
    this.wasGiven = [
      VaccinationOutcome.Vaccinated,
      VaccinationOutcome.PartVaccinated,
      VaccinationOutcome.AlreadyVaccinated
    ].includes(this.outcome)
    this.injectionMethod = options?.injectionMethod
    this.injectionSite = options?.injectionSite
    this.source = options?.source || VaccinationSource.Service
    this.dose = this.wasGiven ? Number(options?.dose) : undefined
    this.sequence = options?.sequence
    this.protocol = this.wasGiven
      ? options?.protocol || VaccinationProtocol.PGD
      : undefined
    this.isScheduled = stringToBoolean(options.isScheduled)
    this.note = options?.note || ''
    this.programmeOther = options?.programmeOther
    this.isVariant = options?.isVariant
      ? stringToBoolean(options.isVariant)
      : undefined

    if (this.outcome === VaccinationOutcome.AlreadyVaccinated) {
      this.addressLine1 = options?.addressLine1
      this.addressLine2 = options?.addressLine2
      this.addressLevel1 = options?.addressLevel1
      this.country = options?.country
      this.protocol = undefined
    }
  }

  /**
   * Get administered date for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get administeredAt_() {
    return convertIsoDateToObject(this.administeredAt)
  }

  /**
   * Set administered date from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set administeredAt_(object) {
    if (object) {
      this.administeredAt = convertObjectToIsoDate(object)
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
   * Get method
   *
   * @returns {VaccinationMethod|undefined} Method
   */
  get method() {
    if (!this.vaccine || !this.wasGiven) return

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
    if (!this.vaccine || !this.wasGiven) return

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
   * Get status of sync with NHS England API
   *
   * @returns {VaccinationSyncStatus} Sync status
   */
  get syncStatus() {
    const updatedAt = this.updatedAt || this.createdAt
    const oneMinuteAgo = new Date(new Date().getTime() - 1000 * 60)

    switch (true) {
      case !this.programme?.isNhseSyncable:
      case this.patient?.hasMissingNhsNumber:
        return VaccinationSyncStatus.CannotSync
      case !this.wasGiven:
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
    if (this.isVariant && this.programme.type === ProgrammeType.MMR) {
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
            return this.isVariant
              ? formatTag({
                  text: this.programmeOrVariantName,
                  colour: 'transparent'
                })
              : this.programme?.nameTag
          }

          switch (prop) {
            case 'administeredAt':
              return formatDate(this.administeredAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'administeredAt_date':
              return formatDate(this.administeredAt, { dateStyle: 'long' })
            case 'administeredAt_time':
              return formatDate(this.administeredAt, {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'administeredAt_dateShort':
              return formatDate(this.administeredAt, {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            case 'assessedBy':
              return this.assessedBy?.fullName || ''
            case 'administeredBy':
              return this.administeredBy?.fullName || ''
            case 'createdAt':
              return (
                this.createdAt &&
                formatDate(this.createdAt, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
              )
            case 'createdBy':
              return this.createdBy?.fullName || 'Unknown'
            case 'updatedAt':
              return formatDate(this.updatedAt, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })
            case 'syncStatus':
              return formatWithSecondaryText(
                formatTag(getVaccinationSyncStatusProperties(this.syncStatus)),
                this.syncStatusNotes,
                true
              )
            case 'batch':
              return this.batch?.summary
            case 'batch_id':
              return formatCode(this.batch.id)
            case 'dose':
              return formatMillilitres(this.dose)
            case 'sequence':
              return this.sequence && formatSequence(this.sequence)
            case 'vaccine':
              return this.vaccine?.brand || 'Unknown'
            case 'note':
              return formatMarkdown(this.note)
            case 'outcome':
              return formatTag(getVaccinationOutcomeProperties(this.outcome))
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
              return this.hasSelfIdentified
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
      administeredAt: formatLink(this.uri, this.formatted.administeredAt),
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
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/reports/${this.programme_id}/vaccinations/${this.uuid}`
  }
}

Vaccination.relate('administeredBy_uid', () => User, 'administeredBy')
Vaccination.relate('assessedBy_uid', () => User, 'assessedBy')
Vaccination.relate('batch_id', () => Batch, 'batch')
Vaccination.relate('clinic_id', () => Clinic, 'clinic')
Vaccination.relate('patient_uuid', () => Patient, 'patient')
Vaccination.relate(
  'patientSession_uuid',
  () => PatientSession,
  'patientSession'
)
Vaccination.relate('programme_id', () => Programme, 'programme')
Vaccination.relate('school_id', () => School, 'school')
Vaccination.relate('vaccine_snomed', () => Vaccine, 'vaccine')

/**
 * @import { Session } from '../models.js'
 * @import { BaseModelOptions } from './base.js'
 */
