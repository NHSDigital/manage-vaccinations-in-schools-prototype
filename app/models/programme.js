import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import vaccines from '../datasets/vaccines.js'
import { ProgrammeType, VaccineCriteria } from '../enums.js'
import { PatientSession, Session, Vaccination, Vaccine } from '../models.js'
import {
  formatLink,
  formatTag,
  formatYearGroup,
  sentenceCaseProgrammeName
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ProgrammeOptions
 * @property {string} [id] - Programme ID
 * @property {ProgrammeType} [type] - Programme type
 * @property {boolean} [hidden] - Hidden
 * @property {string} [name] - Name
 * @property {string} [title] - Title
 * @property {object} [emailNames] - Email names
 * @property {object} [information] - NHS.UK programme information
 * @property {object} [guidance] - GOV.UK guidance
 * @property {Array<string>} [sequence] - Vaccine dose sequence
 * @property {Array<string>} [immunocompromisedSequence] - Vaccine dose sequence for immunocompromised patients
 * @property {string} [sequenceDefault] - Default vaccine dose sequence
 * @property {Array<number>} [yearGroups] - All eligible year groups for this programme
 * @property {number} [targetYearGroup] - Year group for routine vaccination
 * @property {boolean} [ttcv] - Tetanus-toxoid containing vaccination programme
 * @property {boolean} [nhseSyncable] - Vaccination records can be synced
 * @property {Array<string>} [vaccine_snomeds] - Vaccines administered
 */

/**
 * @class Programme
 */
export class Programme extends BaseModel {
  static contextKey = 'programmes'
  static ns = 'programme'

  /**
   * @param {ProgrammeOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.context = context
    this.id = options?.id
    this.type = options?.type
    this.hidden = options?.hidden || false
    this.name = options?.name
    this.title = options?.title
    this.emailNames = options?.emailNames
    this.information = options?.information
    this.guidance = options?.guidance
    this.sequence = options?.sequence
    this.immunocompromisedSequence = options?.immunocompromisedSequence
    this.sequenceDefault = options?.sequenceDefault
    this.yearGroups = options?.yearGroups
    this.targetYearGroup = options?.targetYearGroup
    this.ttcv = options?.ttcv || false
    this.nhseSyncable = options?.nhseSyncable || false
    this.vaccine_snomeds = options?.vaccine_snomeds || []
  }

  /**
   * Get programme name for use in emails
   *
   * @returns {string} Programme email name
   * @param {string} template - Email template the name is for
   */
  emailName(template = 'default') {
    return this.emailNames?.[template] || this.name
  }

  /**
   * Get programme name for use within a sentence
   *
   * @returns {string} Programme name
   */
  get nameSentenceCase() {
    return sentenceCaseProgrammeName(this.type)
  }

  /**
   * Get programme name shown within tag component
   *
   * @returns {string} Tag component HTML
   */
  get nameTag() {
    return formatTag({
      text: this.name,
      colour: 'transparent'
    })
  }

  /**
   * Get start date
   *
   * @returns {string} Start date
   */
  get start() {
    const thisYear = new Date().getFullYear()

    return `${thisYear}-09-01`
  }

  /**
   * Get vaccine(s) used by this programme
   *
   * @returns {Array<Vaccine>} Vaccine
   */
  get vaccines() {
    return this.vaccine_snomeds.map((snomed) =>
      Vaccine.findOne(snomed, this.context)
    )
  }

  /**
   * Standard vaccine for a programme
   * Flu offers a nasal spray and MMR offers an injection that contains gelatine
   *
   * @returns {Vaccine|undefined} Standard vaccine
   */
  get standardVaccine() {
    return this.vaccines.find(
      (vaccine) =>
        vaccine && vaccine.criteria !== VaccineCriteria.AlternativeInjection
    )
  }

  /**
   * Alternative vaccine for a programme
   * Both Flu and MMR programmes offer alternative gelatine-free injection
   *
   * @returns {Vaccine|undefined} Alternative vaccine
   */
  get alternativeVaccine() {
    if (this.vaccines.length > 1) {
      return this.vaccines.find(
        (vaccine) =>
          vaccine && vaccine.criteria === VaccineCriteria.AlternativeInjection
      )
    }
  }

  /**
   * Get vaccine name
   *
   * @returns {object} Vaccine name
   * @example Children’s flu vaccine
   * @example Td/IPV vaccine (3-in-1 teenage booster)
   */
  get vaccineName() {
    const vaccineName =
      this.type === ProgrammeType.Flu
        ? `${this.title} vaccine`
        : `${this.name} vaccine`

    return {
      sentenceCase: sentenceCaseProgrammeName(vaccineName),
      titleCase: vaccineName
    }
  }

  /**
   * Get consent form PDF
   *
   * @returns {string} Consent form PDF
   */
  get consentPdf() {
    return `/public/downloads/${this.id}-consent-form.pdf`
  }

  /**
   * Get patient sessions
   *
   * @returns {Array<PatientSession>} Patient sessions
   */
  get patientSessions() {
    return PatientSession.findAll(this.context).filter(
      ({ programme_id }) => programme_id === this.id
    )
  }

  /**
   * Get sessions
   *
   * @returns {Array<Session>} Sessions
   */
  get sessions() {
    return Session.findAll(this.context)
      .filter(({ programme_ids }) => programme_ids.includes(this.id))
      .filter(({ patients }) => patients.length > 0)
      .sort((a, b) => a.location?.name.localeCompare(b.location?.name))
  }

  /**
   * Get vaccinations
   *
   * @returns {Array<Vaccination>} Vaccinations
   */
  get vaccinations() {
    return Vaccination.findAll(this.context)
      .filter(({ programme_id }) => programme_id === this.id)
      .sort((a, b) => a.patient?.lastName.localeCompare(b.patient?.lastName))
  }

  /**
   * Get patient session programme statuses
   *
   * @param {PatientStatus} patientStatus - Patient status
   * @returns {Array<PatientSession>} Patient session programme statuses
   */
  report(patientStatus) {
    return this.patientSessions.filter(({ report }) => report === patientStatus)
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
            case 'consentPdf':
              return (
                this.consentPdf &&
                formatLink(
                  this.consentPdf,
                  `Download the ${this.name} consent form (PDF)`,
                  { download: 'true' }
                )
              )
            case 'yearGroups': {
              const formattedYearGroups = this.yearGroups.map((yearGroup) =>
                formatYearGroup(yearGroup)
              )
              return prototypeFilters.formatList(formattedYearGroups)
            }
            case 'vaccines': {
              const vaccineList = Array.isArray(this.vaccine_snomeds)
                ? this.vaccine_snomeds.map(
                    (snomed) => new Vaccine(vaccines[snomed]).brand
                  )
                : []
              return vaccineList.join('<br>')
            }
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
      name: formatLink(this.uri, this.name)
    }
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/reports/${this.id}`
  }
}

/**
 * @import { PatientStatus } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
