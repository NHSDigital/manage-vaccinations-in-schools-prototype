import { fakerEN_GB as faker } from '@faker-js/faker'

import gpSurgeries from '../datasets/clinics.js'
import firstNames from '../datasets/first-names.js'
import schools from '../datasets/schools.js'
import { Adjustment, Gender, Impairment } from '../enums.js'
import { Child } from '../models.js'
import { getCurrentAcademicYear, getYearGroup } from '../utils/date.js'

/**
 * Generate fake child
 *
 * @returns {Child} Child
 */
export function generateChild() {
  // Gender
  const gender = faker.helpers.weightedArrayElement([
    { value: Gender.Male, weight: 50 },
    { value: Gender.Female, weight: 50 },
    { value: Gender.NotKnown, weight: 1 },
    { value: Gender.NotSpecified, weight: 1 }
  ])

  // Impairments
  let impairments
  if (faker.datatype.boolean(0.2)) {
    impairments = [
      faker.helpers.weightedArrayElement([
        { value: Impairment.Vision, weight: 1 },
        { value: Impairment.Hearing, weight: 2 },
        { value: Impairment.Mobility, weight: 1 },
        { value: Impairment.Memory, weight: 1 },
        { value: Impairment.MentalHealth, weight: 3 },
        { value: Impairment.Communicative, weight: 4 }
      ])
    ]
  }

  let impairmentsOther
  if (impairments?.includes(Impairment.Other)) {
    impairmentsOther =
      'My child has a chronic illness and requires ongoing medical treatment.'
  }

  // Adjustments
  let adjustments
  if (faker.datatype.boolean(0.2)) {
    adjustments = [
      faker.helpers.weightedArrayElement([
        { value: Adjustment.Distraction, weight: 2 },
        { value: Adjustment.ExtendedAppointment, weight: 1 },
        { value: Adjustment.FirstAppointment, weight: 3 },
        { value: Adjustment.LastAppointment, weight: 3 },
        { value: Adjustment.Privacy, weight: 3 },
        { value: Adjustment.HomeVisit, weight: 2 }
      ])
    ]
  }

  if (impairments?.includes(Impairment.Vision)) {
    adjustments = [Adjustment.GuideDog]
  }

  // Name
  const firstName = faker.helpers.arrayElement(firstNames[gender])
  const lastName = faker.person.lastName().replace(`'`, '’')

  let preferredFirstName
  if (firstName.startsWith('Al')) {
    preferredFirstName = 'Ali'
  }
  if (firstName.startsWith('Em')) {
    preferredFirstName = 'Em'
  }
  if (firstName.startsWith('Isa')) {
    preferredFirstName = 'Izzy'
  }

  // Date of birth and school
  const primarySchools = Object.values(schools).filter(
    ({ phase }) => phase === 'Primary'
  )
  const secondarySchools = Object.values(schools).filter(
    ({ phase }) => phase === 'Secondary'
  )
  const phase = faker.helpers.arrayElement(['Primary', 'Secondary'])
  let dob, school_id
  if (phase === 'Primary') {
    // Primary: Reception (age 4) to Year 6 (age 10)
    const ageOnCutOff = faker.number.int({ min: 4, max: 10 })

    // Calculate birth year
    const birthYear = getCurrentAcademicYear() - ageOnCutOff

    // Born between 1 September (previous year) and 31 August
    dob = faker.date.between({
      from: new Date(birthYear - 1, 8, 1), // 1 September previous year
      to: new Date(birthYear, 7, 31) // 31 August birth year
    })

    school_id = faker.helpers.arrayElement(primarySchools).id
  } else {
    // Children generally receive adolescent vaccinations when younger
    // Note: This means flu cohorts will skew more towards younger children
    const ageOnCutOff = faker.helpers.weightedArrayElement([
      { value: 11, weight: 12 },
      { value: 12, weight: 8 },
      { value: 13, weight: 4 },
      { value: 14, weight: 2 },
      { value: 15, weight: 1 }
    ])

    // Calculate birth year
    const birthYear = getCurrentAcademicYear() - ageOnCutOff

    // Born between 1 September (previous year) and 31 August
    dob = faker.date.between({
      from: new Date(birthYear - 1, 8, 1), // 1 September previous year
      to: new Date(birthYear, 7, 31) // 31 August birth year
    })

    school_id = faker.helpers.arrayElement(secondarySchools).id
  }

  // Add examples of children who are home-educated or at an unknown school
  if (faker.datatype.boolean(0.01)) {
    school_id = faker.helpers.arrayElement(['888888', '999999'])
  }

  // Add examples of children who have aged out (over 16)
  if (faker.datatype.boolean(0.05)) {
    dob = faker.date.birthdate({ min: 17, max: 18, mode: 'age' })
    school_id = ''
  }

  // GP surgery
  let gpSurgery
  if (faker.datatype.boolean(0.8)) {
    const gpSurgeryNames = Object.values(gpSurgeries).map(
      (surgery) => surgery.name
    )
    gpSurgery = faker.helpers.arrayElement(gpSurgeryNames)
  }

  // Registration group
  let registrationGroup
  const hasRegistrationGroup = String(school_id).startsWith('13')
  if (hasRegistrationGroup) {
    const yearGroup = getYearGroup(dob)
    const registration = faker.string.alpha({
      length: 2,
      casing: 'upper',
      exclude: ['A', 'E', 'I', 'O', 'U']
    })

    registrationGroup = `${yearGroup}${registration}`
  }

  return new Child({
    firstName,
    preferredFirstName,
    lastName,
    dob,
    gender,
    adjustments,
    impairments,
    impairmentsOther,
    immunocompromised: faker.datatype.boolean(0.1),
    address: {
      addressLine1: faker.location.streetAddress(),
      addressLevel1: faker.location.city(),
      postalCode: faker.location.zipCode({ format: 'CV## #??' })
    },
    gpSurgery,
    registrationGroup,
    school_id
  })
}
