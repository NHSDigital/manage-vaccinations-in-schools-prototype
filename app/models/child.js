import schools from '../datasets/schools.js'
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
import {
  convertIsoDateToObject,
  convertObjectToIsoDate,
  formatDate,
  getAge,
  getYearGroup
} from '../utils/date.js'
import { formatList, formatYearGroup, stringToArray } from '../utils/string.js'

/**
 * @class Child
 * @param {object} options - Options
 * @param {object} [context] - Context
 * @property {object} [context] - Context
 * @property {string} [firstName] - First name
 * @property {string} [lastName] - Last name
 * @property {string} [preferredFirstName] - Preferred first name
 * @property {string} [preferredLastName] - Preferred last name
 * @property {Date} [dob] - Date of birth
 * @property {object} [dob_] - Date of birth (from `dateInput`)
 * @property {Date} [dod] - Date of death
 * @property {import('../enums.js).Gender} gender - Gender
 * @property {EthnicGroup} [ethnicGroup] - Ethnic group
 * @property {string} [ethnicGroupOther] - Other ethnic group
 * @property {import('../enums.js).EthnicBackground')} [ethnicBackground] - Ethnic background
 * @property {string} [ethnicBackgroundOther] - Other ethnic background
 * @property {Array<Adjustment>} [adjustments] - Reasonable adjustments
 * @property {Array<Impairment>} [impairments] - Impairments
 * @property {string} [impairmentsOther] - Other impairment
 * @property {boolean} [immunocompromised] - Immunocompromised
 * @property {object} [address] - Address
 * @property {string} [gpSurgery] - GP surgery
 * @property {string} [registrationGroup] - Registration group
 * @property {string} [school_id] - School
 */
export class Child {
  constructor(options, context) {
    this.context = context
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
    this.adjustments =
      (options?.adjustments && stringToArray(options.adjustments)) || []
    this.impairments =
      (options?.impairments && stringToArray(options.impairments)) || []
    this.immunocompromised = options?.immunocompromised
    this.address = options?.address
    this.gpSurgery = options?.gpSurgery
    this.registrationGroup = options?.registrationGroup
    this.school_id = options?.school_id

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
   * Get full name
   *
   * @returns {string} Full name
   */
  get fullName() {
    if (!this.firstName || !this.lastName) return ''

    return [this.firstName, this.lastName].join(' ')
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
   * @returns {object|undefined} `dateInput` object
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
   * Get formatted ethnicity (ethnic group and background)
   *
   * @returns {string} Date of birth and age in years
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
   * Is the child over the age of 16?
   *
   * @returns {boolean} Child is over the age of 16
   */
  get post16() {
    return this.age >= 17
  }

  /**
   * Get year group
   *
   * @returns {number|undefined} Year group, for example 8
   */
  get yearGroup() {
    if (!this.post16) {
      return getYearGroup(this.dob)
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
    return this.preferredName
      ? `${this.fullName} (known as ${this.preferredName})`
      : this.fullName
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
   * Get school
   *
   * @returns {object|undefined} School
   */
  get school() {
    if (this.school_id) {
      return schools[this.school_id]
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
    const yearGroup = formatYearGroup(this.yearGroup)

    return {
      dob: formatDate(this.dob, { dateStyle: 'long' }),
      dod: formatDate(this.dod, { dateStyle: 'long' }),
      address:
        this?.address &&
        Object.values(this.address)
          .filter((string) => string)
          .join('<br>'),
      ...(!this.post16 && {
        yearGroup,
        yearGroupWithRegistration:
          this.registrationGroup && yearGroup
            ? `${yearGroup} (${this.registrationGroup})`
            : yearGroup,
        school: this?.school && this.school.name
      }),
      adjustments: this.adjustments && formatList(this.adjustments),
      impairments: this.impairments && formatList(this.impairments)
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'child'
  }
}
