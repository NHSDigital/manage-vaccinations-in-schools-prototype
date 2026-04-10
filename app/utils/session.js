import { isAfter, isBefore } from 'date-fns'
import _ from 'lodash'

import programmesData from '../datasets/programmes.js'
import schoolsData from '../datasets/schools.js'
import {
  ConsentWindow,
  SessionPresetName,
  SessionStatus,
  SessionType
} from '../enums.js'

import { today } from './date.js'

/**
 * Get consent window (is it open, opening or closed)
 *
 * @param {import('../models.js').Session} session - Session
 * @returns {object} Consent window key and value
 */
export const getConsentWindow = (session) => {
  const nowAt = today()

  switch (true) {
    // Opening (open date is after today)
    case isAfter(session.openAt, nowAt):
      return ConsentWindow.Opening
    // Open (open date is before today, and close date after today)
    case isBefore(session.openAt, nowAt) && isAfter(session.closeAt, nowAt):
      return ConsentWindow.Open
    // Closed (close date is before today)
    case isBefore(session.closeAt, nowAt):
      return ConsentWindow.Closed
    default:
      return ConsentWindow.None
  }
}

/**
 * Get consent URL
 *
 * @param {import('../models.js').Session[]} sessions - Sessions
 * @param {string} [presetName] - Session preset name
 * @param {boolean} [isSchool] - Get school session
 * @returns {object|undefined} Consent window key and value
 */
export const getSessionConsentUrl = (
  sessions,
  presetName = SessionPresetName.Flu,
  isSchool = true
) => {
  const sessionType = isSchool ? SessionType.School : SessionType.Clinic

  const session = Object.values(sessions)
    .filter((session) => session?.presetNames.includes(presetName))
    .filter((session) => session.type === sessionType)
    .find((session) => session.status !== SessionStatus.Unplanned)

  if (session) {
    return session.consentUrl
  }
}

/**
 * Filter array where key has a value
 *
 * @param {import('../models.js').Session} session - Session
 * @param {Array} filters - Filters
 * @returns {number} Number
 */
export const getSessionActivityCount = (session, filters) => {
  let patientSessions = session.patientSessions

  for (const filter of filters) {
    for (const [key, value] of Object.entries(filter)) {
      if (value) {
        patientSessions = patientSessions.filter(
          (patientSession) => _.get(patientSession, key) === value
        )
      }
    }
  }

  if (patientSessions) {
    const uniquePatientSessions = _.uniqBy(patientSessions, 'patient.nhsn')
    return uniquePatientSessions.length
  }

  return 0
}

/**
 * Get year groups based on intersection of school phase and programme
 *
 * @param {string} school_id - School ID
 * @param {Array<import('../enums.js').SessionPreset>} sessionPresets - Session presets
 * @returns {Array<number>} Year groups
 */
export const getSessionYearGroups = (school_id, sessionPresets) => {
  const programmeYearGroups = new Set()

  for (const preset of sessionPresets) {
    for (const programmeType of preset.programmeTypes) {
      const programme = programmesData[programmeType]
      for (const yearGroup of programme.yearGroups) {
        programmeYearGroups.add(yearGroup)
      }
    }
  }

  const school = schoolsData[school_id]

  return school.yearGroups.filter((yearGroup) =>
    [...programmeYearGroups].includes(yearGroup)
  )
}
