import { isAfter, isBefore } from 'date-fns'
import _ from 'lodash'

import programmesData from '../datasets/programmes.js'
import schoolsData from '../datasets/schools.js'
import {
  ConsentWindow,
  PsdUsage,
  SessionPresetName,
  SessionStatus,
  SessionType,
  VaccineMethod
} from '../enums.js'

import { today } from './date.js'
import i18n from './i18n.js'

/**
 * Get consent window (is it open, opening or closed)
 *
 * @param {Session} session - Session
 * @returns {string} Consent window key and value
 */
export const getConsentWindow = (session) => {
  const nowAt = today()

  // There are no consent windows for clinic sessions and home visits
  if ([SessionType.Clinic, SessionType.Home].includes(session.type)) {
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

  const school = schoolsData.find((school) => school.id === school_id)

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
 * Get the wording for a PSD usage setting, to suit a session’s programmes
 *
 * The settings are stored the same way for every session, but how they’re worded
 * depends on which programmes the session can vaccinate for. For example, there’s
 * no need to mention ‘all programmes’ if there’s only one
 *
 * @param {Session} session - Session
 * @param {PsdUsage} psdUsage - PSD usage
 * @returns {{text: string, hint: string}} Text and hint
 */
export const getPsdUsageText = (session, psdUsage) => {
  const { __ } = i18n
  const programmes = session.programmesThatCanBeAdministered
  const onlyProgramme = programmes.length === 1 ? programmes[0] : null
  const isFluOnly = onlyProgramme?.id === 'flu'

  switch (psdUsage) {
    case PsdUsage.None:
      return {
        text: __('session.protocolPSD.none.label'),
        hint: __('session.protocolPSD.none.hint')
      }

    case PsdUsage.NasalFluOnly:
      return {
        text: isFluOnly
          ? __('session.protocolPSD.nasalFlu.label.fluOnly')
          : __('session.protocolPSD.nasalFlu.label.fluPlus'),
        hint: __('session.protocolPSD.nasalFlu.hint')
      }

    case PsdUsage.All: {
      if (onlyProgramme) {
        return {
          text: isFluOnly
            ? __('session.protocolPSD.allForOneProgramme.label.fluOnly')
            : __('session.protocolPSD.allForOneProgramme.label.other'),
          hint: __('session.protocolPSD.allForOneProgramme.hint', {
            programme: onlyProgramme
          })
        }
      }

      const hasNasalSprayVaccine = programmes.some(({ vaccines }) =>
        vaccines.some(({ method }) => method === VaccineMethod.Intranasal)
      )

      return {
        text: hasNasalSprayVaccine
          ? __('session.protocolPSD.all.label.withNasalSpray')
          : __('session.protocolPSD.all.label.noNasalSpray'),
        hint: __('session.protocolPSD.all.hint')
      }
    }

    default:
      return { text: psdUsage || '', hint: '' }
  }
}

/**
 * @import { SessionPreset } from '../enums.js'
 * @import { Session } from '../models.js'
 */
