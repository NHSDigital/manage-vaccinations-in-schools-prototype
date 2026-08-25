import process from 'node:process'

import {
  getDayOfYear,
  isAfter,
  isBefore,
  isEqual,
  previousMonday,
  nextMonday
} from 'date-fns'

import { AcademicYear, SchoolTerm } from '../enums.js'

const ALLOWED_VALUES_FOR_MONTHS = [
  ['1', '01', 'jan', 'january'],
  ['2', '02', 'feb', 'february'],
  ['3', '03', 'mar', 'march'],
  ['4', '04', 'apr', 'april'],
  ['5', '05', 'may'],
  ['6', '06', 'jun', 'june'],
  ['7', '07', 'jul', 'july'],
  ['8', '08', 'aug', 'august'],
  ['9', '09', 'sep', 'september'],
  ['10', 'oct', 'october'],
  ['11', 'nov', 'november'],
  ['12', 'dec', 'december']
]

/**
 * Normalise month input as words to it’s number from 1 to 12
 *
 * @param {string} input - Month in words or as a number with or without a leading 0
 * @returns {string|undefined} Number of the month without a leading 0 or undefined
 */
function parseMonth(input) {
  if (input == null) return

  const trimmedLowerCaseInput = input.trim().toLowerCase()
  return ALLOWED_VALUES_FOR_MONTHS.find((month) =>
    month.find((allowedValue) => allowedValue === trimmedLowerCaseInput)
  )?.[0]
}

/**
 * Convert `govukDateInput` values into an ISO 8601 date.
 *
 * @param {object} object - Object containing date values
 * @param {string} [namePrefix] - `namePrefix` used for date values
 * @returns {Date|undefined} ISO 8601 date string
 */
export function convertObjectToIsoDate(object, namePrefix) {
  let day, month, year, hour, minute

  if (namePrefix) {
    day = Number(object[`${namePrefix}-day`])
    month = Number(parseMonth(object[`${namePrefix}-month`])) - 1
    year = Number(object[`${namePrefix}-year`])
    hour = Number(object[`${namePrefix}-hour`]) || 12
    minute = Number(object[`${namePrefix}-minute`]) || 0
  } else {
    day = Number(object?.day)
    month = Number(parseMonth(object?.month)) - 1
    year = Number(object?.year)
    hour = Number(object?.hour) || 12
    minute = Number(object?.minute) || 0
  }

  try {
    if (!day) {
      return new Date(year, month)
    }

    return new Date(year, month, day, hour, minute, 0, 0)
  } catch (error) {
    console.error(error.message.split(':')[0])
  }
}

/**
 * Convert ISO 8601 date to`items` object
 *
 * @param {Date|string} date - ISO 8601 date
 * @returns {object|string} `items` for dateInput component
 */
export function convertIsoDateToObject(date) {
  if (typeof date === 'string') return ''

  if (!date || isNaN(date.valueOf())) return ''

  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1),
    day: String(date.getDate()),
    hour: String(date.getHours()),
    minute: String(date.getMinutes()).padStart(2, '0'),
    seconds: String(date.getSeconds()).padStart(2, '0')
  }
}

/**
 * Add days to a date
 *
 * @param {Date|string} date - Date
 * @param {number} days - Number of days to add
 * @returns {Date} Date with days added
 */
export function addDays(date, days) {
  date = new Date(date.valueOf())
  date.setDate(date.getDate() + days)

  return date
}

/**
 * Remove days from a date
 *
 * @param {Date|string} date - Date
 * @param {number} days - Number of days to remove
 * @returns {Date} Date with days removed
 */
export function removeDays(date, days) {
  date = new Date(date.valueOf())
  date.setDate(date.getDate() - days)

  return date
}

/**
 * Check if date lies between two other dates
 *
 * @param {Date|string} isoDate - ISO 8601 date to check
 * @param {Date|string} isoStartDate - ISO 8601 start date
 * @param {Date|string} isoEndDate - ISO 8601 end date
 * @returns {boolean} Date with days added
 */
export function isBetweenDates(isoDate, isoStartDate, isoEndDate) {
  return (
    (isAfter(isoDate, isoStartDate) || isEqual(isoDate, isoStartDate)) &&
    (isBefore(isoDate, isoEndDate) || isEqual(isoDate, isoEndDate))
  )
}

/**
 * Format a data
 *
 * @param {Date} date - Date string
 * @param {object} [options] - DateTimeFormat options
 * @returns {string|undefined} Formatted date
 */
