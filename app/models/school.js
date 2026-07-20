import { default as filters } from '@x-govuk/govuk-prototype-filters'
import { isAfter, isBefore } from 'date-fns'

import { SchoolClosureReason, SchoolStatus } from '../enums.js'
import { Location, Patient, Programme, Session, Team } from '../models.js'
import { formatDate, getDateValueDifference, today } from '../utils/date.js'
import { getSchoolStatusProperties } from '../utils/enum-properties.js'
import { tokenize } from '../utils/object.js'
import {
  formatCode,
  formatLink,
  formatTag,
  formatYearGroups,
  localise,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

/**
 * @typedef {LocationOptions & object} SchoolOptions
 * @property {string} [urn] - URN
 * @property {Date} [openAt] - Date school opened (or will open)
 * @property {Date} [closeAt] - Date school closed (or will close)
 * @property {SchoolClosureReason} [closeReason] - Reason school closed
 * @property {Array<string>} [linkedUrns] - GIAS linked URNs
 * @property {SchoolPhase} [phase] - Phase
 * @property {boolean} [isSen] - SEN school
 * @property {string} [site] - Site code
 * @property {Array<string>} [teams] - Teams
 * @property {Array<number>} [yearGroups] - Year groups
 */

/**
 * @class School
 * @augments Location
 */
export class School extends Location {
  static contextKey = 'schools'
  static identifierKey = 'id'
  static ns = 'school'

  /**
   * @param {SchoolOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    this.urn = options?.urn && String(options.urn)
    this.openAt = options?.openAt && new Date(options.openAt)
    this.closeAt = options?.closeAt && new Date(options.closeAt)
    this.closeReason = options?.closeReason
    this.linkedUrns = stringToArray(options?.linkedUrns)
    this.phase = options?.phase
    this.isSen = stringToBoolean(options?.isSen) || false
    this.site = options?.site
    this.team_ids = options?.team_ids || []
    this.yearGroups = stringToArray(options?.yearGroups).map(Number)
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
   * Get school teams
   *
   * @returns {Array<Team>} Teams
   */
  get teams() {
    if (this.context?.teams && this.id) {
      return Object.values(this.context?.teams)
        .filter((school) => school.team_ids.includes(this.id))
        .map((team) => new Team(team, this.context))
    }

    return []
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
   * @returns {Array<Session>} Sessions
   */
  get sessions() {
    if (this.context && !this.isHomeOrUnknown) {
      return Session.findAll(this.context)
        .filter(({ school_id }) => school_id === this.id)
        .sort((a, b) => getDateValueDifference(a.date, b.date))
    }

    return []
  }

  /**
   * Whether no sessions planned to run at this school
   *
   * @returns {boolean} `true` if there are no planned session
   */
  get hasUnplannedProgrammes() {
    return this.unplannedProgrammes.length > 0
  }

  /**
   * Get programmes with no planned session at this school
   *
   * @returns {Array<Programme>} Unplanned programmes
   */
  get unplannedProgrammes() {
    const plannedProgrammeIds = new Set(
      this.sessions.flatMap((session) => session.programme_ids)
    )

    return Programme.findAll(this.context).filter(
      ({ id, isHidden }) => !isHidden && !plannedProgrammeIds.has(id)
    )
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
            case 'unplannedProgrammes':
              return !this.isHomeOrUnknown
                ? this.unplannedProgrammes
                    .flatMap(({ nameTag }) => nameTag)
                    .join(' ')
                : ''
            case 'patients':
              return localise('school.patients.count', {
                count: this.patients.length
              })
            case 'site':
              return formatCode(this.site)
            case 'status':
              return (
                this.status && formatTag(getSchoolStatusProperties(this.status))
              )
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
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/schools/${this.id}`
  }
}

/**
 * @import { SchoolPhase } from '../enums.js'
 * @import { LocationOptions } from './location.js'
 */
