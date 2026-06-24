import { default as filters } from '@x-govuk/govuk-prototype-filters'
import { isAfter, isBefore } from 'date-fns'
import _ from 'lodash'

import { SchoolClosureReason, SchoolStatus } from '../enums.js'
import { Location, Patient, Session } from '../models.js'
import { formatDate, getDateValueDifference, today } from '../utils/date.js'
import { tokenize } from '../utils/object.js'
import { getSchoolStatus } from '../utils/status.js'
import {
  formatCode,
  formatLink,
  formatTag,
  formatYearGroups,
  stringToBoolean
} from '../utils/string.js'

/**
 * @typedef {object} SchoolOptions
 * @property {string} [urn] - URN
 * @property {Date} [openAt] - Date school opened (or will open)
 * @property {Date} [closeAt] - Date school closed (or will close)
 * @property {SchoolClosureReason} [closeReason] - Reason school closed
 * @property {Array<string>} [linkedUrns] - GIAS linked URNs
 * @property {SchoolPhase} [phase] - Phase
 * @property {boolean} [sen] - SEN school
 * @property {string} [site] - Site code
 * @property {Array<number>} [yearGroups] - Year groups
 */

/**
 * @class School
 * @augments Location
 */
export class School extends Location {
  /**
   * @param {SchoolOptions & LocationOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.urn = options?.urn && String(options.urn)
    this.openAt = options?.openAt && new Date(options.openAt)
    this.closeAt = options?.closeAt && new Date(options.closeAt)
    this.closeReason = options?.closeReason
    this.linkedUrns = options?.linkedUrns || []
    this.phase = options?.phase
    this.sen = stringToBoolean(options?.sen) || false
    this.site = options?.site
    this.yearGroups = options?.yearGroups || []
  }

  /**
   * Get year groups for `checkboxes`s
   *
   * @returns {Array<string>} `checkboxes` array values
   */
  get yearGroups_() {
    return this.yearGroups.map((yearGroup) => String(yearGroup))
  }

  /**
   * Set year groups from `checkboxes`s
   *
   * @param {Array<string>} array - checkboxes array values
   */
  set yearGroups_(array) {
    if (array) {
      this.yearGroups = array
        .filter((item) => item !== '_unchecked')
        .map((yearGroup) => Number(yearGroup))
    }
  }

  /**
   * Get school pupils
   *
   * @returns {Array<Patient>} Patient records
   */
  get patients() {
    if (this.context?.patients && this.id) {
      return Object.values(this.context?.patients)
        .filter(({ school_id }) => school_id === this.id)
        .map((patient) => new Patient(patient, this.context))
    }

    return []
  }

  /**
   * Get school pupils missing an NHS number
   *
   * @returns {Array<Patient>} Patient records
   */
  get patientsMissingNhsNumber() {
    return this.patients.filter((patient) => patient.hasMissingNhsNumber)
  }

  /**
   * Get linked schools
   *
   * @returns {Array<School>} Linked schools
   */
  get linkedSchools() {
    return this.linkedUrns.map((urn) => School.findOne(urn, this.context))
  }

  /**
   * Get GIAS establishment status (based on school closure date)
   *
   * @returns {SchoolStatus|undefined} GIAS establishment status
   */
  get status() {
    if (this.isHomeOrUnknown) {
      return
    }

    switch (true) {
      case this.openAt && isAfter(this.openAt, today()):
        return SchoolStatus.Opening
      case this.closeAt && isAfter(this.closeAt, today()):
        return SchoolStatus.Closing
      case this.closeAt && isBefore(this.closeAt, today()):
        return SchoolStatus.Closed
      default:
        return SchoolStatus.Open
    }
  }

  /**
   * Get expanded description about GIAS establishment status
   *
   * @returns {string|undefined} Status description
   */
  get statusDescription() {
    if (this.isHomeOrUnknown || this.status === SchoolStatus.Open) {
      return
    }

    let preface
    const closing = this.status === SchoolStatus.Closing
    const opening = this.status === SchoolStatus.Opening
    const schoolNames = filters.formatList(
      this.linkedSchools.map((school) => school.link.nameAndUrn)
    )

    if (opening) {
      return this.linkedSchools.length
        ? `This school will open on ${this.formatted.openAt}, succeeding ${schoolNames}.`
        : `This school will open on ${this.formatted.openAt}.`
    }

    switch (this.closeReason) {
      case SchoolClosureReason.Amalgamated:
        preface = closing
          ? `This school will be amalgamated with ${schoolNames}`
          : `This school was amalgamated with ${schoolNames}`
        break
      case SchoolClosureReason.Closed:
        preface = closing ? `This school will close` : `This school closed`
        break
      case SchoolClosureReason.Merged:
        preface = closing
          ? `This school will merge with ${schoolNames}`
          : `This school merged with ${schoolNames}`
        break
      case SchoolClosureReason.Succeeded:
        preface = closing
          ? `This school will be succeeded by ${schoolNames}`
          : `This school was succeeded by ${schoolNames}`
        break
      case SchoolClosureReason.Split:
        preface = closing
          ? `This school will split into ${schoolNames}`
          : `This school was split into ${schoolNames}`
    }

    return `${preface} on ${this.formatted.closeAt}.`
  }

