import { fakerEN_GB as faker } from '@faker-js/faker'

import activity from '../datasets/activity.js'
import programmesData from '../datasets/programmes.js'
import {
  Adjustment,
  AuditEventType,
  ClinicAppointmentStatus,
  Impairment,
  NoticeType,
  NotifyEmailStatus,
  PatientClinicStatus,
  SessionStatus,
  SessionType,
  VaccinationOutcome,
  VaccinationSource
} from '../enums.js'
import {
  AuditEvent,
  Child,
  ClinicAppointment,
  Contact,
  Instruction,
  Move,
  PatientProgramme,
  PatientSession,
  Reply,
  School,
  Vaccination
} from '../models.js'
import { getUpdatedFields } from '../utils/audit-event.js'
import {
  getAllAcademicYears,
  getCurrentAcademicYear,
  getDateValueDifference,
  removeDays,
  today
} from '../utils/date.js'
import { tokenize } from '../utils/object.js'
import {
  ConjunctionType,
  programmeNamesListForSentence
} from '../utils/programme.js'
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
 * @typedef {ChildOptions & object} PatientOptions
 * @property {string} [nhsn] - NHS number
 * @property {boolean} [isInvalid] - Flagged as invalid
 * @property {boolean} [isSensitive] - Flagged as sensitive
 * @property {object} [address] - Address
 * @property {Partial<Child>} [pendingChanges] - Pending changes to record values
 * @property {ArchiveRecordReason} [archiveReason] - Archival reason
 * @property {string} [archiveReasonOther] - Other archival reason
 * @property {Array<AuditEvent>} [events] - Events
 * @property {Array<Instruction>} [instructions] - PSD instruction UUIDs
 * @property {Array<string>} [clinicProgramme_ids] - Clinic programme invitations
 * @property {Array<string>} [contact_uuids] - Contact UUIDs
 * @property {Array<string>} [patientSession_uuids] - Patient session IDs
 * @property {Array<string>} [reply_uuids] - Reply IDs
 * @property {Array<string>} [vaccination_uuids] - Vaccination UUIDs
 */

/**
 * @class Patient record
 * @augments Child
 */
export class Patient extends Child {
  static contextKey = 'patients'
  static identifierKey = 'uuid'
  static ns = 'patient'

  /**
   * @param {PatientOptions} options - Options
   * @param {object} [context] - Context
   */
  constructor(options, context) {
    super(options, context)

    const isInvalid = stringToBoolean(options?.isInvalid)
    const isSensitive = stringToBoolean(options?.isSensitive)

    this.nhsn = options?.nhsn || this.nhsNumber
    this.isInvalid = isInvalid
    this.isSensitive = isSensitive
    this.address =
      !isSensitive && options?.address ? options.address : undefined
    this.archiveReason = options?.archiveReason
    this.archiveReasonOther = options?.archiveReasonOther
    this.pendingChanges = options?.pendingChanges || {}

    this.events = options?.events || []
    this.instructions = options?.instructions || []
    this.clinicProgramme_ids = stringToArray(options?.clinicProgramme_ids)
    this.contact_uuids = stringToArray(options?.contact_uuids)
    this.patientSession_uuids = stringToArray(options?.patientSession_uuids)
    this.reply_uuids = stringToArray(options?.reply_uuids)
    this.vaccination_uuids = stringToArray(options?.vaccination_uuids)
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
  get isNewUpload() {
    return this.contacts[1] !== undefined && !this.hasPendingChanges
  }

  /**
   * When uploaded presents as a matching record
   *
   * Use the absence of a second contact and pending changes as a proxy
   *
   * @returns {boolean} Is a new patient record
   */
  get hasMatchingUpload() {
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

    if (!this.isSensitive) {
      this.contact_uuids.forEach((uuid) =>
        contacts.set(uuid, Contact.findOne(uuid, this.context))
      )
    }

    // Add any new contacts found in consent replies
    Object.values(this.replies)
      .filter(({ hasSelfConsent }) => !hasSelfConsent)
      .filter(({ contact }) => contact)
      .forEach(({ contact }) => {
        contacts.set(contact.uuid, new Contact(contact))
      })

    // Add any contacts found in clinic appointments
    this.appointments
      .filter(({ contact }) => contact)
      .filter(({ status }) =>
        [
          ClinicAppointmentStatus.Booked,
          ClinicAppointmentStatus.Cancelled
        ].includes(status)
      )
      .forEach(({ contact }) =>
        contacts.set(contact.uuid, new Contact(contact))
      )

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

    if (this.isSensitive) {
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
      (programme) => !programme.isHidden
    )) {
      if (programme.isSeasonal) {
        for (const academicYear of getAllAcademicYears()) {
          const previousPatientProgramme = new PatientProgramme(
            {
              academicYear,
              patient_uuid: this.uuid,
              programme_id: programme.id
            },
            this.context
          )

          programmes[previousPatientProgramme.id] = previousPatientProgramme
        }
      } else {
        const patientProgramme = new PatientProgramme(
          {
            academicYear: getCurrentAcademicYear(),
            patient_uuid: this.uuid,
            programme_id: programme.id
          },
          this.context
        )

        // Patient invited to clinic if invitation sent
        patientProgramme.wasInvitedToClinic = this.clinicProgramme_ids.includes(
          programme.id
        )

        programmes[patientProgramme.id] = patientProgramme
      }
    }

    return programmes
  }

