import {
  addDays,
  addMonths,
  differenceInCalendarDays,
  isBefore,
  max as maxDate
} from 'date-fns'

const MMR_MIN_AGE_MONTHS = [null, 12, 15]
const MMR_MIN_INTERVAL_DAYS = 28
const MMR_MAX_SEQUENCE = 2

const REASON = {
  BeforeAge12Months: 'Given before age 12 months',
  BeforeAge15Months: 'Given before age 15 months',
  LessThan28DaysAfterPrevious: 'Given less than 28 days after previous dose'
}

/**
 * Classify a patient's given vaccinations for a programme into valid (counted
 * toward the schedule) and ignored (excluded by a rule), and compute the date
 * from which the next empty slot is eligible.
 *
 * Pure function — no side effects. Phase 1 only implements MMR rules
 * (dose 1 at ≥ 12 months; dose 2 at ≥ 15 months and ≥ 28 days after dose 1).
 * Other programmes fall through: all given doses treated as valid.
 *
 * @param {object} params
 * @param {Array<object>} params.vaccinationsGiven - Vaccinations where given === true
 * @param {Date} params.dob - Patient date of birth
 * @param {object} params.programme - Programme (uses programme.id)
 * @returns {{
 *   validDoses: Array<{ vaccination: object, sequence: number }>,
 *   ignoredDoses: Array<{ vaccination: object, reason: string }>,
 *   nextEligibleFrom: Date|null
 * }}
 */
export function getScheduleSummary({
  vaccinationsGiven = [],
  dob,
  programme
}) {
  const givenDoses = [...vaccinationsGiven].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  )

  if (programme?.id !== 'mmr') {
    return {
      validDoses: givenDoses.map((vaccination, i) => ({
        vaccination,
        sequence: i + 1
      })),
      ignoredDoses: [],
      nextEligibleFrom: null
    }
  }

  const validDoses = []
  const ignoredDoses = []
  let lastValidCreatedAt = null

  for (const vaccination of givenDoses) {
    const nextSequence = validDoses.length + 1
    if (nextSequence > MMR_MAX_SEQUENCE) break

    const createdAt = new Date(vaccination.createdAt)
    const minAgeDate = addMonths(dob, MMR_MIN_AGE_MONTHS[nextSequence])

    if (isBefore(createdAt, minAgeDate)) {
      ignoredDoses.push({
        vaccination,
        reason:
          nextSequence === 1
            ? REASON.BeforeAge12Months
            : REASON.BeforeAge15Months
      })
      continue
    }

    if (lastValidCreatedAt) {
      const gap = differenceInCalendarDays(createdAt, lastValidCreatedAt)
      if (gap < MMR_MIN_INTERVAL_DAYS) {
        ignoredDoses.push({
          vaccination,
          reason: REASON.LessThan28DaysAfterPrevious
        })
        continue
      }
    }

    validDoses.push({ vaccination, sequence: nextSequence })
    lastValidCreatedAt = createdAt
  }

  let nextEligibleFrom = null
  const nextSlot = validDoses.length + 1
  if (nextSlot <= MMR_MAX_SEQUENCE) {
    const minAgeDate = addMonths(dob, MMR_MIN_AGE_MONTHS[nextSlot])
    nextEligibleFrom = lastValidCreatedAt
      ? maxDate([minAgeDate, addDays(lastValidCreatedAt, MMR_MIN_INTERVAL_DAYS)])
      : minAgeDate
  }

  return { validDoses, ignoredDoses, nextEligibleFrom }
}