export function formatDate(date, options) {
  if (!date || isNaN(date.valueOf())) return

  return new Intl.DateTimeFormat('en-GB', options).format(date)
}

/**
 * Get age from date
 *
 * @param {Date} date - Date
 * @returns {number} Age
 */
export function getAge(date) {
  if (!date || isNaN(date.valueOf())) return 0

  return Math.floor((today().valueOf() - date.getTime()) / 3.15576e10)
}

/**
 * Get difference between two date values
 *
 * @param {Date} a - First date
 * @param {Date} b - Second date
 * @returns {number} School year group
 */
export function getDateValueDifference(a, b) {
  return new Date(a).valueOf() - new Date(b).valueOf()
}

/**
 * Get the academic year a date sits within
 *
 * @param {Date} date - Date
 * @returns {number} Academic year a date sits within
 */
export function getAcademicYear(date) {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const startYear = month >= 9 ? year : year - 1

  return startYear
}

/**
 * Get the current academic year for today’s date
 *
 * @returns {number} Academic year a date sits within
 */
export function getCurrentAcademicYear() {
  return getAcademicYear(today())
}

/**
 * Get the latest academic year available, including next academic year
 * if the 1 August preparation period has started
 *
 * @returns {number} Latest available academic year
 */
export function getLatestAcademicYear() {
  const date = today()
  const currentAcademicYear = getAcademicYear(date)
  const isPreparationPeriod = date.getMonth() + 1 === 8

  return isPreparationPeriod ? currentAcademicYear + 1 : currentAcademicYear
}

/**
 * Get all academic years available, including the next academic year
 * if the 1 August preparation period has started
 *
 * @returns {number[]} Latest available academic year
 */
export function getAllAcademicYears() {
  const latestAcademicYear = getLatestAcademicYear()

  return Object.keys(AcademicYear)
    .map(Number)
    .filter((year) => year <= latestAcademicYear)
}

/**
 * Calculate Easter Sunday for a given year (Gregorian calendar, 1583+)
 *
 * @param {number} year - Year
 * @returns {Date} Easter Sunday
 */
export function getEasterSunday(year) {
  // Century number and year within that century
  const century = ~~(year / 100)
  const yearInCentury = year % 100

  // Year quarter and remainder for leap year calculations
  const yearQuarter = ~~(yearInCentury / 4)
  const yearRemainder = yearInCentury % 4

  // Leap day adjustment for the Gregorian calendar
  const leapDayCorrection = ~~(century / 4)

  // Gregorian calendar’s Easter calculation adjustment
  const easterCorrection = ~~((century - ~~((century + 8) / 25) + 1) / 3)

  // Lunar orbit correction
  const lunarCorrection = century % 4

  // Position in the 19-year Metonic lunar cycle
  const lunarCycle = year % 19

  // Epact: age of the moon on 1 January (in days)
  const epact =
    (19 * lunarCycle + century - leapDayCorrection - easterCorrection + 15) % 30

  // Calculate days until the next Sunday
  const daysToSunday =
    (32 + 2 * lunarCorrection + 2 * yearQuarter - epact - yearRemainder) % 7

  // Final lunar phase offset adjustment
  const lunarAdjustment = ~~(
    (lunarCycle + 11 * epact + 22 * daysToSunday) /
    451
  )

  // Combined day offset to calculate the final Easter date
  const dayOffset = epact + daysToSunday - 7 * lunarAdjustment + 114

  // Convert offset to month (0-indexed) and day
  return new Date(year, ~~(dayOffset / 31) - 1, (dayOffset % 31) + 1)
}

/**
 *
 * @param {number} year - Year academic year commences
 * @param {SchoolTerm} term - School term
 * @returns {object} Term start and end dates
 */
