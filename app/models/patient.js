import { fakerEN_GB as faker } from '@faker-js/faker'
import _ from 'lodash'

import activity from '../datasets/activity.js'
import programmesData from '../datasets/programmes.js'
import schools from '../datasets/schools.js'
import {
  Adjustment,
  AuditEventType,
  Impairment,
  NoticeType,
  NotifyEmailStatus,
  PatientClinicStatus,
  VaccinationOutcome
} from '../enums.js'
import {
  AuditEvent,
  Child,
  Contact,
  Move,
  PatientProgramme,
  PatientSession,
  Reply,
  Vaccination
} from '../models.js'
import { getUpdatedFields } from '../utils/audit-event.js'
import { getDateValueDifference, removeDays, today } from '../utils/date.js'
import { tokenize } from '../utils/object.js'
import { getPreferredNames } from '../utils/reply.js'
import {
  formatLink,
  formatLinkWithSecondaryText,
  formatList,
  formatNhsNumber,
  formatOther,
  formatWithSecondaryText,
  stringToArray,
  stringToBoolean
} from '../utils/string.js'

/**
 * @typedef {object} PatientOptions
 * @property {string} [nhsn] - NHS number
 * @property {boolean} [invalid] - Flagged as invalid
 * @property {boolean} [sensitive] - Flagged as sensitive
 * @property {object} [address] - Address
 * @property {Partial<Child>} [pendingChanges] - Pending changes to record values
 * @property {ArchiveRecordReason} [archiveReason] - Archival reason
 * @property {string} [archiveReasonOther] - Other archival reason
 * @property {Array<string>} [clinicProgramme_ids] - Clinic programme invitations
 * @property {Array<AuditEvent>} [events] - Events
 * @property {Array<string>} [reply_uuids] - Reply IDs
 * @property {Array<string>} [contact_uuids] - Contact UUIDS
 * @property {Array<string>} [patientSession_uuids] - Patient session IDs
 * @property {Array<string>} [vaccination_uuids] - Vaccination UUIDs
 */

/**
 * @class Patient record
 * @augments Child
 */
export class Patient extends Child {
  /**
   * @param {PatientOptions & ChildOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    const invalid = stringToBoolean(options?.invalid)
    const sensitive = stringToBoolean(options?.sensitive)

    this.nhsn = options?.nhsn || this.nhsNumber
    this.invalid = invalid
    this.sensitive = sensitive
    this.address = !sensitive && options?.address ? options.address : undefined
    this.archiveReason = options?.archiveReason
    this.archiveReasonOther = options?.archiveReasonOther
    this.pendingChanges = options?.pendingChanges || {}

    this.clinicProgramme_ids = options?.clinicProgramme_ids || []
    this.events = options?.events || []
    this.reply_uuids = options?.reply_uuids || []
    this.contact_uuids = options?.contact_uuids || []
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
   * Has no contact details
   *
   * @returns {boolean} Has no contact details
   */
  get hasNoContactDetails() {
    return this.contacts.every((contact) => !contact.email && !contact.tel)
  }

  /**
   * Needs reasonable adjustments(s)
   *
   * @returns {boolean} Needs reasonable adjustments(s)
   */
  get hasAdjustment() {
    switch (this.adjustments.length) {
      case 0:
        return false
      case 1:
        return this.adjustments.at(0) !== Adjustment.None
      default:
        return true
    }
  }

  /**
   * Has impairment(s)
   *
   * @returns {boolean} Has impairment(s)
   */
  get hasImpairment() {
    switch (this.impairments.length) {
      case 0:
        return false
      case 1:
        return this.impairments.at(0) !== Impairment.None
      default:
        return true
    }
  }

  /**
   * When uploaded presents as a new record
   *
   * Use the presence of a second contact and no pending changes as a proxy
   *
   * @returns {boolean} Is a new patient record
   */
  get uploadIsNew() {
    return this.contacts[1] !== undefined && !this.hasPendingChanges
  }

