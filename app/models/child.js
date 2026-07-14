import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  Adjustment,
  EthnicBackgroundAsian,
  EthnicBackgroundBlack,
  EthnicBackgroundMixed,
  EthnicBackgroundOther,
  EthnicBackgroundWhite,
  EthnicGroup,
  Impairment
} from '../enums.js'
import { School } from '../models.js'
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  getAge,
  getYearGroup
} from '../utils/date.js'
import {
  formatFullName,
  formatList,
  formatYearGroup,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} ChildOptions
 * @property {string} [uuid] - Child UUID
 * @property {string} [firstName] - First name
 * @property {string} [lastName] - Last name
 * @property {string} [preferredFirstName] - Preferred first name
 * @property {string} [preferredLastName] - Preferred last name
 * @property {Date} [dob] - Date of birth
 * @property {object} [dob_] - Date of birth (from `dateInput`)
 * @property {Date} [dod] - Date of death
 * @property {Gender} [gender] - Gender
 * @property {EthnicGroup} [ethnicGroup] - Ethnic group
 * @property {string} [ethnicGroupOther] - Other ethnic group
 * @property {EthnicBackground} [ethnicBackground] - Ethnic background
 * @property {string} [ethnicBackgroundOther] - Other ethnic background
 * @property {Array<Adjustment>} [adjustments] - Reasonable adjustments
 * @property {string} [adjustmentsOther] - Other adjustment
 * @property {Array<Impairment>} [impairments] - Impairments
 * @property {string} [impairmentsOther] - Other impairment
 * @property {boolean} [isImmunocompromised] - Is immunocompromised
 * @property {object} [address] - Address
 * @property {string} [gpSurgery] - GP surgery
 * @property {number} [academicYearGroup] - Academic year group (override)
 * @property {string} [registrationGroup] - Registration group
 */

/**
 * @class Child
 */
export class Child extends BaseModel {
  static ns = 'child'

  /**
   * @param {ChildOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    /** @type {string|undefined} */
    this.school_id

    /** @type {School|undefined} */
    this.school

    this.context = context
    this.uuid = options?.uuid || faker.string.uuid()
    this.firstName = options?.firstName || ''
    this.lastName = options?.lastName || ''
    this.preferredFirstName = options?.preferredFirstName
    this.preferredLastName = options?.preferredLastName
    this.dob = options?.dob && new Date(options.dob)
    this.dob_ = options?.dob_
    this.dod = options?.dod ? new Date(options.dod) : undefined
    this.gender = options?.gender
    this.ethnicGroup = options?.ethnicGroup
    this.ethnicBackground = options?.ethnicBackground
    this.adjustments = stringToArray(options?.adjustments)
    this.impairments = stringToArray(options?.impairments)
    this.isImmunocompromised = stringToBoolean(options?.isImmunocompromised)
    this.address = options?.address
    this.gpSurgery = options?.gpSurgery
    this.academicYearGroup = options?.academicYearGroup || this.yearGroup
    this.registrationGroup = options?.registrationGroup

    if (this.ethnicGroup === EthnicGroup.Other) {
      this.ethnicGroupOther = options?.ethnicGroupOther
    }

    if (
      [
        EthnicBackgroundWhite.Other,
        EthnicBackgroundMixed.Other,
        EthnicBackgroundAsian.Other,
        EthnicBackgroundBlack.Other,
        EthnicBackgroundOther.Other
      ].includes(this.ethnicBackground)
    ) {
      this.ethnicBackgroundOther = options?.ethnicBackgroundOther
    }

    if (this.adjustments.includes(Adjustment.Other)) {
      this.adjustmentsOther = options?.adjustmentsOther
    }

