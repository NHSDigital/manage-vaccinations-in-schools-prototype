import { fakerEN_GB as faker } from '@faker-js/faker'

import firstNamesData from '../datasets/first-names.js'
import lastNamesData from '../datasets/last-names.js'
import parentFirstNamesData from '../datasets/parent-first-names.js'
import { Gender } from '../enums.js'

const britishOrigin = 'British'

// Chance of a double-barrelled surname, e.g. for a child with parents of different heritage
const doubleBarrelledProbability = 0.015

// Chance that a parent’s first name isn’t from their family’s name origin...
const otherOriginProbability = 0.15
// ...and, when it isn’t, that it’s a British name rather than one from any origin
const britishFirstNameProbability = 0.7

const origins = lastNamesData.map(({ origin, weight }) => ({
  value: origin,
  weight
}))

/**
 * Pick a name origin, weighted by the share of families in each
 *
 * @returns {string} Name origin
 */
function generateNameOrigin() {
  return faker.helpers.weightedArrayElement(origins)
}

/**
 * Generate a single (not double-barrelled) surname
 *
 * @returns {string} Surname
 */
function generateSingleLastName() {
  const origin = generateNameOrigin()
  const { names } = lastNamesData.find((group) => group.origin === origin)

  return faker.helpers.arrayElement(names)
}

/**
 * Generate a surname, from a weighted mix of name origins
 *
 * @returns {string} Surname
 */
export function generateLastName() {
  const lastName = generateSingleLastName()

  return faker.datatype.boolean(doubleBarrelledProbability)
    ? `${lastName}-${generateSingleLastName()}`
    : lastName
}

/**
 * Get the name origin of a surname (for a double-barrelled name, its first part)
 *
 * @param {string} lastName - Surname
 * @returns {string|undefined} Name origin, if the surname is a known one
 */
export function getNameOrigin(lastName) {
  const [firstPart] = lastName.split('-')

  return lastNamesData.find(({ names }) => names.includes(firstPart))?.origin
}

/**
 * Generate a modern first name for a child of the given gender
 *
 * @param {Gender} gender - the gender of the child
 * @returns {string} First name
 */
export function generateChildFirstName(gender) {
  const names = Object.values(firstNamesData).flatMap(
    (group) => group[gender] ?? []
  )

  return faker.helpers.arrayElement(names)
}

/**
 * Generate a parent’s first name that suits their family’s surname, so that
 * families mostly have names from the same origin, but not always
 *
 * @param {string} lastName - Family surname
 * @param {'Female'|'Male'} gender - Gender of the first name
 * @returns {string} First name
 */
export function generateParentFirstName(lastName, gender) {
  let origin = getNameOrigin(lastName) || generateNameOrigin()

  if (faker.datatype.boolean(otherOriginProbability)) {
    origin = faker.datatype.boolean(britishFirstNameProbability)
      ? britishOrigin
      : generateNameOrigin()
  }

  return faker.helpers.arrayElement(parentFirstNamesData[origin][gender])
}