  /**
   * When uploaded presents as a matching record
   *
   * Use the absence of a second contact and pending changes as a proxy
   *
   * @returns {boolean} Is a new patient record
   */
  get uploadHasMatch() {
    return !this.contacts[1] && !this.hasPendingChanges
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
   * Get contacts (from record and replies)
   *
   * @returns {Array<Contact>} Contacts
   */
  get contacts() {
    const contacts = new Map()

    if (!this.sensitive) {
      this.contact_uuids.forEach((uuid) =>
        contacts.set(uuid, Contact.findOne(uuid, this.context))
      )
    }

    // Add any new contacts found in consent replies
    Object.values(this.replies)
      .filter(({ selfConsent }) => !selfConsent)
      .filter(({ contact }) => contact)
      .forEach(({ contact }) => {
        contacts.set(contact.uuid, new Contact(contact))
      })

    return [...contacts.values()]
  }

  /**
   * Get child record events
   *
   * @returns {Array<AuditEvent>} Child record events
   */
  get recordEvents() {
    const recordEvents = []

    recordEvents.push(
      new AuditEvent({
        type: AuditEventType.Record,
        name: 'Child record imported',
        createdAt: new Date('2025-08-01T12:00:00')
      })
    )

    if (this.sensitive) {
      recordEvents.push(
        new AuditEvent({
          type: AuditEventType.Record,
          name: 'Record flagged as sensitive',
          createdAt: new Date('2025-08-01T12:00:00')
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
      .filter(({ type }) =>
        [AuditEventType.Record, AuditEventType.RecordNote].includes(type)
      )
      .sort((a, b) => getDateValueDifference(b.createdAt, a.createdAt))
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
   * @returns {Record<string, PatientProgramme>} Patient programmes
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

      // Patient invited to clinic if invitation sent
      patientProgramme.invitedToClinic = this.clinicProgramme_ids.includes(
        programme.id
      )

      programmes[programme.id] = patientProgramme
    }

    return programmes
  }

  /**
   * Get the IDs of programmes for which this patient can be invited to clinic
   *
   * @returns {Array<string>} the IDs of programmes for which this patient is clinic-ready
   */
  get clinicReadyProgramme_ids() {
    return Object.values(this.programmes)
      .filter(({ clinicStatus }) => clinicStatus === PatientClinicStatus.Ready)
      .map(({ programme_id }) => programme_id)
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
    const contactTokens = []
    for (const contact of this.contacts) {
      contactTokens.push(tokenize(contact, ['fullName', 'tel', 'email']))
    }

    const childTokens = tokenize(this, [
      'nhsn',
      'fullName',
      'postalCode',
      'school.name'
    ])

    return [childTokens, contactTokens].join(' ')
  }

  /**
   * Get formatted values
   *
   * @returns {object} Formatted values
   */
  get formatted() {
    return new Proxy(
      {},
      {
        get: (_target, prop) => {
          const getFormattedNhsn = () =>
            formatNhsNumber(this.nhsn, this.invalid)

          switch (prop) {
            case 'fullNameAndNhsn':
              return formatWithSecondaryText(this.fullName, getFormattedNhsn())
            case 'nhsn':
              return getFormattedNhsn()
            case 'newUrn':
              return (
                this.pendingChanges?.school_id &&
                schools[this.pendingChanges.school_id].name
              )
            case 'archiveReason':
              return formatOther(this.archiveReasonOther, this.archiveReason)
            case 'lastReminderDate':
              return this.lastReminderDate
                ? `Last reminder sent on ${this.lastReminderDate}`
                : 'No reminders sent'
            case 'clinicProgramme_ids':
              return this.clinicProgramme_ids
                .map((id) => this.programmes[id].programme.nameTag)
                .join(' ')
            case 'contacts':
              return formatList(
                this.contacts.map((contact) => contact.fullNameAndRelationship)
              )
            default:
              return super.formatted?.[prop]
          }
        }
      }
    )
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
   * @template {Child | Patient} PatientType
   * @param {PatientType} patient - Patient record
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
    // Sanitise any checkbox values in the updates
    if (updates?.clinicProgramme_ids) {
      updates.clinicProgramme_ids = stringToArray(updates.clinicProgramme_ids)
    }

    const updatedPatient = _.merge(Patient.findOne(uuid, context), updates)

    // Remove patient context
    delete updatedPatient.context

    // Delete original patient (with previous UUID)
    delete context.patients[uuid]

    // Update context
    context.patients[updatedPatient.uuid] = updatedPatient

    return updatedPatient
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
      name: activity.patient.archived(archive),
      note: archive.archiveReasonOther,
      type: AuditEventType.Record,
      createdBy_uid: archive.createdBy_uid
    })

    return archivedPatient
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
   * Add updates to activity log
   *
   * @param {Patient} before - Original values
   */
  addAuditRecord(before) {
    const updatedFields = getUpdatedFields(before, this)

    if (updatedFields.length) {
      this.addEvent({
        name: activity.patient.updated(),
        type: AuditEventType.Record,
        createdAt: today(),
        createdBy_uid: this.updatedBy_uid,
        updatedFields
      })
    }
  }

  /**
   * Add contact to patient
   *
   * @param {Contact} contact - Contact
   */
  addContact(contact) {
    this.contact_uuids.push(contact.uuid)

    this.addEvent({
      name: activity.patient.contact(contact),
      type: AuditEventType.Record
    })
  }

  /**
   * Add patient to session
   *
   * @param {PatientSession} patientSession - PatientSession
   */
  addToSession(patientSession) {
    this.patientSession_uuids.push(patientSession.uuid)

    patientSession = PatientSession.findOne(patientSession.uuid, this.context)

    if (patientSession?.session) {
      this.addEvent({
        name: activity.session.added(patientSession.session),
        type: AuditEventType.ProgrammeNote,
        createdAt: patientSession.session.openAt,
        createdBy_uid: patientSession.session.createdBy_uid,
        programme_ids: patientSession.session.programme_ids
      })
    }
  }

  /**
   * Invite contact to book a clinic appointment
   *
   * @param {Array<string>} programme_ids - The programmes for which the child's invited
   */
  inviteToClinic(programme_ids) {
    this.clinicProgramme_ids = [
      ...new Set(this.clinicProgramme_ids.concat(programme_ids))
    ]

    for (const contact of this.contacts) {
      this.addEvent({
        name: activity.notify['invite-clinic'](contact),
        type: AuditEventType.ProgrammeNote,
        messageRecipient: contact,
        messageTemplate: 'invite-clinic',
        patient_uuid: this.uuid,
        programme_ids: programme_ids
      })
    }
  }

  /**
   * Invite contact to give consent
   *
   * @param {PatientSession} patientSession - Patient session
   */
  requestConsent(patientSession) {
    for (const contact of this.contacts) {
      if (
        contact.email &&
        contact.emailStatus === NotifyEmailStatus.Delivered
      ) {
        this.addEvent({
          name: activity.notify.invite(contact),
          type: AuditEventType.ProgrammeNote,
          messageRecipient: contact,
          messageTemplate: 'invite',
          createdAt: patientSession.session.openAt,
          patient_uuid: this.uuid,
          programme_ids: patientSession.session.programme_ids,
          session_id: patientSession.session.id
        })
      }
    }
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

    const isNew = !this.replies[reply.uuid]

    let name
    if (reply.invalid) {
      name = activity.consent.invalid(reply)
    } else if (isNew) {
      name = activity.consent.created(reply)
    } else {
      name = activity.consent.updated(reply)
    }

    this.reply_uuids.push(reply.uuid)
    this.addEvent({
      name,
      type: AuditEventType.ProgrammeNote,
      createdAt: isNew ? reply.createdAt : today(),
      createdBy_uid: reply.createdBy_uid,
      programme_ids: [reply.programme_id]
    })
  }

  /**
   * Record vaccination
   *
   * @param {Vaccination} vaccination - Vaccination
   */
  recordVaccination(vaccination) {
    this.vaccination_uuids.push(vaccination.uuid)

    this.addEvent({
      name: activity.vaccination.recorded(vaccination),
      note: vaccination.note,
      type: AuditEventType.ProgrammeNote,
      createdAt: vaccination.updatedAt || vaccination.createdAt,
      createdBy_uid: vaccination.createdBy_uid,
      programme_ids: [vaccination.programme_id]
    })

    let messageTemplate
    switch (vaccination.outcome) {
      case VaccinationOutcome.Vaccinated:
      case VaccinationOutcome.PartVaccinated:
        messageTemplate = 'vaccination-given'
        break
      case VaccinationOutcome.AlreadyVaccinated:
        messageTemplate = 'vaccination-already-had'
        break
      case VaccinationOutcome.Absent:
      case VaccinationOutcome.DoNotVaccinate:
      case VaccinationOutcome.Refused:
      case VaccinationOutcome.Unwell:
        messageTemplate = 'vaccination-not-administered'
        break
      default:
        messageTemplate = 'vaccination-deleted'
    }

    for (const contact of this.contacts) {
      if (vaccination.outcome !== VaccinationOutcome.AlreadyVaccinated) {
        this.addEvent({
          name: activity.notify['vaccination-reminder'](contact),
          messageRecipient: contact,
          messageTemplate: 'vaccination-reminder',
          createdAt: removeDays(vaccination.createdAt, 7),
          patient_uuid: this.uuid,
          programme_ids: [vaccination.programme_id],
          session_id: vaccination.session.id
        })
      }

      this.addEvent({
        name: activity.notify[messageTemplate](contact),
        messageRecipient: contact,
        messageTemplate,
        createdAt: vaccination.updatedAt || vaccination.createdAt,
        patient_uuid: this.uuid,
        programme_ids: [vaccination.programme_id],
        session_id: vaccination.session?.id,
        vaccination_uuid: vaccination.uuid
      })
    }
  }

  /**
   * Save note
   *
   * @param {AuditEvent} event - Event
   */
  saveNote(event) {
    this.addEvent({
      name: activity.note.created(AuditEventType.RecordNote),
      note: event.note,
      type: AuditEventType.Record,
      createdBy_uid: event.createdBy_uid
    })
  }

  /**
   * Add notice
   *
   * @param {Notice} notice - Notice
   */
  addNotice(notice) {
    let name
    switch (true) {
      case notice.type === NoticeType.Deceased:
        // Update patient record with date of death
        this.dod = removeDays(today(), 5)
        name = `Record updated with child’s date of death`
        break
      case notice.type === NoticeType.NoNotify && this.contacts[0]?.notify:
        // Notify request to not share vaccination with GP
        this.contacts[0].notify = false
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

/**
 * @import { ArchiveRecordReason } from '../enums.js'
 * @import { Notice } from '../models.js'
 * @import { ChildOptions } from './child.js'
 */
