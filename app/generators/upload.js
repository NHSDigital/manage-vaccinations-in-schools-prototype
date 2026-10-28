import { fakerEN_GB as faker } from '@faker-js/faker'
import prototypeFilters from '@x-govuk/govuk-prototype-filters'

import { UploadStatus, UploadType } from '../enums.js'
import { Upload } from '../models.js'
import { addDays, today } from '../utils/date.js'
import { getUploadValidations } from '../utils/upload.js'

const HOUR = 60 * 60 * 1000

/**
 * Routes an upload can take through the system
 *
 * - Team: a SAIS team uploads a file, reviews it and approves it
 * - School: a school admin uploads a file, checks it and sends it to a SAIS
 *   team, who review it and approve or reject it
 * - Requested: as above, but a SAIS team first requests the upload
 */
const UploadFlow = {
  Team: 'Team',
  School: 'School',
  Requested: 'Requested'
}

/**
 * Statuses each flow can reach
 */
const FLOW_STATUSES = {
  [UploadFlow.Team]: [
    UploadStatus.Invalid,
    UploadStatus.Failed,
    UploadStatus.Review,
    UploadStatus.Approved
  ],
  [UploadFlow.School]: [
    UploadStatus.Invalid,
    UploadStatus.Failed,
    UploadStatus.Pending,
    UploadStatus.Review,
    UploadStatus.Approved,
    UploadStatus.Rejected
  ],
  [UploadFlow.Requested]: [
    UploadStatus.Requested,
    UploadStatus.Invalid,
    UploadStatus.Failed,
    UploadStatus.Pending,
    UploadStatus.Review,
    UploadStatus.Approved,
    UploadStatus.Rejected
  ]
}

const STATUS_WEIGHTS = {
  [UploadStatus.Requested]: 3,
  [UploadStatus.Invalid]: 1,
  [UploadStatus.Failed]: 1,
  [UploadStatus.Pending]: 3,
  [UploadStatus.Review]: 8,
  [UploadStatus.Approved]: 8,
  [UploadStatus.Rejected]: 3
}

/**
 * Get flow for an upload
 *
 * Only class lists can come from schools; these can also be uploaded directly
 * by a SAIS team.
 *
 * @param {UploadType} type - Upload type
 * @param {User} [schoolUser] - School user
 * @returns {string} Upload flow
 */
function getFlow(type, schoolUser) {
  if (type !== UploadType.School || !schoolUser) {
    return UploadFlow.Team
  }

  return faker.helpers.weightedArrayElement([
    { value: UploadFlow.Team, weight: 2 },
    { value: UploadFlow.School, weight: 3 },
    { value: UploadFlow.Requested, weight: 3 }
  ])
}

/**
 * Generate fake upload
 *
 * Picks a flow and a status that flow can reach, works out which steps the
 * upload went through to get there, then records when each step happened and
 * who did it.
 *
 * @param {Array<string>} patient_uuids - Patients
 * @param {User} user - SAIS team user
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
  const schoolUser =
    type === UploadType.School && school?.users?.length
      ? faker.helpers.arrayElement(school.users)
      : undefined

  const flow = getFlow(type, schoolUser)
  const status = faker.helpers.weightedArrayElement(
    FLOW_STATUSES[flow].map((value) => ({
      value,
      weight: STATUS_WEIGHTS[value]
    }))
  )

  // Which steps this upload has been through to reach its status
  const isRequested = flow === UploadFlow.Requested
  const isUploaded = status !== UploadStatus.Requested
  const isSubmitted =
    flow !== UploadFlow.Team &&
    [
      UploadStatus.Review,
      UploadStatus.Approved,
      UploadStatus.Rejected
    ].includes(status)
  const isApproved = status === UploadStatus.Approved
  const isRejected = status === UploadStatus.Rejected

  // Start between 1 and 3 weeks ago, then move forward a few hours per step,
  // never going past today
  let at = faker.date.between({
    from: addDays(today(), -21),
    to: addDays(today(), -7)
  })
  const nextStep = () => {
    const next = at.getTime() + faker.number.int({ min: 1, max: 48 }) * HOUR
    at = new Date(Math.min(next, today().getTime()))
    return at
  }

  // Record when each step happened, in order
  const createdAt = at
  const uploadedAt = isRequested && isUploaded ? nextStep() : createdAt
  const submittedAt = isSubmitted ? nextStep() : undefined
  const decidedAt = isApproved || isRejected ? nextStep() : undefined

  const uploader = flow === UploadFlow.Team ? user : schoolUser

  return new Upload({
    type,
    fileName: `${prototypeFilters.slugify(type)}-${faker.number.int(5)}.csv`,
    ...(school && {
      yearGroups: school.yearGroups,
      school_id: school.id
    }),
    createdAt,
    createdBy_uid: isRequested ? user.uid : uploader.uid,
    ...(isRequested && {
      requestedAt: createdAt,
      requestedBy_uid: user.uid,
      assignee_emails: [schoolUser.email]
    }),
    ...(isUploaded && {
      uploadedAt,
      uploadedBy_uid: uploader.uid,
      patient_uuids
    }),
    ...(status === UploadStatus.Invalid && {
      validations: getUploadValidations(UploadStatus.Invalid)
    }),
    ...(status === UploadStatus.Failed && {
      hasFailed: true
    }),
    ...(isSubmitted && {
      submittedAt,
      submittedBy_uid: schoolUser.uid
    }),
    ...(isApproved && {
      approvedAt: decidedAt,
      approvedBy_uid: user.uid
    }),
    ...(isRejected && {
      rejectedAt: decidedAt,
      rejectedBy_uid: user.uid,
      rejectionReason:
        'These records appear to be for the wrong school. Please check that you have uploaded records for the correct school.'
    })
  })
}

/**
 * @import { School, User } from '../models.js'
 */
