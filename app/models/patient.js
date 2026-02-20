import { fakerEN_GB as faker } from '@faker-js/faker'
import _ from 'lodash'

import programmesData from '../datasets/programmes.js'
import schools from '../datasets/schools.js'
import { AuditEventType, NoticeType } from '../enums.js'
import {
  AuditEvent,
  Child,
  Move,
  Parent,
  PatientProgramme,
  PatientSession,
  Programme,
  Reply,
  Vaccination
} from '../models.js'
import { getDateValueDifference, removeDays, today } from '../utils/date.js'
import { tokenize } from '../utils/object.js'
import { getPreferredNames } from '../utils/reply.js'
import {
  formatLink,
  formatLinkWithSecondaryText,
  formatList,
  formatNhsNumber,
  formatOther,
  formatParent,
  formatWithSecondaryText,
  sentenceCaseProgrammeName,
  stringToBoolean
} from '../utils/string.js'

/**
 * @class Patient record
 * @augments Child
 * @param {object} options - Options
 * @param {object} [context] - Global context
 * @property {string} uuid - UUID
 * @property {string} nhsn - NHS number
 * @property {boolean} invalid - Flagged as invalid
 * @property {boolean} sensitive - Flagged as sensitive
 * @property {Date} [updatedAt] - Updated date
 * @property {object} [address] - Address
 * @property {Parent} [parent1] - Parent 1
 * @property {Parent} [parent2] - Parent 2
 * @property {Patient} [pendingChanges] - Pending changes to record values
 * @property {import('../enums.js').ArchiveRecordReason} [archiveReason] - Archival reason
 * @property {string} [archiveReasonOther] - Other archival reason
 * @property {Array<string} [clinicProgramme_ids] - Clinic programme invitations
 * @property {Array<import('./audit-event.js').AuditEvent>} events - Events
 * @property {Array<string>} [reply_uuids] - Reply IDs
 * @property {Array<string>} [patientSession_uuids] - Patient session IDs
 * @property {Array<string>} [vaccination_uuids] - Vaccination UUIDs
 */
export class Patient extends Child {
  constructor(options, context) {
    super(options, context)

    const invalid = stringToBoolean(options?.invalid)
    const sensitive = stringToBoolean(options?.sensitive)

    this.uuid = options?.uuid || faker.string.uuid()
    this.nhsn = options?.nhsn || this.nhsNumber
    this.invalid = invalid
    this.sensitive = sensitive
    this.updatedAt = options?.updatedAt && new Date(options.updatedAt)
    this.address = !sensitive && options?.address ? options.address : undefined
    this.parent1 =
      !sensitive && options?.parent1 ? new Parent(options.parent1) : undefined
    this.parent2 =
      !sensitive && options?.parent2 ? new Parent(options.parent2) : undefined
    this.archiveReason = options?.archiveReason
    this.archiveReasonOther = options?.archiveReasonOther
    this.pendingChanges = options?.pendingChanges || {}

    this.clinicProgramme_ids = options?.clinicProgramme_ids || []
    this.events = options?.events || []
    this.reply_uuids = options?.reply_uuids || []
    this.patientSession_uuids = options?.patientSession_uuids || []
    this.vaccination_uuids = options?.vaccination_uuids || []
  }

  /**
   * Get NHS number
   *
   * @returns {string} NHS Number
   */
  get nhsNumber() {
    const nhsn = '999#######'.replace(/#+/g, (m) =>
      faker.string.numeric(m.length)
    )
    const temporaryNhsn = faker.string.alpha(10)

    // 5% of records don’t have an NHS number
    const hasNhsNumber = faker.helpers.maybe(() => true, { probability: 0.95 })

    return hasNhsNumber ? nhsn : temporaryNhsn
  }

  /**
   * Has missing NHS number
   *
   * @returns {boolean} Has missing NHS number
   */
  get hasMissingNhsNumber() {
    return !this.nhsn.match(/^\d{10}$/)
  }

  /**
   * Has no parental contact details
   *
   * @returns {boolean} Has no parental details
   */
  get hasNoContactDetails() {
    return (
      !this.parent1?.email &&
      !this.parent1?.tel &&
      !this.parent2?.email &&
      !this.parent2?.tel
    )
  }

  /**
   * Needs reasonable adjustments(s)
   *
   * @returns {boolean} Needs reasonable adjustments(s)
   */
  get hasAdjustment() {
    return this.adjustments.length > 0
  }

  /**
   * Has impairment(s)
   *
   * @returns {boolean} Has impairment(s)
   */
  get hasImpairment() {
    return this.impairments.length > 0
  }

  /**
   * Get full name, formatted as LASTNAME, Firstname
   *
   * @returns {string} Full name
   */
  get fullName() {
    return [this.lastName.toUpperCase(), this.firstName].join(', ')
  }

