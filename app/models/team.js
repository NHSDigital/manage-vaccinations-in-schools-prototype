import { fakerEN_GB as faker } from '@faker-js/faker'
import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { TeamDefaults } from '../enums.js'
import { Clinic, School } from '../models.js'
import { stringToBoolean } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} TeamOptions
 * @property {string} [id] - Team ID
 * @property {string} [ods] - ODS code
 * @property {string} [name] - Full name
 * @property {string} [email] - Email address
 * @property {string} [tel] - Phone number
 * @property {string} [privacyPolicyUrl] - Privacy policy URL
 * @property {number} [sessionOpenWeeks] - Weeks before request consent
 * @property {number} [sessionReminderWeeks] - Weeks before send first reminder
 * @property {boolean} [schoolSessionRegistration] - Should school sessions have registration
 * @property {number} [clinicNasalSprayDuration] - Minutes to allocate each nasal spray
 * @property {number} [clinicInjectionDuration] - Minutes to allocate each injection
 * @property {boolean} [clinicSessionRegistration] - Should clinic sessions have registration
 */

/**
 * @class Team
 */
export class Team extends BaseModel {
  static contextKey = 'teams'
  static ns = 'team'

  /**
   * @param {TeamOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.context = context
    this.id = options?.id || faker.helpers.replaceSymbols('###')
    this.ods = options?.ods || faker.helpers.replaceSymbols('???')
    this.name = options?.name
    this.email = options?.email
    this.tel = options?.tel
    this.privacyPolicyUrl = options?.privacyPolicyUrl
    this.sessionOpenWeeks =
      Number(options?.sessionOpenWeeks) || TeamDefaults.SessionOpenWeeks
    this.sessionReminderWeeks =
      Number(options?.sessionReminderWeeks) || TeamDefaults.SessionReminderWeeks
    this.schoolSessionRegistration =
      stringToBoolean(options.schoolSessionRegistration) ??
      TeamDefaults.SchoolSessionRegistration
    this.clinicNasalSprayDuration =
      Number(options?.clinicNasalSprayDuration) ||
      TeamDefaults.NasalSprayDuration
    this.clinicInjectionDuration =
      Number(options?.clinicInjectionDuration) || TeamDefaults.InjectionDuration
    this.clinicSessionRegistration =
      stringToBoolean(options.clinicSessionRegistration) ??
      TeamDefaults.ClinicSessionRegistration
  }

  /**
   * Get clinics
   *
   * @returns {Array<Clinic>|undefined} Clinics
   */
  get clinics() {
    try {
      return Clinic.findAll(this.context).sort((a, b) =>
        a.name.localeCompare(b.name)
      )
    } catch (error) {
      console.error('Team.clinics', error.message)
    }
  }

  /**
   * Get schools
   *
   * @returns {Array<School>|undefined} Schools
   */
  get schools() {
    try {
      return School.findAll(this.context)
        .filter((school) => !['888888', '999999'].includes(school.id))
        .sort((a, b) => a.name.localeCompare(b.name))
    } catch (error) {
      console.error('Team.schools', error.message)
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
          switch (prop) {
            case 'sessionOpenWeeks': {
              const weeks = prototypeFilters.plural(
                this.sessionOpenWeeks,
                'week'
              )
              return `Send ${weeks} before first session`
            }
            case 'sessionReminderWeeks': {
              const weeks = prototypeFilters.plural(
                this.sessionReminderWeeks,
                'week'
              )
              return `Send ${weeks} before each session`
            }
            case 'nasalSprayDuration':
              return prototypeFilters.plural(
                this.clinicNasalSprayDuration,
                'minute'
              )
            case 'injectionDuration':
              return prototypeFilters.plural(
                this.clinicInjectionDuration,
                'minute'
              )
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
    return `/teams/${this.id}`
  }
}

/**
 * @import { BaseModelOptions } from './base.js'
 */
