import { fakerEN_GB as faker } from '@faker-js/faker'
import { subYears } from 'date-fns'

import { SessionPresets, TeamDefaults } from '../../app/enums.js'
import { generateChild } from '../../app/generators/child.js'
import { generateConsent } from '../../app/generators/consent.js'
import { generateContact } from '../../app/generators/contact.js'
import { generatePatient } from '../../app/generators/patient.js'
import { generateSession } from '../../app/generators/session.js'
import {
  Consent,
  Contact,
  Patient,
  PatientSession,
  Session
} from '../../app/models.js'
import {
  addDays,
  getCurrentAcademicYear,
  getTermDates,
  removeDays,
  setMidday,
  today
} from '../../app/utils/date.js'

/**
 * Split a total into whole numbers that follow the given shares as closely as
 * possible, so 6% of 300 children is exactly 18 and the counts always add up
 *
 * @param {number} total - Total to split
 * @param {Array<number>} shares - Relative size of each part (they don’t need to add up to 100)
 * @returns {Array<number>} Whole number for each part
 */
function splitIntoCounts(total, shares) {
  const sumOfShares = shares.reduce((sum, share) => sum + share, 0)
  const exactCounts = shares.map((share) => (total * share) / sumOfShares)
  const counts = exactCounts.map(Math.floor)

  // Give any left over to the parts that lost the most by rounding down
  const leftOver = total - counts.reduce((sum, count) => sum + count, 0)
  exactCounts
    .map((exactCount, index) => ({ index, lost: exactCount - counts[index] }))
    .sort((a, b) => b.lost - a.lost)
    .slice(0, leftOver)
    .forEach(({ index }) => counts[index]++)

  return counts
}

/**
 * Share out a total number of children across options by their `share`, in a
 * random order. For example, 100 children shared 70/30 between two options
 * gives a shuffled list with 70 of one and 30 of the other
 *
 * @template {{ share: number }} Option
 * @param {Array<Option>} options - Options, each with a `share`
 * @param {number} total - Total number of items to share out
 * @returns {Array<Option>} One option for each item, in a random order
 */
export function spreadByShare(options, total) {
  const counts = splitIntoCounts(
    total,
    options.map(({ share }) => share)
  )

  return faker.helpers.shuffle(
    options.flatMap((option, index) => Array(counts[index]).fill(option))
  )
}

/**
 * Pick a school day in a term of this academic year for a session, about a
 * week and a half from today so parents can still be chased for consent and
 * children can still be triaged. If that isn’t in the term, pick the nearest
 * school day in it instead
 *
 * @param {SchoolTerm} term - School term
 * @param {number} [daysAhead] - How many days from today to aim for
 * @returns {Date} Session date
 */
export function pickSessionDateInTerm(term, daysAhead = 10) {
  const { from, to } = getTermDates(getCurrentAcademicYear(), term)
  const termStartsAt = new Date(`${from}T00:00:00`)
  const termEndsAt = new Date(`${to}T00:00:00`)

  let date = addDays(today(), daysAhead)
  if (date < termStartsAt) {
    date = termStartsAt
  } else if (date > termEndsAt) {
    date = termEndsAt
  }

  // Not at weekends. The app can report a term as starting or ending a day
  // early, i.e. on a Sunday, so move into the term rather than out of it
  while ([0, 6].includes(date.getDay())) {
    date = date <= termStartsAt ? addDays(date, 1) : removeDays(date, 1)
  }

  return setMidday(date)
}

/**
 * Create a school session on a given date, with the consent window open
 * for the usual number of weeks before it
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {School} options.school - School
 * @param {User} options.nurse - Nurse who set the session up
 * @param {SessionPresetName} options.presetName - Name of the session preset
 * @param {Date} options.date - Session date
 * @returns {Session} Session
 */
export function createSchoolSession(
  context,
  { school, nurse, presetName, date }
) {
  const preset = SessionPresets.find(({ name }) => name === presetName)

  // Reuse the usual session generator for realistic defaults (such as year
  // groups and protocols), then pin down the dates that matter
  const session = generateSession(preset, nurse, { school_id: school.id })
  session.academicYear = getCurrentAcademicYear()
  session.date = date

  // Consent usually opens a few weeks before a session. If today is earlier
  // than that, open it a week ago anyway, so parents have been able to respond
  const usuallyOpensAt = removeDays(date, TeamDefaults.SessionOpenWeeks * 7)
  const openedAWeekAgo = removeDays(today(), 7)
  session.consentOpenAt =
    usuallyOpensAt < openedAWeekAgo ? usuallyOpensAt : openedAWeekAgo

  // Session IDs are random, so make sure not to replace an existing session
  while (Session.findOne(session.id, context)) {
    session.id = faker.helpers.replaceSymbols('###')
  }

  return Session.create(session, context)
}