  /**
   * Get preferred names (from replies)
   *
   * @returns {string|boolean} Full name
   */
  get preferredNames() {
    return getPreferredNames(this.replies)
  }

  /**
   * Get parents (from record and replies)
   *
   * @returns {Array<Parent>} Parents
   */
  get parents() {
    const parents = new Map()

    if (this.parent1) {
      parents.set(this.parent1.uuid, new Parent(this.parent1))
    }

    if (this.parent2) {
      parents.set(this.parent2.uuid, new Parent(this.parent2))
    }

    // Add any new parents found in consent replies
    Object.values(this.replies).forEach(({ parent }) => {
      if (parent && !parents.has(parent.uuid)) {
        parents.set(parent.uuid, new Parent(parent))
      }
    })

    return [...parents.values()]
  }

  get recordEvents() {
    const recordEvents = []

    recordEvents.push(
      new AuditEvent({
        type: AuditEventType.Record,
        name: 'Child record imported',
        createdAt: '2025-08-01T12:00:00'
      })
    )

    if (this.sensitive) {
      recordEvents.push(
        new AuditEvent({
          type: AuditEventType.Record,
          name: 'Record flagged as sensitive',
          createdAt: '2025-08-01T12:00:00'
        })
      )
    }

    let move
    if (this.context.moves) {
      move = Move.findAll(this.context).find(
        (move) => move.patient_uuid === this.uuid
      )
    }

    if (move) {
      recordEvents.push(
        new AuditEvent({
          type: AuditEventType.Record,
          // Fake it to make it look like school move has already occurred
          name: `Moved from ${move.formatted.to_urn} to ${move.formatted.from_urn}`,
          createdAt: move.createdAt
        })
      )
    }

    return recordEvents
  }

  /**
   * Get audit events
   *
   * @returns {Array<AuditEvent>} Audit events
   */
  get auditEvents() {
    const events = [...this.events, ...this.recordEvents]

    return events
      .map((auditEvent) => new AuditEvent(auditEvent, this.context))
      .filter(({ type }) => type === AuditEventType.Record)
  }

  /**
   * Get audit events grouped by date
   *
   * @returns {object} Audit events grouped by date
   */
  get auditEventLog() {
    const auditEvents = this.auditEvents.sort((a, b) =>
      getDateValueDifference(b.createdAt, a.createdAt)
    )

    return Object.groupBy(auditEvents, (auditEvent) => {
      return auditEvent.formatted.createdAt
    })
  }

  /**
   * Get reminders sent
   *
   * @returns {Array} Reminders sent
   */
  get reminders() {
    return this.events
      .map((event) => new AuditEvent(event))
      .filter((event) => event.type === AuditEventType.Reminder)
  }

  /**
   * Get date last reminders sent
   *
   * @returns {string|undefined} Date last reminders sent
   */
  get lastReminderDate() {
    const lastReminder = this.reminders.at(-1)
    if (lastReminder) {
      return lastReminder.formatted.createdAt
    }
  }

  /**
   * Get all notices
   *
   * @returns {Array<AuditEvent>} Notice events
   */
  get notices() {
    return this.events
      .map((event) => new AuditEvent(event))
      .filter((event) => event.type === AuditEventType.Notice)
  }

  /**
   * Get most recent notice
   *
   * @returns {AuditEvent} Notice event
   */
  get notice() {
    return this.notices && this.notices[0]
  }

  /**
   * Get patient programmes
   *
   * @returns {Record<string, PatientProgramme>}
   */
  get programmes() {
    /** @type {Record<string, PatientProgramme>} */
    const programmes = {}

    for (const programme of Object.values(programmesData).filter(
      (programme) => !programme.hidden
    )) {
      const patientProgramme = new PatientProgramme(
        {
          patient_uuid: this.uuid,
          programme_id: programme.id
        },
        this.context
      )

      // Patient invited to clinic if invitation needed and invitation sent
      patientProgramme.invitedToClinic =
        patientProgramme.inviteToSession &&
        this.clinicProgramme_ids.includes(programme.id)

      programmes[programme.id] = patientProgramme
    }

    return programmes
  }

  /**
   * Get replies
   *
   * @returns {Array<Reply>} Replies
   */
  get replies() {
    return this.reply_uuids
      .map((uuid) => Reply.findOne(uuid, this.context))
      .filter((reply) => reply?.patient_uuid === this.uuid)
  }

  /**
   * Get patient sessions
   *
   * @returns {Array<PatientSession>} Patient sessions
   */
  get patientSessions() {
    if (this.context?.patientSessions && this.patientSession_uuids) {
      return this.patientSession_uuids
        .map((uuid) => PatientSession.findOne(uuid, this.context))
        .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
    }

    return []
  }