  /**
   * Is home-educated or unknown school
   *
   * @returns {boolean} Home-educated or unknown school
   */
  get isHomeOrUnknown() {
    return ['888888', '999999'].includes(this.urn)
  }

  /**
   * Is a closed school (schools that are opening soon are considered open)
   *
   * @returns {boolean} Closed school
   */
  get isClosed() {
    return this.status === SchoolStatus.Closed
  }

  /**
   * Is an open school (schools that are opening soon are considered open)
   *
   * @returns {boolean} Open school
   */
  get isOpen() {
    return !this.isClosed
  }

  /**
   * Get school pupils to invite to a (clinic) session
   *
   * @param {string} programmeId - Programme ID
   * @returns {Array<Patient>} Patient records
   */
  patientsToInviteToSession(programmeId) {
    return this.patients.filter(
      (patient) => patient.programmes[programmeId].canInviteToSession
    )
  }

  /**
   * Get sessions run at this school
   *
   * @returns {Array<Session>|undefined} Sessions
   */
  get sessions() {
    if (this.context) {
      return Session.findAll(this.context)
        .filter((session) => session.school_id === this.id)
        .sort((a, b) => getDateValueDifference(a.date, b.date))
    }
  }

  /**
   * Get next session at this school
   *
   * @returns {Date|undefined} Next session
   */
  get nextSessionDate() {
    if (this.sessions?.length > 0) {
      const lastSessionDate = this.sessions.at(-1).date

      if (isBefore(today(), lastSessionDate)) {
        return lastSessionDate
      }
    }
  }

  /**
   * Get tokenised values (to use in search queries)
   *
   * @returns {string} Tokens
   */
  get tokenized() {
    const tokens = tokenize(this, ['location.postalCode', 'location.name'])

    return [tokens].join(' ')
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
          const getId = () => formatCode(this.id)

          switch (prop) {
            case 'urn':
              return formatCode(this.urn)
            case 'id':
              return getId()
            case 'openAt':
              return (
                this.openAt && formatDate(this.openAt, { dateStyle: 'long' })
              )
            case 'closeAt':
              return (
                this.closeAt && formatDate(this.closeAt, { dateStyle: 'long' })
              )
            case 'nameAndUrn':
              return `${this.name} (${getId()})`
            case 'nextSessionDate':
              return formatDate(this.nextSessionDate, { dateStyle: 'full' })
            case 'patients':
              return filters.plural(this.patients.length, 'child')
            case 'site':
              return formatCode(this.site)
            case 'status':
              return this.status && formatTag(getSchoolStatus(this.status))
            case 'yearGroups':
              return formatYearGroups(this.yearGroups)
            default:
              return super.formatted?.[prop]
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
      name: formatLink(this.uri, this.name),
      nameAndUrn: formatLink(this.uri, this.formatted.nameAndUrn)
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'school'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/schools/${this.id}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<School>|undefined} Schools
   * @static
   */
  static findAll(context) {
    return Object.values(context.schools).map(
      (school) => new School(school, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} id - School ID
   * @param {object} context - Context
   * @returns {School|undefined} School
   * @static
   */
  static findOne(id, context) {
    if (context?.schools?.[id]) {
      return new School(context.schools[id], context)
    }
  }

  /**
   * Create
   *
   * @param {School} school - School
   * @param {object} context - Context
   * @returns {School} Created school
   * @static
   */
  static create(school, context) {
    const createdSchool = new School(school)

    // Add to team
    if (context.teams) {
      context.teams[createdSchool.team_id].school_ids.push(createdSchool.id)
    }

    // Update context
    context.schools = context.schools || {}
    context.schools[createdSchool.id] = createdSchool

    return createdSchool
  }

  /**
   * Update
   *
   * @param {string} id - School ID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {School} Updated school
   * @static
   */
  static update(id, updates, context) {
    const updatedSchool = _.mergeWith(
      School.findOne(id, context),
      updates,
      (oldValue, newValue) => {
        // yearGroups array shouldn’t be merged but replaced entirely
        if (Array.isArray(oldValue)) {
          return newValue
        }
      }
    )

    // Update team
    if (context.teams) {
      context.teams[updatedSchool.team_id].school_ids.push(updatedSchool.id)
    }

    // Remove school context
    delete updatedSchool.context

    // Delete original school (with previous ID)
    delete context.schools[id]

    // Update context
    context.schools[updatedSchool.id] = updatedSchool

    return new School(updatedSchool, context)
  }

  /**
   * Delete
   *
   * @param {string} id - School ID
   * @param {object} context - Context
   * @static
   */
  static delete(id, context) {
    const school = School.findOne(id, context)

    // Remove from team
    context.teams[school.team_id].school_ids = context.teams[
      school.team_id
    ].school_ids.filter((item) => item !== id)

    delete context.schools[id]
  }
}

/**
 * @import { SchoolPhase } from '../enums.js'
 * @import { LocationOptions } from './location.js'
 */
