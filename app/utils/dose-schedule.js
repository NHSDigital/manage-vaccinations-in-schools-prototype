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
  LessThan28DaysAfterPrevious: 'Given less than 28 days after previous dose',
  ExtraDose: 'Additional dose'
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
 *   recordedDoses: Array<{ vaccination: object, kind: 'valid'|'ignored', sequence?: number, reason?: string }>,
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
    const validDoses = givenDoses.map((vaccination, i) => ({
      vaccination,
      sequence: i + 1
    }))
    return {
      validDoses,
      ignoredDoses: [],
      recordedDoses: validDoses.map((d) => ({ ...d, kind: 'valid' })),
      nextEligibleFrom: null
    }
  }

  const validDoses = []
  const ignoredDoses = []
  const recordedDoses = []
  let lastValidCreatedAt = null

  for (const vaccination of givenDoses) {
    const nextSequence = validDoses.length + 1
    const atScheduleMax = nextSequence > MMR_MAX_SEQUENCE
    const createdAt = new Date(vaccination.createdAt)

    if (!atScheduleMax) {
      const minAgeDate = addMonths(dob, MMR_MIN_AGE_MONTHS[nextSequence])

      if (isBefore(createdAt, minAgeDate)) {
        const reason =
          nextSequence === 1
            ? REASON.BeforeAge12Months
            : REASON.BeforeAge15Months
        ignoredDoses.push({ vaccination, reason })
        recordedDoses.push({ vaccination, kind: 'ignored', reason })
        continue
      }
    }

    if (lastValidCreatedAt) {
      const gap = differenceInCalendarDays(createdAt, lastValidCreatedAt)
      if (gap < MMR_MIN_INTERVAL_DAYS) {
        const reason = REASON.LessThan28DaysAfterPrevious
        ignoredDoses.push({ vaccination, reason })
        recordedDoses.push({ vaccination, kind: 'ignored', reason })
        continue
      }
    }

    if (atScheduleMax) {
      const reason = REASON.ExtraDose
      ignoredDoses.push({ vaccination, reason })
      recordedDoses.push({ vaccination, kind: 'ignored', reason })
      continue
    }

    validDoses.push({ vaccination, sequence: nextSequence })
    recordedDoses.push({ vaccination, kind: 'valid', sequence: nextSequence })
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

  return { validDoses, ignoredDoses, recordedDoses, nextEligibleFrom }
}
