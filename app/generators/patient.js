import { fakerEN_GB as faker } from '@faker-js/faker'

import schoolsData from '../datasets/schools.js'
import { Patient } from '../models.js'

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
 * @import { Child } from '../models.js'
 */
