import { fakerEN_GB as faker } from '@faker-js/faker'

import {
  NotifyEmailStatus,
  SessionPresets,
  TeamDefaults
} from '../../app/enums.js'
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
import { getCurrentAcademicYear, removeDays } from '../../app/utils/date.js'

/**
 * Split a total into whole numbers that follow the given shares as closely as
 * possible, so 6% of 300 children is exactly 18 and the counts always add up
 *
 * @param {number} total - Total to split
 * @param {Array<number>} shares - Relative size of each part (they don’t need to add up to 100)
 * @returns {Array<number>} Whole number for each part
 */
export function splitIntoCounts(total, shares) {
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
  session.consentOpenAt = removeDays(date, TeamDefaults.SessionOpenWeeks * 7)

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
 * @returns {Child} Child
 */
function generateChildInYearGroup(school, yearGroup) {
  const child = generateChild({ [school.id]: school })

  // Children in Reception turn 5 in their school year, so are 4 on 1 September
  const birthYear = getCurrentAcademicYear() - (yearGroup + 4)

  // The generator occasionally makes children home educated, or too old for
  // school, so make sure this child is at the school and the right age
  child.school_id = school.id
  child.dob = faker.date.between({
    from: new Date(birthYear - 1, 8, 1),
    to: new Date(birthYear, 7, 31)
  })

  // The year group was also worked out from the original date of birth
  child.academicYearGroup = yearGroup

  return child
}

/**
 * Create a new child at a school, add them to a session, and record that their
 * parents have been asked for consent
 *
 * @param {object} context - Context
 * @param {object} options - Options
 * @param {School} options.school - School
 * @param {Session} options.session - Session to add child to
 * @param {string} options.programme_id - Programme ID
 * @param {number} options.yearGroup - Child’s year group
 * @param {boolean} [options.isImmunocompromised] - Whether child is immunocompromised,
 *   and so may need extra doses, instead of leaving it to chance
 * @returns {{patient: Patient, patientSession: PatientSession, parent: Contact}} Records created
 */
export function createPatientInSession(
  context,
  { school, session, programme_id, yearGroup, isImmunocompromised }
) {
  const child = generateChildInYearGroup(school, yearGroup)
  if (isImmunocompromised !== undefined) {
    child.isImmunocompromised = isImmunocompromised
  }

  const patient = generatePatient(child)

  // Moving school or changing date of birth would get in the way
  patient.pendingChanges = {}

  // Make sure at least one parent can be reached by email, so any consent
  // response they give counts as delivered
  let parent
  do {
    parent = generateContact(patient, true)
  } while (!parent.email || parent.emailStatus !== NotifyEmailStatus.Delivered)
  Contact.create(parent, context)
  patient.contact_uuids.push(parent.uuid)

  if (faker.datatype.boolean(0.5)) {
    const otherContact = generateContact(patient)
    Contact.create(otherContact, context)
    patient.contact_uuids.push(otherContact.uuid)
  }

  Patient.create(patient, context)

  // Creating a record returns one without `context`, which is needed below
  const createdPatient = Patient.findOne(patient.uuid, context)

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

  return { patient: createdPatient, patientSession, parent }
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
 * @import { SessionPresetName } from '../../app/enums.js'
 * @import { Child, School, User } from '../../app/models.js'
 */
