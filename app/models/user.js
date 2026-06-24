import { fakerEN_GB as faker } from '@faker-js/faker'

import { UserRole, VaccineMethod } from '../enums.js'
import { formatCode, formatLink } from '../utils/string.js'

import { BaseModel } from './base.js'
import { Team } from './team.js'

/**
 * @typedef {BaseModelOptions & object} UserOptions
 * @property {string} [uid] - User UID
 * @property {string} [firstName] - First/given name
 * @property {string} [lastName] - Last/family name
 * @property {string} [email] - Email address
 * @property {UserRole} [role] - User role
 * @property {object} [vaccinations] - Vaccination count
 * @property {object} [team_id] - Team ID
 */

/**
 * @class User
 */
export class User extends BaseModel {
  static contextKey = 'users'
  static ns = 'user'

  /**
   * @param {UserOptions} options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.team_id

    /** @type {Team|undefined} */
    this.team

    this.context = context
    this.uid = options?.uid || faker.string.numeric(12)
    this.firstName = options?.firstName
    this.lastName = options?.lastName
    this.email = options?.email
    this.role = options?.role
    this.vaccinations = options?.vaccinations || {}
    this.team_id = options?.team_id || '001'
  }

  /**
   * Can provide PSD instruction
   *
   * @returns {boolean} Can provide PSD instruction
   */
  get canPrescribe() {
    return [UserRole.NursePrescriber, UserRole.Pharmacist].includes(this.role)
  }

  /**
   * Get full name, formatted as LASTNAME, Firstname
   *
   * @returns {string} Full name
   */
  get fullName() {
    return [this.lastName.toUpperCase(), this.firstName].join(', ')
  }

  /**
   * Get user name and role
   *
   * @returns {string} Full name
   */
  get nameAndRole() {
    return `${this.fullName} (${this.role})`
  }

  /**
   * Get authorised vaccine methods
   *
   * @returns {Array<VaccineMethod>} Vaccine methods
   */
  get vaccineMethods() {
    switch (true) {
      case [UserRole.Nurse, UserRole.NursePrescriber].includes(this.role):
        return [VaccineMethod.Injection, VaccineMethod.Intranasal]
      case this.role === UserRole.HCA:
        return [VaccineMethod.Intranasal]
      default:
        return []
    }
  }

  /**
   * Get authorised views
   *
   * @returns {Array<string>} Views
   */
  get views() {
    switch (true) {
      case this.role === UserRole.DataConsumer:
        return ['reports']
      default:
        return [
          'patients',
          'schools',
          'sessions',
          'reviews',
          'reports',
          'uploads',
          'downloads',
          'vaccines',
          'teams'
        ]
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
            case 'uid':
              return formatCode(this.uid)
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
      email: formatLink(`mailto:${this.email}`, this.fullName),
      fullName: formatLink(this.uri, this.fullName)
    }
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/users/${this.uid}`
  }
}

User.relate('team_id', () => Team, 'team')

/**
 * @import { BaseModelOptions } from './base.js'
 */
