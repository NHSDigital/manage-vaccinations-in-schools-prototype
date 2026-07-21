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
 * @param {Session} session - Session
 * @returns {string} Consent window key and value
 */
export const getConsentWindow = (session) => {
  const nowAt = today()

  // There are no consent windows for clinic sessions
  if (session.clinic_id) {
    return ConsentWindow.None
  }

  switch (true) {
    // Opening (open date is after today)
    case isAfter(session.consentOpenAt, nowAt):
      return ConsentWindow.Opening
    // Open (open date is before today, and close date after today)
    case isBefore(session.consentOpenAt, nowAt) &&
      isAfter(session.consentCloseAt, nowAt):
      return ConsentWindow.Open
    // Closed (close date is before today)
    case isBefore(session.consentCloseAt, nowAt):
      return ConsentWindow.Closed
    default:
      return ConsentWindow.None
  }
}

/**
 * Get consent URL
 *
 * @param {Array<Session>} sessions - Sessions
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
 * @param {Session} session - Session
 * @param {Array<object>} filters - Filters
 * @returns {number} Number
 */
export const getSessionActivityCount = (session, filters) => {
  let patientSessions = session.patientSessions

  for (const filter of filters) {
    for (const [key, value] of Object.entries(filter)) {
      if (value) {
        patientSessions = patientSessions.filter(
          ({ patientProgramme }) => _.get(patientProgramme, key) === value
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
 * @param {Array<SessionPreset>} sessionPresets - Session presets
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

/**
 * Remove a list of slots from a wider list of all possible slots
 *
 * @param {Array<Date>} allSlots - Full set of time slots
 * @param {Array<Date>} slotsToRemove - Slots to remove from allSlots
 * @returns {Array<Date>} Array of remaining slots
 */
export function removeSlots(allSlots, slotsToRemove) {
  const slotRemovalCounts = new Map()

  // Work out how many of each time we need to remove
  for (const date of slotsToRemove) {
    slotRemovalCounts.set(
      date.getTime(),
      (slotRemovalCounts.get(date.getTime()) || 0) + 1
    )
  }

  // Get rid of the according number of slots for each time
  return allSlots.filter((date) => {
    const countToRemove = slotRemovalCounts.get(date.getTime()) || 0

    if (countToRemove === 0) {
      // No need to remove this time slot
      return true
    }

    // Scratch one off from the number to remove at this timepoint...
    slotRemovalCounts.set(date.getTime(), countToRemove - 1)

    // ...and filter this one out of the original array
    return false
  })
}

/**
 * @import { SessionPreset } from '../enums.js'
 * @import { Session } from '../models.js'
 */
