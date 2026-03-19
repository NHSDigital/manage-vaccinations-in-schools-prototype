import { fakerEN_GB as faker } from '@faker-js/faker'
import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { TeamDefaults } from '../enums.js'
import { Clinic, School } from '../models.js'
import { today } from '../utils/date.js'
import { stringToBoolean } from '../utils/string.js'

/**
 * @class Team
 * @param {object} options - Options
 * @param {object} [context] - Context
 * @property {object} [context] - Context
 * @property {string} [id] - Team ID
 * @property {string} [ods] - ODS code
 * @property {Date} [updatedAt] - Updated date
 * @property {string} [name] - Full name
 * @property {string} [email] - Email address
 * @property {string} [tel] - Phone number
 * @property {string} [privacyPolicyUrl] - Privacy policy URL
 * @property {number} [sessionOpenWeeks] - Weeks before session to request consent
 * @property {number} [sessionReminderWeeks] - Days before sending first reminder
 * @property {boolean} [sessionRegistration] - Should sessions have registration
 * @property {string} [password] - Shared password
 * @property {Array<string>} [clinic_ids] - Clinic IDs
 * @property {Array<string>} [school_ids] - School URNs
 */
export class Team {
  constructor(options, context) {
    this.context = context
    this.id = options?.id || faker.helpers.replaceSymbols('###')
    this.ods = options?.ods || faker.helpers.replaceSymbols('???')
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.name = options?.name
    this.email = options?.email
    this.tel = options?.tel
    this.privacyPolicyUrl = options?.privacyPolicyUrl
    this.sessionOpenWeeks =
      Number(options?.sessionOpenWeeks) || TeamDefaults.SessionOpenWeeks
    this.sessionReminderWeeks =
      Number(options?.sessionReminderWeeks) || TeamDefaults.SessionReminderWeeks
    this.sessionRegistration =
      stringToBoolean(options.sessionRegistration) ||
      TeamDefaults.SessionRegistration
    this.password = options?.password
    this.clinic_ids = options?.clinic_ids || []
    this.school_ids = options?.school_ids || []
  }

  /**
   * Get clinics
   *
   * @returns {Array<Clinic>|undefined} Clinics
   */
  get clinics() {
    try {
      return this?.clinic_ids
        .map((id) => Clinic.findOne(id, this.context))
        .sort((a, b) => a.name.localeCompare(b.name))
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
      return this?.school_ids
        .filter((id) => !['888888', '999999'].includes(id))
        .map((id) => School.findOne(id, this.context))
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
    const sessionOpenWeeks = prototypeFilters.plural(
      this.sessionOpenWeeks,
      'week'
    )
    const sessionReminderWeeks = prototypeFilters.plural(
      this.sessionReminderWeeks,
      'week'
    )

    return {
      sessionOpenWeeks: `Send ${sessionOpenWeeks} before first session`,
      sessionReminderWeeks: `Send ${sessionReminderWeeks} before each session`
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'team'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/teams/${this.id}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Team>|undefined} Teams
   * @static
   */
  static findAll(context) {
    return Object.values(context.teams).map((team) => new Team(team, context))
  }

  /**
   * Find one
   *
   * @param {string} id - Team ID
   * @param {object} context - Context
   * @returns {Team|undefined} Team
   * @static
   */
  static findOne(id, context) {
    if (context?.teams?.[id]) {
      return new Team(context.teams[id], context)
    }
  }

  /**
   * Update
   *
   * @param {string} id - Team ID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Team} Team
   * @static
   */
  static update(id, updates, context) {
    const updatedTeam = Object.assign(Team.findOne(id, context), updates)
    updatedTeam.updatedAt = today()

    // Remove team context
    delete updatedTeam.context

    // Delete original team (with previous ID)
    delete context.teams[id]

    // Update context
    context.teams[updatedTeam.id] = updatedTeam

    return updatedTeam
  }
}
