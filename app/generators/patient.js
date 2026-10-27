import { fakerEN_GB as faker } from '@faker-js/faker'

import schoolsData from '../datasets/schools.js'
import { Patient } from '../models.js'
import { removeDays, today } from '../utils/date.js'

/**
 * Generate fake patient record
 *
 * @param {Child} child - Child
 * @returns {Patient} Patient record
 */
export function generatePatient(child) {
  // Pending changes
  const pendingChanges = {}
  const hasPendingChanges = faker.datatype.boolean(0.025)
  if (hasPendingChanges) {
    // Adjust date of birth
    const newDob = new Date(child.dob)
    newDob.setFullYear(newDob.getFullYear() - 2)
    pendingChanges.dob = newDob

    // Move school
    const primarySchools = schoolsData
      .filter((school) => school.phase === 'Primary')
      .filter((school) => school.id !== child.school_id)
    const secondarySchools = schoolsData
      .filter((school) => school.phase === 'Secondary')
      .filter((school) => school.id !== child.school_id)
    const newUrn =
      schoolsData.find(({ id }) => id === child.school_id)?.phase === 'Primary'
        ? faker.helpers.arrayElement(primarySchools).id
        : faker.helpers.arrayElement(secondarySchools).id
    pendingChanges.school_id = newUrn
  }

  return new Patient({
    ...child,
    pendingChanges
  })
}

/**
 * Generate date patient was last searched for in Imms API
 *
 * Patients in upcoming sessions are searched for daily, everyone else at least
 * every 28 days. Searches run at 6am.
 *
 * @param {Patient} patient - Patient record
 * @returns {Date|undefined} Date last searched for
 */
export function generateLastSearchedAt(patient) {
  // 5% of patients have never been searched for
  const hasBeenSearched = faker.datatype.boolean(0.95)
  if (!hasBeenSearched) {
    return
  }

  const isInUpcomingSession = patient.patientSessions.some(
    ({ session }) => session?.isPlanned || session?.isActive
  )

  const lastSearchedAt = isInUpcomingSession
    ? today()
    : removeDays(today(), faker.number.int({ min: 1, max: 28 }))
  lastSearchedAt.setHours(6, 0, 0, 0)

  return lastSearchedAt
}

/**
 * @import { Child } from '../models.js'
 */
