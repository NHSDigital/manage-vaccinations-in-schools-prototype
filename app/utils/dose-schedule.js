import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  isBefore,
  max
} from 'date-fns'

const MMR_MIN_AGE_MONTHS = [null, 12, 15]
const MMR_MIN_INTERVAL_DAYS = 28
const MMR_MAX_SEQUENCE = 2

/**
 * @readonly
 * @enum {string}
 */
export const IgnoredDoseReason = {
  BeforeAge12Months: 'Given before age 12 months',
  BeforeAge15Months: 'Given before age 15 months',
  LessThan28DaysAfterPrevious: 'Given less than 28 days after previous dose',
  ExtraDose: 'Additional dose'
}

/**
 * Classify MMR doses into valid (counted toward the schedule) and ignored
 * (excluded by a rule), and get the date the next dose can be given from
 *
 * Rules depend only on age at each dose and the interval between doses:
 * dose 1 at 12 months or older; dose 2 at 15 months or older and at least
 * 28 days after dose 1. Doses after both are filled are ignored.
 *
 * @param {object} options - Options
 * @param {Array<import('../models.js').Vaccination>} options.vaccinations - Vaccinations with a Vaccinated outcome
 * @param {Date} options.dob - Patient date of birth
 * @returns {{
 *   validDoses: Array<{ vaccination: object, sequence: number }>,
 *   ignoredDoses: Array<{ vaccination: object, reason: IgnoredDoseReason }>,
 *   recordedDoses: Array<{ vaccination: object, isValid: boolean, sequence?: number, reason?: IgnoredDoseReason }>,
 *   nextEligibleFrom: Date|undefined
 * }} Schedule summary
 */
export function getScheduleSummary({ vaccinations = [], dob }) {
  const doses = [...vaccinations].sort(
    (a, b) => new Date(a.administeredAt) - new Date(b.administeredAt)
  )

  const validDoses = []
  const ignoredDoses = []
  const recordedDoses = []
  let lastValidAt

  const ignore = (vaccination, reason) => {
    ignoredDoses.push({ vaccination, reason })
    recordedDoses.push({ vaccination, isValid: false, reason })
  }

  for (const vaccination of doses) {
    const sequence = validDoses.length + 1
    const administeredAt = new Date(vaccination.administeredAt)

    if (
      lastValidAt &&
      differenceInCalendarDays(administeredAt, lastValidAt) <
        MMR_MIN_INTERVAL_DAYS
    ) {
      ignore(vaccination, IgnoredDoseReason.LessThan28DaysAfterPrevious)
      continue
    }

    if (sequence > MMR_MAX_SEQUENCE) {
      ignore(vaccination, IgnoredDoseReason.ExtraDose)
      continue
    }

    if (
      isBefore(administeredAt, addMonths(dob, MMR_MIN_AGE_MONTHS[sequence]))
    ) {
      ignore(
        vaccination,
        sequence === 1
          ? IgnoredDoseReason.BeforeAge12Months
          : IgnoredDoseReason.BeforeAge15Months
      )
      continue
    }

    validDoses.push({ vaccination, sequence })
    recordedDoses.push({ vaccination, isValid: true, sequence })
    lastValidAt = administeredAt
  }

  let nextEligibleFrom
  const nextSequence = validDoses.length + 1
  if (nextSequence <= MMR_MAX_SEQUENCE) {
    const minAgeDate = addMonths(dob, MMR_MIN_AGE_MONTHS[nextSequence])
    nextEligibleFrom = lastValidAt
      ? max([minAgeDate, addDays(lastValidAt, MMR_MIN_INTERVAL_DAYS)])
      : minAgeDate
  }

  return { validDoses, ignoredDoses, recordedDoses, nextEligibleFrom }
}
