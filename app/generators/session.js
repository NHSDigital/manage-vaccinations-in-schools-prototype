import { fakerEN_GB as faker } from '@faker-js/faker'

import { SessionPresetName, SessionType, TeamDefaults } from '../enums.js'
import { Session } from '../models.js'
import {
  addDays,
  getCurrentAcademicYear,
  getTermDates,
  removeDays,
  setMidday
} from '../utils/date.js'
import { getSessionYearGroups } from '../utils/session.js'

/**
 * Generate fake session
 *
 * @param {SessionPreset} preset - Session preset
 * @param {User} user - User
 * @param {object} options - Options
 * @param {string} [options.clinic_id] - Clinic ID
 * @param {string} [options.school_id] - School URN
 * @returns {Session|undefined} Session
 */
export function generateSession(preset, user, options) {
  // Don’t generate sessions for inactive session preset
  if (!preset.active) {
    return
  }

  const { clinic_id, school_id } = options

  // Generate some school sessions for flu in the previous academic year
  let academicYear = getCurrentAcademicYear()
  const isPreviousAcademicYear = faker.datatype.boolean(0.5)
  if (
    school_id &&
    isPreviousAcademicYear &&
    preset.name === SessionPresetName.Flu
  ) {
    academicYear = academicYear - 1
  }

  const term = getTermDates(academicYear, preset.term)

  let date = faker.date.between({
    from: term.from,
    to: term.to
  })

  let consentOpenAt
  if (date) {
    // Clinic sessions happen after the school term has finished
    if (clinic_id) {
      date = faker.date.between({
        from: term.to,
        to: addDays(term.to, 30)
      })
    }

    date = setMidday(date)

    if (school_id) {
      // Don’t create school sessions during weekends
      if ([0, 6].includes(date.getDay())) {
        date = removeDays(date, 2)
      }
    }

    consentOpenAt = removeDays(date, TeamDefaults.SessionOpenWeeks * 7)
  }

  const canVaccinateForOtherProgrammes = preset.name !== SessionPresetName.Flu
  let slotLength, useTwoSlotsForInjectedFlu, vaccinationCountForLongAppointment
  if (clinic_id) {
    if (preset.name === SessionPresetName.Flu) {
      // For flu, make it likely that injections will be double the nasal spray length
      slotLength = faker.datatype.boolean(0.75) ? 5 : 3
      useTwoSlotsForInjectedFlu = faker.datatype.boolean(0.9)
    } else {
      slotLength = faker.datatype.boolean(0.75) ? 10 : 8
      if (preset.name === SessionPresetName.Doubles) {
        // For doubles, make it unlikely that appointments will be doubled for both vaccinations
        vaccinationCountForLongAppointment = faker.datatype.boolean(0.95)
          ? 0
          : 2
      } else if (preset.name === SessionPresetName.SummerCatchup) {
        // For clinics with lots of programmes, make it possible that we'll double the length for 3+ vaccinations
        vaccinationCountForLongAppointment = faker.datatype.boolean(0.75)
          ? 2
          : 3
      } else {
        // For all other non-flu clinics, make it likely we'll double the length for 2+ vaccinations
        vaccinationCountForLongAppointment = faker.datatype.boolean(0.9) ? 2 : 0
      }
    }
  }

  let yearGroups
  if (options.school_id) {
    yearGroups = getSessionYearGroups(options.school_id, [preset])
  }

  return new Session({
    createdAt: removeDays(term.from, 60),
    createdBy_uid: user.uid,
    date,
    consentOpenAt,
    hasRegistration: true,
    academicYear,
    presetNames: [preset.name],
    ...(clinic_id && {
      type: SessionType.Clinic,
      canVaccinateForOtherProgrammes,
      clinic_id,
      slotLength,
      useTwoSlotsForInjectedFlu,
      vaccinationCountForLongAppointment
    }),
    ...(school_id && { type: SessionType.School, school_id, yearGroups })
  })
}

/**
 * @import { SessionPreset } from '../enums.js'
 * @import { User } from '../models.js'
 */