  /**
   * Get active patient programmes
   *
   * @returns {Record<string, PatientProgramme>} Active patient programmes
   */
  get activeProgrammes() {
    return Object.fromEntries(
      Object.entries(this.programmes).filter(
        ([, programme]) => programme.isActive
      )
    )
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
   * Get clinic appointments
   *
   * @returns {Array<ClinicAppointment>} Appointments
   */
  get appointments() {
    return ClinicAppointment.findAll(this.context).filter(
      (appointment) => appointment?.patient_uuid === this.uuid
    )
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
   * Get vaccinations recorded in service
   *
   * @returns {Array<Vaccination>} Vaccinations recorded in service
   */
  get recordedVaccinations() {
    if (this.context?.vaccinations && this.vaccination_uuids) {
      return this.vaccination_uuids.map(
        (uuid) =>
          new Vaccination(this.context?.vaccinations[uuid], this.context)
      )
    }

    return []
  }

  /**
   * Get vaccinations recorded off service
   *
   * @returns {Array<Vaccination>} Vaccinations recorded off service
   */
  get importedVaccinations() {
    return Vaccination.findAll(this.context).filter(
      (vaccination) =>
        vaccination.patient_uuid === this.uuid &&
        vaccination.source !== VaccinationSource.Service
    )
  }

  /**
   * Get all vaccinations
   *
   * @returns {Array<Vaccination>} All vaccinations
   */
  get vaccinations() {
    return [...this.recordedVaccinations, ...this.importedVaccinations]
  }

  /**
   * Record is archived
   *
   * @returns {boolean} Record is archived
   */
  get isArchived() {
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
            formatNhsNumber(this.nhsn, this.isInvalid)

          switch (prop) {
            case 'fullNameAndNhsn':
              return formatWithSecondaryText(this.fullName, getFormattedNhsn())
            case 'nhsn':
              return getFormattedNhsn()
            case 'newUrn':
              return School.findOne(this.pendingChanges.school_id, this.context)
                ?.name
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
            case 'upcomingAppointments': {
              const appointmentDetails = this.appointments
                .filter((appointment) =>
                  [SessionStatus.Planned, SessionStatus.Active].includes(
                    appointment.session.status
                  )
                )
                .map((appointment) => {
                  const session = appointment.session
                  return formatWithSecondaryText(
                    `${session.location.name} on ${session.formatted.dateShort}`,
                    `For ${appointment.formatted.programmeNames}`,
                    true
                  )
                })
              return appointmentDetails.length
                ? formatList(appointmentDetails)
                : 'None'
            }
            case 'upcomingSchoolSessions': {
              const schoolPatientSessions = this.patientSessions.filter(
                (patientSession) => {
                  const session = patientSession.session
                  return (
                    session.type === SessionType.School &&
                    [SessionStatus.Planned, SessionStatus.Active].includes(
                      session.status
                    )
                  )
                }
              )
              if (schoolPatientSessions.length === 0) {
                return 'None'
              }
              const bySession = Object.groupBy(
                schoolPatientSessions,
                (patientSession) => patientSession.session_id
              )
              return formatList(
                Object.values(bySession).map((patientSessions) => {
                  const session = patientSessions[0].session
                  const sessionDetails = `${session.location.name} on ${session.formatted.dateShort}`
                  const programme_ids = patientSessions.map(
                    ({ programme_id }) => programme_id
                  )
                  const programmeNames = programmeNamesListForSentence(
                    programme_ids,
                    this.canBeOfferedMmrv,
                    ConjunctionType.and,
                    this.context
                  )
                  return formatWithSecondaryText(
                    sessionDetails,
                    `For ${programmeNames}`
                  )
                })
              )
            }
            default:
              return super.formatted?.[prop]
          }
        }
      }
    )
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
   * Archive
   *
   * @param {string} uuid - Patient record UUID
   * @param {object} archive - Archive details
   * @param {object} context - Context
   * @returns {Patient} Archived patient record
   * @static
   */
  static archive(uuid, archive, context) {
    const archivedPatient = /** @type {Patient} */ (
      super.update(uuid, archive, context)
    )

    archivedPatient.addEvent({
      name: activity.patient.archived(archive),
      note: archive.archiveReasonOther,
      type: AuditEventType.Record,
      createdBy_uid: archive.createdBy_uid
    })

    return archivedPatient
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
   * Add event to activity log
   *
   * @param {Partial<AuditEvent>} event - Event
   */
  addEvent(event) {
    this.events.push(new AuditEvent(event))
  }

  /**
   * Add PSD instruction
   *
   * @param {Partial<Instruction>} instruction - PSD instruction
   */
  addInstruction(instruction) {
    this.instructions.push(new Instruction(instruction))
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
        createdAt: patientSession.session.consentOpenAt,
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
          createdAt: patientSession.session.consentOpenAt,
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
   * @param {Reply} reply - Reply
   */
  addReply(reply) {
    if (!reply) {
      return
    }

    const isNew = !this.replies[reply.uuid]

    let name
    if (reply.isInvalidated) {
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
        messageTemplate = 'vaccination-not-given-absent'
        break
      case VaccinationOutcome.DoNotVaccinate:
        messageTemplate =
          'vaccination-not-given-contraindicated-do-not-vaccinate'
        break
      case VaccinationOutcome.Refused:
        messageTemplate = 'vaccination-not-given-refused'
        break
      case VaccinationOutcome.Unwell:
        messageTemplate = 'vaccination-not-given-unwell'
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
          session_id: vaccination.session_id
        })
      }

      this.addEvent({
        name: activity.notify[messageTemplate](contact),
        messageRecipient: contact,
        messageTemplate,
        createdAt: vaccination.updatedAt || vaccination.createdAt,
        patient_uuid: this.uuid,
        programme_ids: [vaccination.programme_id],
        session_id: vaccination.session_id,
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
      case notice.type === NoticeType.NoNotify && this.contacts[0]?.canNotify:
        // Notify request to not share vaccination with GP
        this.contacts[0].canNotify = false
        name = `Child gave consent for HPV and flu vaccinations under Gillick competence and does not want their parents to be notified.\n\nThese records are not automatically synced with GP records.\n\nYour team must let the child’s GP know they were vaccinated.`
        break
      case notice.type === NoticeType.Invalid:
        // Flag record as invalid
        this.isInvalid = true
        name = `Record flagged as invalid`
        break
      case notice.type === NoticeType.Sensitive:
        // Flag record as sensitive
        this.isSensitive = true
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