    if (this.impairments.includes(Impairment.Other)) {
      this.impairmentsOther = options?.impairmentsOther
    }
  }

  /**
   * Get full name formatted for SAIS team-facing pages
   *
   * @returns {string} Full name
   */
  get fullName() {
    return formatFullName(this.firstName, this.lastName, false)
  }

  /**
   * Get full name formatted for parent-facing pages
   *
   * @returns {string} Full name
   */
  get fullFriendlyName() {
    return formatFullName(this.firstName, this.lastName, true)
  }

  /**
   * Get obscured name (to use in page titles)
   *
   * @returns {string} Full name
   */
  get initials() {
    return [this.firstName[0], this.lastName[0]].join('')
  }

  /**
   * Get date of birth for `dateInput`
   *
   * @returns {object|string} `dateInput` object
   */
  get dob_() {
    return convertIsoDateToObject(this.dob)
  }

  /**
   * Set date of birth from `dateInput`
   *
   * @param {object} object - dateInput object
   */
  set dob_(object) {
    if (object) {
      this.dob = convertObjectToIsoDate(object)
    }
  }

  /**
   * Get age
   *
   * @returns {number} Age in years
   */
  get age() {
    return getAge(this.dob)
  }

  /**
   * Get formatted date of birth and age
   *
   * @returns {string} Date of birth and age in years
   */
  get dobWithAge() {
    return `${this.formatted.dob} (aged ${this.age})`
  }

  /**
   * Can the child be offered the MMRV vaccine rather than MMR?
   *
   * Note: This property makes no assessment of their <b>need</b> for a vaccination
   *
   * @returns {boolean} Can be offered MMRV (`true`) or should only receive MMR (`false`)
   */
  get canBeOfferedMmrv() {
    return this.dob?.getFullYear() >= 2020
  }

  /**
   * Get formatted ethnicity (ethnic group and background)
   *
   * @returns {string|undefined} Date of birth and age in years
   */
  get ethnicity() {
    if (this.ethnicGroup && this.ethnicBackground !== 'false') {
      const group = this.ethnicGroupOther || this.ethnicGroup
      const background = this.ethnicBackgroundOther || this.ethnicBackground

      return `${group} (${background})`
    } else if (this.ethnicGroup) {
      return this.ethnicGroupOther || this.ethnicGroup
    }
  }

  /**
   * Is the child aged 16 or over?
   * Children over the age of 16 can self-consent
   *
   * @returns {boolean} Child is aged 16 or over
   */
  get isPost16() {
    return this.age >= 16
  }

  /**
   * Is the child still eligible for SAIS vaccinations?
   *
   * @returns {boolean} Child still eligible for SAIS vaccinations
   */
  get agedOutOfProgrammes() {
    return this.age >= 18
  }

  /**
   * Get year group
   *
   * @returns {number|undefined} Year group, for example 8
   */
  get yearGroup() {
    if (!this.agedOutOfProgrammes) {
      return this.academicYearGroup || getYearGroup(this.dob)
    }
  }

  /**
   * Get date of birth with year group
   *
   * @returns {string} Date of birth with year group
   */
  get dobWithYearGroup() {
    return `${this.formatted.dob} (${this.formatted.yearGroup})`
  }

  /**
   * Get preferred name
   *
   * @returns {string|undefined} Preferred name
   */
  get preferredName() {
    const firstName = this.preferredFirstName || this.firstName
    const lastName = this.preferredLastName || this.lastName

    if (!firstName || !lastName) return

    if (this.preferredFirstName || this.preferredLastName) {
      return [firstName, lastName].join(' ')
    }
  }

  /**
   * Get full and preferred names
   *
   * @returns {string} Full and preferred names
   */
  get fullAndPreferredNames() {
    // Don’t use LASTNAME, Firstname
    const fullName = [this.firstName, this.lastName].join(' ')

    return this.preferredName
      ? `${fullName} (known as ${this.preferredName})`
      : fullName
  }

  /**
   * Get post code
   *
   * @returns {string|undefined} Post code
   */
  get postalCode() {
    if (this.address?.postalCode) {
      return this.address.postalCode
    }
  }

  /**
   * Get school name
   *
   * @returns {string|undefined} School name
   */
  get schoolName() {
    if (this.school) {
      return this.school.name
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
          // Multiple properties use the formatted year group, but keep it lazy
          const getFormattedYearGroup = () => formatYearGroup(this.yearGroup)

          switch (prop) {
            case 'dob':
              return formatDate(this.dob, { dateStyle: 'long' })
            case 'dod':
              return formatDate(this.dod, { dateStyle: 'long' })
            case 'address':
              return (
                this?.address &&
                Object.values(this.address).filter(Boolean).join('<br>')
              )
            case 'yearGroup':
              if (this.agedOutOfProgrammes) return undefined
              return getFormattedYearGroup()
            case 'yearGroupWithRegistration': {
              if (this.agedOutOfProgrammes) return undefined
              const yearGroup = getFormattedYearGroup()
              return this.registrationGroup && yearGroup
                ? `${yearGroup} (${this.registrationGroup})`
                : yearGroup
            }
            case 'schoolName':
              if (this.agedOutOfProgrammes) return undefined
              return this?.school && this.school.name
            case 'adjustments':
              return (
                this.adjustments &&
                formatList(
                  this.adjustments.filter(
                    (adjustment) => adjustment !== Adjustment.None
                  )
                )
              )
            case 'impairments':
              return (
                this.impairments &&
                formatList(
                  this.impairments.filter(
                    (impairment) => impairment !== Impairment.None
                  )
                )
              )
            default:
              return undefined
          }
        }
      }
    )
  }
}

Child.relate('school_id', () => School, 'school')

/**
 * @import { Gender, EthnicBackground } from '../enums.js'
 * @import { BaseModelOptions } from './base.js'
 */