/**
 * Generate a child at a school in a particular year group
 *
 * @param {School} school - School
 * @param {number} yearGroup - Year group (Reception is 0)
 * @param {boolean} [isUnder16] - Make sure child is under 16, if their year group allows
 * @returns {Child} Child
 */
function generateChildInYearGroup(school, yearGroup, isUnder16) {
  const child = generateChild({ [school.id]: school })

  // Children in Reception turn 5 in their school year, so are 4 on 1 September
  const birthYear = getCurrentAcademicYear() - (yearGroup + 4)

  // The generator occasionally makes children home educated, or too old for
  // school, so make sure this child is at the school and the right age
  child.school_id = school.id

  // Children in a year group are born in the 12 months from 1 September. Some
  // children in the oldest year groups are already 16, but the app assumes
  // children aged 16 or over give consent themselves, so they can’t be
  // waiting for a parent to respond, or have a parent who refused
  const bornFrom = new Date(birthYear - 1, 8, 1)
  const bornTo = new Date(birthYear, 7, 31)
  const bornAfter = addDays(subYears(today(), 16), 1)
  child.dob = faker.date.between({
    from:
      isUnder16 && bornAfter > bornFrom && bornAfter < bornTo
        ? bornAfter
        : bornFrom,
    to: bornTo
  })

  // The year group was also worked out from the original date of birth
  child.academicYearGroup = yearGroup

  return child
}

/**
 * Create a new child at a school, add them to a session (once for each of its
 * programmes), and record that their parents have been asked for consent
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {School} options.school - School
 * @param {Session} options.session - Session to add child to
 * @param {Array<string>} options.programme_ids - IDs of the programmes to add child for
 * @param {number} options.yearGroup - Child’s year group
 * @param {boolean} [options.isImmunocompromised] - Whether child is immunocompromised,
 *   and so may need extra doses, instead of leaving it to chance
 * @param {boolean} [options.isUnder16] - Make sure child is under 16, if their year group allows
 * @param {boolean} [options.hasOtherParent] - Make sure child has a second parent who can be
 *   reached by email, instead of leaving it to chance
 * @returns {{patient: Patient, patientSessions: Array<PatientSession>, parent: Contact, otherParent?: Contact}}
 *   Records created, with a patient session for each programme (in the order given)
 */
export function createPatientInSession(
  context,
  {
    school,
    session,
    programme_ids,
    yearGroup,
    isImmunocompromised,
    isUnder16,
    hasOtherParent
  }
) {
  const child = generateChildInYearGroup(school, yearGroup, isUnder16)
  if (isImmunocompromised !== undefined) {
    child.isImmunocompromised = isImmunocompromised
  }

  const patient = generatePatient(child)

  // Moving school or changing date of birth would get in the way
  patient.pendingChanges = {}

  // Parents can only respond online, so any consent response counts as
  // delivered, if they can be reached by email
  const parent = generateContact(patient, true, { isEmailDelivered: true })
  Contact.create(parent, context)
  patient.contact_uuids.push(parent.uuid)

  let otherParent
  if (hasOtherParent) {
    otherParent = generateContact(patient, false, { isEmailDelivered: true })
  } else if (faker.datatype.boolean(0.5)) {
    otherParent = generateContact(patient)
  }
  if (otherParent) {
    Contact.create(otherParent, context)
    patient.contact_uuids.push(otherParent.uuid)
  }

  Patient.create(patient, context)

  // Creating a record returns one without `context`, which is needed below
  const createdPatient = Patient.findOne(patient.uuid, context)

  const patientSessions = programme_ids.map((programme_id) => {
    const patientSession = new PatientSession(
      {
        createdAt: session.consentOpenAt,
        patient_uuid: createdPatient.uuid,
        programme_id,
        session_id: session.id
      },
      context
    )
    createdPatient.addToSession(patientSession)
    createdPatient.requestConsent(patientSession)

    PatientSession.create(patientSession, context)

    // Keep the patient session that has `context`, which is needed later
    return patientSession
  })

  return { patient: createdPatient, patientSessions, parent, otherParent }
}

/**
 * Create a consent response from a parent, and link it to their child
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {Patient} options.patient - Child
 * @param {PatientSession} options.patientSession - Patient session
 * @param {Contact} options.parent - Parent giving the response
 * @param {object} options.overrides - What the response should be, instead of
 *   leaving it to chance (see `generateConsent`)
 * @returns {Consent} Consent response
 */
export function createConsentReply(
  context,
  { patient, patientSession, parent, overrides }
) {
  const generatedConsent = generateConsent(
    patientSession,
    parent,
    undefined,
    overrides
  )
  if (!generatedConsent) {
    throw new Error('Could not generate a consent response')
  }

  const consent = new Consent(generatedConsent, context)
  consent.linkToPatient(patient)

  return Consent.create(consent, context)
}

/**
 * @import { SchoolTerm, SessionPresetName } from '../../app/enums.js'
 * @import { Child, School, User } from '../../app/models.js'
 */
