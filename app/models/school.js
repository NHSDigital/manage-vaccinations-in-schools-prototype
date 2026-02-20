import { default as filters } from '@x-govuk/govuk-prototype-filters'
import _ from 'lodash'

import { Location, Patient, Session } from '../models.js'
import { formatDate, getDateValueDifference } from '../utils/date.js'
import { tokenize } from '../utils/object.js'
import {
  formatLink,
  formatMonospace,
  formatYearGroups,
  stringToBoolean
} from '../utils/string.js'

/**
 * @class School
 * @augments Location
 * @param {object} options - Options
 * @param {object} [context] - Context
 * @property {string} [urn] - URN
 * @property {boolean} [sen] - SEN school
 * @property {string} [site] - Site code
 * @property {import('../enums.js').SchoolPhase} [phase] - Phase
 * @property {Array<number>} [yearGroups] - Year groups
 */
export class School extends Location {
  constructor(options, context) {
    super(options, context)

    this.urn = options?.urn && String(options.urn)
    this.sen = stringToBoolean(options?.sen) || false
    this.site = options?.site
    this.phase = options?.phase
    this.yearGroups = options?.yearGroups || []
    this.homeOrUnknown = ['888888', '999999'].includes(this.urn)

    if (this.homeOrUnknown) {
      this.name = 'No known school (including home-schooled children)'
    }
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
      // Combine children with no known school with home-schooled children)
      if (this.homeOrUnknown) {
        return Object.values(this.context?.patients)
          .filter(({ school_id }) => ['888888', '999999'].includes(school_id))
          .map((patient) => new Patient(patient, this.context))
      }

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
   * Get school pupils to invite to a (clinic) session
   *
   * @param {string} programmeId - Programme ID
   * @returns {Array<Patient>} Patient records
   */
  patientsToInviteToSession(programmeId) {
    return this.patients.filter(
      (patient) => patient.programmes[programmeId].inviteToSession
    )
  }

  /**
   * Get sessions run at this school
   *
   * @returns {Array<Session>} Sessions
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
      return this.sessions.at(-1).date
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
    return {
      ...super.formatted,
      nextSessionDate: formatDate(this.nextSessionDate, { dateStyle: 'full' }),
      patients: filters.plural(this.patients.length, 'child'),
      yearGroups: formatYearGroups(this.yearGroups),
      id: formatMonospace(this.id),
      site: formatMonospace(this.site),
      urn: formatMonospace(this.urn)
    }
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
