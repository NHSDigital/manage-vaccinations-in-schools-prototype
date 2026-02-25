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
  formatIdentifier,
  formatLink,
  formatLinkWithSecondaryText,
  formatMillilitres,
  formatMarkdown,
  formatMonospace,
  formatSequence,
  formatTag,
  stringToBoolean,
  formatWithSecondaryText
} from '../utils/string.js'

/**
 * @class Vaccination
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {object} [context] - Global context
 * @property {string} uuid - UUID
 * @property {Date} [createdAt] - Created date
 * @property {object} [createdAt_] - Created date (from `dateInput`)
 * @property {string} [createdBy_uid] - User who performed vaccination
 * @property {Date} [updatedAt] - Updated date
 * @property {Date} [reportedAt] - Reported date
 * @property {string} [reportedBy_uid] - User who reported vaccination
 * @property {string} [suppliedBy_uid] - Who supplied the vaccine
 * @property {Date} [nhseSyncedAt] - Date synced with NHS England API
 * @property {LocationType} [locationType] - Location
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
 * @property {string} [country] - Country
 * @property {string} [clinic_id] - Clinic ID
 * @property {string} [school_id] - School ID
 * @property {string} [patient_uuid] - Patient UUID (used outside of a session)
 * @property {string} [patientSession_uuid] - Patient session UUID
 * @property {string} [programme_id] - Programme ID
 * @property {string} [programmeOther] - Non-NHS programme name
 * @property {string} [batch_id] - Batch ID
 * @property {string} [variant] - Programme variant
 * @property {string} [vaccine_snomed] - Vaccine SNOMED code
 */
export class Vaccination {
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
    this.country = options?.country
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
    this.dose = this.given ? options?.dose || '' : undefined
    this.sequence = options?.sequence
    this.protocol = this.given
      ? options?.protocol || VaccinationProtocol.PGD
      : undefined
    this.scheduled = stringToBoolean(options.scheduled)
    this.note = options?.note || ''
    this.country = 'England'
    this.clinic_id = options?.clinic_id
    this.school_id = options?.school_id
    this.patient_uuid = options?.patient_uuid
    this.patientSession_uuid = options?.patientSession_uuid
    this.programme_id = options?.programme_id
    this.programmeOther = options?.programmeOther
    this.batch_id = this.given ? options?.batch_id || '' : undefined
    this.variant = options?.variant && stringToBoolean(options.variant)
    this.vaccine_snomed = options?.vaccine_snomed

    if (this.outcome === VaccinationOutcome.AlreadyVaccinated) {
      this.locationName = options?.locationName
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
   * @returns {object|undefined} `dateInput` object
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
   * @returns {object} Location
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
   * @returns {Batch} Batch
   */
  get batch() {
    try {
      if (this.batch_id) {
        return new Batch(this.batch_id, this.context)
      }
    } catch (error) {
      console.error('Vaccination.batch', error.message)
    }
  }

  /**
   * Get batch expiry date for `dateInput`
   *
   * @returns {object|undefined} `dateInput` object
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
   * @returns {PatientSession} Patient session
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
   * @returns {import('../models.js').Patient} Patient
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
   * @returns {import('../models.js').Session} Session
   */
  get session() {
    if (this.patientSession) {
      return this.patientSession.session
    }
  }

  /**
   * Get user who performed vaccination
   *
   * @returns {User} User
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
   * @returns {User} User
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
   * @returns {User} User
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
   * @returns {Programme} Programme
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
    const programme = this.variant
      ? formatTag({
          text: this.programmeOrVariantName,
          colour: 'transparent'
        })
      : this.programme?.nameTag

    return {
      createdAt: formatDate(this.createdAt, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      createdAt_date: formatDate(this.createdAt, {
        dateStyle: 'long'
      }),
      createdAt_time: formatDate(this.createdAt, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      createdAt_dateShort: formatDate(this.createdAt, {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      createdBy: this.createdBy?.fullName || 'Unknown',
      suppliedBy: this.suppliedBy?.fullName || '',
      updatedAt: formatDate(this.updatedAt, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      }),
      reportedAt:
        this.reportedAt &&
        formatDate(this.reportedAt, {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
      reportedBy: (this.reportedBy && this.reportedBy?.fullName) || '',
      syncStatus: formatWithSecondaryText(
        formatTag(getVaccinationSyncStatus(this.syncStatus)),
        this.syncStatusNotes,
        true
      ),
      batch: this.batch?.summary,
      batch_id: formatMonospace(this.batch_id),
      dose: formatMillilitres(this.dose),
      sequence: this.sequence && formatSequence(this.sequence),
      vaccine_snomed: this.vaccine_snomed ? this.vaccine?.brand : 'Unknown',
      note: formatMarkdown(this.note),
      outcome: formatTag(getVaccinationOutcomeStatus(this.outcome)),
      programme: this.programmeOther || programme,
      programmeWithSequence:
        this.programmeOther ||
        formatWithSecondaryText(
          programme,
          formatSequence(this.sequence),
          false
        ),
      location:
        (this?.location &&
          Object.values(this.location)
            .filter((string) => string)
            .join(', ')) ||
        'Unknown',
      country: this.countryOther || this.country || 'England',
      school: this.school && this.school.name,
      identifiedBy: this.selfId
        ? 'The child'
        : formatIdentifier(this.identifiedBy)
    }
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
