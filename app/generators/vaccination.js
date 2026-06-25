import { fakerEN_GB as faker } from '@faker-js/faker'

import vaccines from '../datasets/vaccines.js'
import { VaccinationOutcome } from '../enums.js'
import { Vaccination } from '../models.js'

/**
 * Generate fake vaccination
 *
 * @param {PatientSession} patientSession - Patient session
 * @param {Programme} programme - Programme
 * @param {Batch} batch - Batch
 * @param {Array<User>} users - Users
 * @returns {Vaccination} Vaccination
 */
export function generateVaccination(patientSession, programme, batch, users) {
  const user = faker.helpers.arrayElement(users)

  let injectionMethod
  let injectionSite
  let sequence

  const outcome = faker.helpers.weightedArrayElement([
    { value: VaccinationOutcome.Vaccinated, weight: 4 },
    { value: VaccinationOutcome.PartVaccinated, weight: 1 },
    { value: VaccinationOutcome.Absent, weight: 2 },
    { value: VaccinationOutcome.DoNotVaccinate, weight: 1 },
    { value: VaccinationOutcome.Refused, weight: 2 },
    { value: VaccinationOutcome.Unwell, weight: 2 }
  ])

  if (programme.sequence) {
    sequence = programme.sequenceDefault
  }

  const vaccinated =
    outcome === VaccinationOutcome.Vaccinated ||
    outcome === VaccinationOutcome.PartVaccinated

  // Sync date is between 1 minute and 2 hours after the session first date
  const syncDateLowerBound = new Date(
    patientSession.session.date.getTime() + 1000 * 60
  )
  const syncDateUpperBound = new Date(
    patientSession.session.date.getTime() + 1000 * 60 * 60 * 2
  )

  // Only populate sync date if the patient was vaccinated
  const nhseSyncedAt = vaccinated
    ? faker.helpers.maybe(
        () =>
          faker.date.between({
            from: syncDateLowerBound,
            to: syncDateUpperBound
          }),
        { probability: 0.9 }
      )
    : undefined

  return new Vaccination({
    createdAt: patientSession.session.date,
    createdBy_uid: user.uid,
    administeredAt: patientSession.session.date,
    administeredBy_uid: user.uid,
    nhseSyncedAt,
    outcome,
    locationName: patientSession.session?.location.name,
    selfId: true,
    patientSession_uuid: patientSession.uuid,
    programme_id: programme.id,
    vaccine_snomed: batch?.vaccine_snomed,
    ...(vaccinated && {
      batch_id: batch?.id,
      dose: vaccines[batch?.vaccine_snomed]?.dose,
      sequence,
      injectionMethod,
      injectionSite
    })
  })
}

/**
 * @import { Batch, PatientSession, Programme, User } from '../models.js'
 */
