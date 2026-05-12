import { fakerEN_GB as faker } from '@faker-js/faker'

import schools from '../datasets/schools.js'
import { Patient } from '../models.js'

import { generateChild } from './child.js'
import { generateParent } from './parent.js'

/**
 * Generate fake patient record
 *
 * @returns {Patient} Patient record
 */
export function generatePatient() {
  const child = generateChild()

  // Parents
  const parent1 = generateParent(child, true)

  let parent2
  const addSecondParent = faker.datatype.boolean(0.5)
  if (addSecondParent) {
    parent2 = generateParent(child)
  }

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
    parent1,
    parent2,
    pendingChanges
  })
}
