import { fakerEN_GB as faker } from '@faker-js/faker'

import { formatLink, formatMonospace } from '../utils/string.js'

/**
 * @class User
 * @property {string} uid - User ID
 * @property {string} [firstName] - First/given name
 * @property {string} [lastName] - Last/family name
 * @property {string} [email] - Email address
 * @property {import('../enums.js').UserRole} [role] - User role
 * @property {boolean} [canPrescribe] - Can provide PSD instruction
 * @property {Array<import('../enums.js').VaccineMethod>} [vaccineMethods] - Vaccine methods
 * @property {object} [vaccinations] - Vaccination count
 */
export class User {
  constructor(options) {
    this.uid = options?.uid || faker.string.numeric(12)
    this.firstName = options?.firstName
    this.lastName = options?.lastName
    this.email = options?.email
    this.role = options?.role
    this.canPrescribe = options?.canPrescribe || false
    this.vaccineMethods = options?.vaccineMethods || []
    this.vaccinations = options?.vaccinations || {}
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
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return {
      uid: formatMonospace(this.uid)
    }
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
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'user'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/users/${this.uid}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<User>|undefined} Users
   * @static
   */
  static findAll(context) {
    return Object.values(context.users).map((user) => new User(user))
  }

  /**
   * Find one
   *
   * @param {string} uid - User UID
   * @param {object} context - Context
   * @returns {User|undefined} User
   * @static
   */
  static findOne(uid, context) {
    if (context?.users?.[uid]) {
      return new User(context.users[uid])
    }
  }
}
