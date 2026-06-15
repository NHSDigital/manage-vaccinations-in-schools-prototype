import { Notice } from '../models.js'

/**
 * Generate fake notice
 *
 * @param {Patient} patient - Patient
 * @param {NoticeType} type - Notice type
 * @returns {Notice} Notice
 */
export function generateNotice(patient, type) {
  return new Notice({
    type,
    patient_uuid: patient?.uuid
  })
}

/**
 * @import { NoticeType } from '../enums.js'
 * @import { Patient } from '../models.js'
 */
