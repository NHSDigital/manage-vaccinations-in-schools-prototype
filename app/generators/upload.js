import { fakerEN_GB as faker } from '@faker-js/faker'
import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { UploadStatus, UploadType } from '../enums.js'
import { Upload } from '../models.js'
import { today } from '../utils/date.js'

/**
 * Generate fake upload
 *
 * @param {Array<string>} patient_uuids - Patients
 * @param {User} user - User
 * @param {UploadType} [type] - Upload type
 * @param {School} [school] - School
 * @returns {Upload} Upload
 */
export function generateUpload(
  patient_uuids,
  user,
  type = UploadType.Cohort,
  school
) {
  const createdAt = faker.date.recent({ days: 14, refDate: today() })
  const fileName = `${prototypeFilters.slugify(type)}-${faker.number.int(5)}.csv`

  const status = faker.helpers.weightedArrayElement([
    { value: UploadStatus.Invalid, weight: 1 },
    { value: UploadStatus.Failed, weight: 1 },
    { value: UploadStatus.Devoid, weight: 1 },
    { value: UploadStatus.Review, weight: 8 },
    { value: UploadStatus.Approved, weight: 8 },
    ...(type === UploadType.School
      ? [{ value: UploadStatus.Rejected, weight: 3 }]
      : [])
  ])

  let updatedAt
  let updatedBy_uid
  let rejectionReason
  let validations
  let hasFailed
  let isApproved
  switch (status) {
    case UploadStatus.Invalid:
      validations = {
        3: {
          CHILD_FIRST_NAME: 'is required but missing',
          CHILD_POSTCODE:
            '‘24 High Street’ should be a postcode, like SW1A 1AA',
          CHILD_NHS_NUMBER:
            '‘QQ 12 34 56 A’ should be a valid NHS number, like 485 777 3456'
        },
        8: {
          CHILD_DOB: '‘Simon’ should be formatted as YYYY-MM-DD'
        }
      }
      break
    case UploadStatus.Failed:
      hasFailed = true
      break
    case UploadStatus.Devoid:
      patient_uuids = []
      break
    case UploadStatus.Approved:
      isApproved = true
      updatedAt = new Date(createdAt.getTime() + 72 * 60000)
      updatedBy_uid = user.uid
      break
    case UploadStatus.Rejected:
      isApproved = false
      rejectionReason =
        'These records appear to be for the wrong school. Please check that you have uploaded records for the correct school.'
      break
  }

  return new Upload({
    createdAt,
    createdBy_uid: user.uid,
    updatedAt,
    updatedBy_uid,
    fileName,
    type,
    rejectionReason,
    validations,
    hasFailed,
    isApproved,
    patient_uuids,
    ...(school && {
      yearGroups: school.yearGroups,
      school_id: school.id
    })
  })
}

/**
 * @import { School, User } from '../models.js'
 */