  /**
   * Get vaccinations
   *
   * @returns {Array<Vaccination>} Vaccinations
   */
  get vaccinations() {
    if (this.context?.vaccinations && this.vaccination_uuids) {
      return this.vaccination_uuids.map(
        (uuid) =>
          new Vaccination(this.context?.vaccinations[uuid], this.context)
      )
    }

    return []
  }

  /**
   * Record is archived
   *
   * @returns {boolean} Record is archived
   */
  get archived() {
    return this.archiveReason !== undefined
  }

  /**
   * Has pending changes
   *
   * @returns {boolean} Has pending changes
   */
  get hasPendingChanges() {
    return Object.keys(this.pendingChanges).length > 0
  }

  /**
   * Get formatted links
   *
   * @returns {object} Formatted links
   */
  get link() {
    return {
      fullName: formatLink(this.uri, this.fullName),
      fullNameAndNhsn: formatLinkWithSecondaryText(
        this.uri,
        this.fullName,
        this.formatted.nhsn || 'Missing NHS number'
      )
    }
  }

  /**
   * Get formatted summary
   *
   * @returns {object} Formatted summaries
   */
  get summary() {
    return {
      dob: `${this.formatted.dob}</br>
          <span class="nhsuk-u-secondary-text-colour nhsuk-u-font-size-16">
            ${this.formatted.yearGroup}
          </span>`
    }
  }

  /**
   * Get tokenised values (to use in search queries)
   *
   * @returns {string} Tokens
   */
  get tokenized() {
    const parentTokens = []
    for (const parent of this.parents) {
      parentTokens.push(tokenize(parent, ['fullName', 'tel', 'email']))
    }

    const childTokens = tokenize(this, [
      'nhsn',
      'fullName',
      'postalCode',
      'school.name'
    ])

    return [childTokens, parentTokens].join(' ')
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    const formattedNhsn = formatNhsNumber(this.nhsn, this.invalid)
    const formattedParents = this.parents.map((parent) => formatParent(parent))

    return {
      ...super.formatted,
      fullNameAndNhsn: formatWithSecondaryText(this.fullName, formattedNhsn),
      nhsn: formattedNhsn,
      newUrn:
        this.pendingChanges?.school_id &&
        schools[this.pendingChanges.school_id].name,
      parent1: this.parent1 && formatParent(this.parent1),
      parent2: this.parent2 && formatParent(this.parent2),
      parents: formatList(formattedParents),
      archiveReason: formatOther(this.archiveReasonOther, this.archiveReason),
      lastReminderDate: this.lastReminderDate
        ? `Last reminder sent on ${this.lastReminderDate}`
        : 'No reminders sent',
      clinicProgramme_ids: this.clinicProgramme_ids
        .map((id) => Programme.findOne(id, this.context).nameTag)
        .join(' ')
    }
  }

  /**
   * Get namespace
   *
   * @returns {string} Namespace
   */
  get ns() {
    return 'patient'
  }

  /**
   * Get URI
   *
   * @returns {string} URI
   */
  get uri() {
    return `/patients/${this.uuid}`
  }

  /**
   * Find all
   *
   * @param {object} context - Context
   * @returns {Array<Patient>|undefined} Patient records
   * @static
   */
  static findAll(context) {
    return Object.values(context.patients).map(
      (patient) => new Patient(patient, context)
    )
  }

  /**
   * Find one
   *
   * @param {string} uuid - Patient UUID
   * @param {object} context - Context
   * @returns {Patient|undefined} Patient record
   * @static
   */
  static findOne(uuid, context) {
    if (context?.patients?.[uuid]) {
      return new Patient(context.patients[uuid], context)
    }
  }

  /**
   * Create
   *
   * @param {Patient} patient - Patient record
   * @param {object} context - Context
   * @returns {Patient} Created patient record
   * @static
   */
  static create(patient, context) {
    const createdPatient = new Patient(patient)

    // Update context
    context.patients = context.patients || {}
    context.patients[createdPatient.uuid] = createdPatient

    return createdPatient
  }

  /**
   * Update
   *
   * @param {string} uuid - Patient record UUID
   * @param {object} updates - Updates
   * @param {object} context - Context
   * @returns {Patient} Updated patient record
   * @static
   */
  static update(uuid, updates, context) {
    const updatedPatient = _.merge(Patient.findOne(uuid, context), updates)
    updatedPatient.updatedAt = today()

    // Add update to activity log (but only when updating wizard context)
    // TODO: Make this work with nested values like date of birth
    if (Object.keys(context.patients).length === 1) {
      for (const [key, value] of Object.entries(updates)) {
        updatedPatient.addEvent({
          name: `Updated \`${key}\` to **${value}**`,
          type: AuditEventType.Record,
          createdAt: updatedPatient.updatedAt
        })
      }
    }

    // Remove patient context
    delete updatedPatient.context

    // Delete original patient (with previous UUID)
    delete context.patients[uuid]

    // Update context
    context.patients[updatedPatient.uuid] = updatedPatient

    return updatedPatient
  }

