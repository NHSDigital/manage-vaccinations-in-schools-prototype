import { fakerEN_GB as faker } from '@faker-js/faker'

import firstNamesData from '../datasets/first-names.js'
import lastNamesData from '../datasets/last-names.js'
import parentFirstNamesData from '../datasets/parent-first-names.js'
import { Gender } from '../enums.js'

const britishOrigin = 'British'

// Chance of a double-barrelled surname, e.g. for a child with parents of different heritage
const doubleBarrelledProbability = 0.015

// Chance that someone’s first name isn’t from their family’s name origin (more likely for children)...
const otherOriginProbabilities = {
  child: 0.15,
  parent: 0.05
}
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
 * Pick the name origin to draw a first name from, so that families mostly have
 * names from the same origin as their surname, but not always
 *
 * @param {string} lastName - Family surname
 * @param {boolean} isParent - true if parent, false if child
 * @returns {string} Name origin
 */
function pickFirstNameOrigin(lastName, isParent) {
  const otherOriginProbability = isParent
    ? otherOriginProbabilities.parent
    : otherOriginProbabilities.child
  if (faker.datatype.boolean(otherOriginProbability)) {
    return faker.datatype.boolean(britishFirstNameProbability)
      ? britishOrigin
      : generateNameOrigin()
  }

  return getNameOrigin(lastName) || generateNameOrigin()
}

/**
 * Generate a modern first name for a child of the given gender, which suits
 * their family’s surname
 *
 * @param {string} lastName - Family surname
 * @param {Gender} gender - the gender of the child
 * @returns {string} First name
 */
export function generateChildFirstName(lastName, gender) {
  // Not every origin has names for every gender (e.g. only the British group
  // has names for children whose gender is not known or not specified)
  const originNames =
    firstNamesData[pickFirstNameOrigin(lastName, false)][gender]
  const names = originNames?.length
    ? originNames
    : firstNamesData[britishOrigin][gender]

  return faker.helpers.arrayElement(names)
}

/**
 * Generate a parent’s first name that suits their family’s surname
 *
 * @param {string} lastName - Family surname
 * @param {'Female'|'Male'} gender - Gender of the first name
 * @returns {string} First name
 */
export function generateParentFirstName(lastName, gender) {
  const origin = pickFirstNameOrigin(lastName, true)

  return faker.helpers.arrayElement(parentFirstNamesData[origin][gender])
}
