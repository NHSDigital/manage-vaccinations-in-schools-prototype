import { fakerEN_GB as faker } from '@faker-js/faker'

import schools from '../datasets/schools.js'
import { Patient } from '../models.js'

import { generateChild } from './child.js'

/**
 * Generate fake patient record
 *
 * @returns {Patient} Patient record
 */
export function generatePatient() {
  const child = generateChild()

  // Pending changes
  const pendingChanges = {}
  const hasPendingChanges = faker.datatype.boolean(0.025)
  if (hasPendingChanges) {
    // Adjust date of birth
    const newDob = new Date(child.dob)
    newDob.setFullYear(newDob.getFullYear() - 2)
    pendingChanges.dob = newDob

    // Move school
    const primarySchools = Object.values(schools)
      .filter((school) => school.phase === 'Primary')
      .filter((school) => school.id !== child.school_id)
    const secondarySchools = Object.values(schools)
      .filter((school) => school.phase === 'Secondary')
      .filter((school) => school.id !== child.school_id)
    const newUrn =
      schools[child.school_id]?.phase === 'Primary'
        ? faker.helpers.arrayElement(primarySchools).id
        : faker.helpers.arrayElement(secondarySchools).id
    pendingChanges.school_id = newUrn
  }

  return new Patient({
    ...child,
    pendingChanges
  })
}