export function getTermDates(year, term) {
  const nextYear = year + 1

  switch (term) {
    case SchoolTerm.Autumn: {
      // First Monday of September (or Sept 1st if it’s a Monday)
      const sep1st = new Date(year, 8, 1)
      const autumnStart = sep1st.getDay() === 1 ? sep1st : nextMonday(sep1st)

      // Friday closest to December 20th
      const dec20th = new Date(year, 11, 20)
      const autumnEnd =
        dec20th.getDay() === 5 ? dec20th : previousMonday(addDays(dec20th, 5)) // Get to the Friday before/after

      return {
        from: autumnStart.toISOString().split('T')[0],
        to: autumnEnd.toISOString().split('T')[0]
      }
    }

    case SchoolTerm.Spring: {
      // First Monday of January (or Jan 1st if it’s a Monday)
      const jan1st = new Date(nextYear, 0, 1)
      const springStart = jan1st.getDay() === 1 ? jan1st : nextMonday(jan1st)

      // Friday 2 weeks before Easter (Good Friday is the Friday before Easter)
      const easterSunday = getEasterSunday(nextYear)
      const goodFriday = addDays(easterSunday, -2)
      const springEnd = addDays(goodFriday, -14) // 2 weeks before Good Friday

      return {
        from: springStart.toISOString().split('T')[0],
        to: springEnd.toISOString().split('T')[0]
      }
    }

    case SchoolTerm.Summer: {
      // Monday 2 weeks after Easter Monday
      const easterSunday = getEasterSunday(nextYear)
      const easterMonday = addDays(easterSunday, 1)
      const summerStart = addDays(easterMonday, 14) // 2 weeks after Easter Monday

      // Friday closest to July 20th
      const jul20th = new Date(nextYear, 6, 20)
      const summerEnd =
        jul20th.getDay() === 5 ? jul20th : previousMonday(addDays(jul20th, 5))

      return {
        from: summerStart.toISOString().split('T')[0],
        to: summerEnd.toISOString().split('T')[0]
      }
    }

    default:
      return null
  }
}

/**
 * Set time to midday
 *
 * @param {Date} date - Date
 * @returns {Date} Date with time set to midday
 */
export function setMidday(date) {
  date.setHours(12, 0, 0, 0)
  return date
}

/**
 * @param {Array<Date>} dates - Dates
 * @param {Date} date - Date
 * @returns {boolean} Dates includes date
 */
export function includesDate(dates, date) {
  return (
    dates.filter((item) => isEqual(getDayOfYear(item), getDayOfYear(date)))
      .length > 0
  )
}

/**
 * Get’s today’s date, as set by environment
 *
 * @param {number} [secondsToAdd] - Seconds to add
 * @returns {Date} ‘Today’s’ date
 */
export function today(secondsToAdd) {
  const now = new Date()

  if (process.env.TODAY) {
    const date = new Date(process.env.TODAY)
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()

    now.setFullYear(year)
    now.setMonth(month)
    now.setDate(day)
  }

  if (secondsToAdd) {
    now.setSeconds(now.getSeconds() + secondsToAdd)
  }

  return now
}

/**
 * Get school year group
 *
 * @param {Date} date - Date
 * @param {number} [academicYear] - Academic year
 * @returns {number} School year group
 */
export function getYearGroup(date, academicYear) {
  if (!date || isNaN(date.valueOf())) return 0

  // Determine which academic year to use
  const targetYear = academicYear || getCurrentAcademicYear()

  const birthYear = date.getFullYear()
  const birthMonth = date.getMonth()
  const birthDay = date.getDate()

  // Calculate the age of the child on September 1 of the current year
  let ageOnStartOfYear = targetYear - birthYear

  if (birthMonth > 8 || (birthMonth === 8 && birthDay > 1)) {
    // If the birthday is after September 1, subtract 1 from the age
    ageOnStartOfYear -= 1
  }

  // Determine the year group
  return ageOnStartOfYear - 4
}

/**
 * Strip the seconds and milliseconds from the given time
 *
 * @param {Date} time - Time slot time to standardise
 * @returns {Date} Result stripping seconds and milliseconds
 */
function getPreciseSlotTime(time) {
  const preciseTime = new Date(time)
  preciseTime.setSeconds(0, 0)
  return preciseTime
}

/**
 * @param {Array<Date>} availableSlots - Times of all booked appointments in a session or period
 * @param {Array<Date>} bookedSlots - Times of all slots in the session or period
 * @param {number} slotLength - Length of a slot in minutes
 * @returns {Array<Date>} Array of the booked slot times that can be extended
 */
export function getExtendableAppointmentTimes(
  availableSlots,
  bookedSlots,
  slotLength
) {
  const appointmentLengthInMilliseconds = slotLength * 60 * 1000

  const preciseAvailableSlots = new Set(
    availableSlots.map((slot) => getPreciseSlotTime(slot).getTime())
  )

  return bookedSlots.filter((slot) => {
    const currentSlotTime = getPreciseSlotTime(slot).getTime()
    const nextSlotTime = currentSlotTime + appointmentLengthInMilliseconds

    return preciseAvailableSlots.has(nextSlotTime)
  })
}