  /**
   * Add event to activity log
   *
   * @param {object} event - Event
   */
  addEvent(event) {
    this.events.push(new AuditEvent(event))
  }

  /**
   * Archive
   *
   * @param {string} uuid - Patient record UUID
   * @param {object} archive - Archive details
   * @param {object} context - Context
   * @returns {Patient} Archived patient record
   * @static
   */
  static archive(uuid, archive, context) {
    const archivedPatient = Patient.update(uuid, archive, context)

    archivedPatient.addEvent({
      name: `Record archived: ${archive.archiveReason}`,
      note: archive.archiveReasonOther,
      type: AuditEventType.Record,
      createdBy_uid: archive.createdBy_uid
    })

    return archivedPatient
  }

  /**
   * Add patient to session
   *
   * @param {import('./patient-session.js').PatientSession} patientSession - Patient session
   */
  addToSession(patientSession) {
    this.patientSession_uuids.push(patientSession.uuid)
  }

  /**
   * Invite parent to give consent
   *
   * @param {import('./session.js').Session} session - Session
   */
  inviteToSession(session) {
    this.addEvent({
      name: `Added to the ${sentenceCaseProgrammeName(session.name)}`,
      createdAt: session.openAt,
      createdBy_uid: session.createdBy_uid,
      programme_ids: session.programme_ids
    })
  }

  /**
   * Record reply
   *
   * @param {object} reply - Reply
   */
  addReply(reply) {
    if (!reply) {
      return
    }

    const { decision, fullName, invalid, relationship, uuid } = reply
    const isNew = !this.replies[uuid]
    const parent = new Parent({ fullName, relationship })
    const formattedParent = formatParent(parent, false)

    let name = `${decision} by ${formattedParent}`
    if (invalid) {
      name = `${decision} by ${formattedParent} marked as invalid`
    } else if (isNew) {
      name = `${decision} in response from ${formattedParent}`
    } else {
      name = `${decision} in updated response from ${formattedParent}`
    }

    this.reply_uuids.push(reply.uuid)
    this.addEvent({
      name,
      createdAt: isNew ? reply.createdAt : today(),
      createdBy_uid: reply.createdBy_uid,
      programme_ids: [reply.programme_id]
    })
  }

  /**
   * Record vaccination
   *
   * @param {import('./vaccination.js').Vaccination} vaccination - Vaccination
   */
  recordVaccination(vaccination) {
    this.vaccination_uuids.push(vaccination.uuid)

    let name
    if (vaccination.given) {
      name = vaccination.updatedAt
        ? `Vaccination record for ${vaccination.formatted.vaccine_snomed} updated`
        : `Vaccinated with ${vaccination.formatted.vaccine_snomed}`
    } else {
      name = `Unable to vaccinate: ${vaccination.outcome}`
    }

    this.addEvent({
      name,
      note: vaccination.note,
      createdAt: vaccination.updatedAt || vaccination.createdAt,
      createdBy_uid: vaccination.createdBy_uid,
      programme_ids: [vaccination.programme_id]
    })
  }

  /**
   * Save note
   *
   * @param {import('./audit-event.js').AuditEvent} event - Event
   */
  saveNote(event) {
    this.addEvent({
      type: AuditEventType.Record,
      name: event.name,
      note: event.note,
      createdBy_uid: event.createdBy_uid
    })
  }

  /**
   * Add notice
   *
   * @param {import('./notice.js').Notice} notice - Notice
   */
  addNotice(notice) {
    let name
    switch (true) {
      case notice.type === NoticeType.Deceased:
        // Update patient record with date of death
        this.dod = removeDays(today(), 5)
        name = `Record updated with child’s date of death`
        break
      case notice.type === NoticeType.NoNotify && this.parent1?.notify:
        // Notify request to not share vaccination with GP
        this.parent1.notify = false
        name = `Child gave consent for HPV and flu vaccinations under Gillick competence and does not want their parents to be notified.\n\nThese records are not automatically synced with GP records.\n\nYour team must let the child’s GP know they were vaccinated.`
        break
      case notice.type === NoticeType.Invalid:
        // Flag record as invalid
        this.invalid = true
        name = `Record flagged as invalid`
        break
      case notice.type === NoticeType.Sensitive:
        // Flag record as sensitive
        this.sensitive = true
        name = `Record flagged as sensitive`
        break
      default:
    }

    this.addEvent({
      type: AuditEventType.Notice,
      name,
      createdAt: notice.createdAt
    })
  }
}
