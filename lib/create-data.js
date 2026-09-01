import process from 'node:process'

import { faker } from '@faker-js/faker'
import { addMinutes, isSameDay } from 'date-fns'

import clinicsData from '../app/datasets/clinics.js'
import programmesData from '../app/datasets/programmes.js'
import schoolsData from '../app/datasets/schools.js'
import teamsData from '../app/datasets/teams.js'
import usersData from '../app/datasets/users.js'
import vaccinesData from '../app/datasets/vaccines.js'
import {
  ArchiveRecordReason,
  ConsentWindow,
  MoveSource,
  NoticeType,
  ProgrammeType,
  RegistrationStatus,
  ReplyDecision,
  ReplyMethod,
  SchoolPhase,
  ScreenStatus,
  SessionPresets,
  SessionType,
  SchoolStatus,
  UploadType
} from '../app/enums.js'
import { generateBatch } from '../app/generators/batch.js'
import { generateChild } from '../app/generators/child.js'
import {
  decideClinicVaccinationChoices,
  generateClinicAppointment
} from '../app/generators/clinic-appointment.js'
import { generateEmptyClinicBooking } from '../app/generators/clinic-booking.js'
import { generateClinicVaccinationPeriods } from '../app/generators/clinic-vaccination-periods.js'
import { generateConsent } from '../app/generators/consent.js'
import { generateContact } from '../app/generators/contact.js'
import { generateInstruction } from '../app/generators/instruction.js'
import { generateNotice } from '../app/generators/notice.js'
import { generatePatient } from '../app/generators/patient.js'
import { generatePDSRecord } from '../app/generators/pds-record.js'
import { generateSession } from '../app/generators/session.js'
import { generateTeam } from '../app/generators/team.js'
import { generateUpload } from '../app/generators/upload.js'
import {
  generateVaccination,
  generateTetanusVaccination
} from '../app/generators/vaccination.js'
import {
  Batch,
  Clinic,
  ClinicBooking,
  Consent,
  Contact,
  Gillick,
  Move,
  Notice,
  Patient,
  PatientSession,
  PDSRecord,
  Programme,
  Reply,
  School,
  Session,
  Team,
  Upload,
  User,
  Vaccination
} from '../app/models.js'
import {
  formatDate,
  getDateValueDifference,
  removeDays,
  today
} from '../app/utils/date.js'
import { range } from '../app/utils/number.js'

import { generateDataFile } from './generate-data-file.js'

// Settings
const totalTeams = Number(process.env.TEAMS) || 5
const totalBatches = Number(process.env.BATCHES) || 100
const totalPatients = Number(process.env.RECORDS) || 4000

// Context
const context = {}

// Users
context.users = {}
for (const user of usersData) {
  User.create(user, context)
}

// Nurse users
const nurse = User.findAll(context).find((user) => user.isRegisteredNurse)

// Teams
context.teams = {}
range(1, totalTeams).forEach(() => {
  const team = generateTeam()
  Team.create(team, context)
})

// Pre-defined teams
for (const team of teamsData) {
  Team.create(team, context)
}

// Clinics
context.clinics = {}
for (const clinic of clinicsData) {
  Clinic.create(clinic, context)
}

// Schools
context.schools = {}
for (const school of schoolsData) {
  School.create(school, context)
}

// Vaccines
context.vaccines = vaccinesData

// Batches
context.batches = {}
range(1, totalBatches).forEach(() => {
  const batch = generateBatch()
  Batch.create(batch, context)
})

// Contacts
context.contacts = {}

// Patients
context.patients = {}
range(1, totalPatients).forEach(() => {
  const child = generateChild(context.schools)
  const patient = generatePatient(child)

  // Contacts
  const contact1 = generateContact(patient, true)
  Contact.create(contact1, context)
  patient.contact_uuids.push(contact1.uuid)

  if (faker.datatype.boolean(0.5)) {
    const contact2 = generateContact(patient)
    Contact.create(contact2, context)
    patient.contact_uuids.push(contact2.uuid)
  }

  Patient.create(patient, context)
})

// PDS records
context.pdsRecords = {}
range(1, 20).forEach(() => {
  const child = generateChild(context.schools)
  const pdsRecord = generatePDSRecord(child)

  // Contacts
  const contact1 = generateContact(pdsRecord, true)
  Contact.create(contact1, context)
  pdsRecord.contact_uuids.push(contact1.uuid)

  if (faker.datatype.boolean(0.5)) {
    const contact2 = generateContact(pdsRecord)
    Contact.create(contact2, context)
    pdsRecord.contact_uuids.push(contact2.uuid)
  }

  PDSRecord.create(pdsRecord, context)
})

// Programmes
context.programmes = {}
for (const programme of Object.values(programmesData)) {
  Programme.create(programme, context)
}

// Uploads
context.uploads = {}

// Add cohort upload
const patient_uuids = Patient.findAll(context).flatMap(({ uuid }) => uuid)
const cohortUpload = generateUpload(patient_uuids, nurse, UploadType.Cohort)
Upload.create(cohortUpload, context)

// Add class list uploads
for (const school of School.findAll(context)) {
  const patient_uuids = Patient.findAll(context)
    .filter(({ school_id }) => school_id === school.id)
    .map(({ uuid }) => uuid)

  const schoolUpload = generateUpload(
    patient_uuids,
    nurse,
    UploadType.School,
    school
  )
  Upload.create(schoolUpload, context)
}

// Sessions
context.sessions = {}
for (const preset of Object.values(SessionPresets)) {
  // Schedule school sessions
  if (!preset.clinicOnly) {
    const ids = School.findAll(context)
      .filter(({ status }) => status !== SchoolStatus.Closed)
      .filter(({ phase }) =>
        // Adolescent programmes are only held at secondary schools
        preset.adolescent ? phase === SchoolPhase.Secondary : phase
      )
      .map(({ id }) => id)

    // Schedule school sessions
    for (const school_id of ids) {
      const schoolSession = generateSession(preset, nurse, { school_id })
      if (schoolSession) {
        Session.create(schoolSession, context)
      }
    }
  }

  // Schedule clinic sessions
  if (preset.clinicOnly) {
    const clinicsPerPreset = 3
    const clinic_ids = faker.helpers.arrayElements(
      Team.findAll(context).flatMap((team) =>
        team.clinics.map((clinic) => clinic.id)
      ),
      clinicsPerPreset
    )
    for (const clinic_id of clinic_ids) {
      const clinicSession = generateSession(preset, nurse, { clinic_id })
      if (clinicSession) {
        generateClinicVaccinationPeriods(clinicSession)
        Session.create(clinicSession, context)
      }
    }
  }
}

// Ensure at least one school session is scheduled for today
const earliestPlannedSchoolSession = Session.findAll(context)
  .sort((a, b) => getDateValueDifference(a.consentOpenAt, b.consentOpenAt))
  .find((session) => session.isPlanned && session.school_id)

const hasSchoolSessionToday = isSameDay(
  earliestPlannedSchoolSession?.date,
  today()
)

if (!hasSchoolSessionToday && earliestPlannedSchoolSession) {
  context.sessions[earliestPlannedSchoolSession.id].date = today()
}

// Ensure at least one clinic session is scheduled for today
const earliestPlannedClinicSession = Session.findAll(context).find(
  (session) => session.isPlanned && session.clinic_id
)

const hasClinicSessionToday = isSameDay(
  earliestPlannedClinicSession?.date,
  today()
)

if (!hasClinicSessionToday && earliestPlannedClinicSession) {
  context.sessions[earliestPlannedClinicSession.id].date = today()
}

// Invite
// TODO: Don’t invite patients who’ve already had a programme’s vaccination
context.patientSessions = {}
for (const session of Session.findAll(context).filter(
  ({ type }) => type === SessionType.School
)) {
  const patientsInsideSchool = Patient.findAll(context).filter(
    ({ school_id }) => school_id === session.school_id
  )

  for (const patient of patientsInsideSchool) {
    for (const programme_id of session.programme_ids) {
      const { canInviteToSession } = patient.programmes[programme_id]

      if (canInviteToSession) {
        const patientSession = new PatientSession(
          {
            createdAt: session.consentOpenAt,
            patient_uuid: patient.uuid,
            programme_id,
            session_id: session.id
          },
          context
        )

        // Add patient to session
        patient.addToSession(patientSession)

        // 2️⃣🅰️ REQUEST CONSENT
        patient.requestConsent(patientSession)
        PatientSession.create(patientSession, context)
      }
    }
  }
}

// Consent
context.replies = {}
for (const patientSession of PatientSession.findAll(context)) {
  const { patient, session } = patientSession

  let getConsentForPatient
  switch (true) {
    // Can’t get consent if have no contact details
    case !patient.hasContactDetails:
      getConsentForPatient = false
      break
    // Children over 16 years old don’t need parental consent
    case patient.isPost16:
      getConsentForPatient = false
      break
    // Session may not have a schedule assigned to it yet
    case session.isUnplanned:
      getConsentForPatient = false
      break
    // Session’s consent window is not open yet, so no requests have been sent
    case session.consentWindow === ConsentWindow.Opening:
      getConsentForPatient = false
      break
    // Session’s consent window has closed, so greater likelihood of a response
    case session.consentWindow === ConsentWindow.Closed:
      getConsentForPatient = faker.datatype.boolean(0.95)
      break
    default:
      getConsentForPatient = faker.datatype.boolean(0.75)
  }

  if (getConsentForPatient) {
    const maxReplies = faker.helpers.weightedArrayElement([
      { value: 0, weight: 0.7 },
      { value: 1, weight: 0.3 }
    ])
    let lastConsentCreatedAt
    range(0, maxReplies).forEach((_, index) => {
      const contact = generateContact(patient, index === 0)
      Contact.create(contact, context)

      let consent = generateConsent(
        patientSession,
        contact,
        lastConsentCreatedAt
      )
      consent = new Consent(consent, context)
      lastConsentCreatedAt = consent.createdAt

      if (consent?.child?.dob) {
        const matchReplyWithPatient = faker.datatype.boolean(0.95)
        if (!matchReplyWithPatient && session.isPlanned) {
          // Set the date of birth to have the incorrect year
          const dob = new Date(consent.child.dob)
          dob.setFullYear(dob.getFullYear() - 2)
          consent.child.dob = dob
        } else {
          // 3️⃣ GET CONSENT and link reply with patient record
          consent.linkToPatient(patient)
        }
        Consent.create(consent, context)
      }
    })
  }
}

// Screen and record
context.vaccinations = {}
for (const patientSession of PatientSession.findAll(context)) {
  // Screen answers to health questions
  if (patientSession.patientProgramme.screen === ScreenStatus.NeedsTriage) {
    // Get triage notes
    for (const response of patientSession.patientProgramme
      .repliesWithTriageNotes) {
      const triaged = faker.datatype.boolean(0.5)
      if (triaged) {
        let status = faker.helpers.weightedArrayElement([
          { value: ScreenStatus.NeedsTriage, weight: 4 },
          { value: ScreenStatus.InvitedToClinic, weight: 1 },
          { value: ScreenStatus.DelayVaccination, weight: 1 },
          { value: ScreenStatus.DoNotVaccinate, weight: 1 },
          { value: ScreenStatus.Vaccinate, weight: 2 }
        ])

        // For programmes that offer alternative vaccine methods, we use
        // screening statuses specific to each vaccine method
        if (status === ScreenStatus.Vaccinate) {
          if (patientSession.programme.alternativeVaccine) {
            status = patientSession.patientProgramme
              .hasConsentForAlternativeInjectionOnly
              ? patientSession.programme.type === ProgrammeType.Flu
                ? ScreenStatus.VaccinateAlternativeFluInjectionOnly
                : ScreenStatus.VaccinateAlternativeMMRInjectionOnly
              : ScreenStatus.VaccinateIntranasalOnly
          }
        }

        let note = response.triageNote

        switch (status) {
          case ScreenStatus.NeedsTriage:
            note = 'Keep in triage until can contact GP.'
            break
          case ScreenStatus.DelayVaccination:
            note = 'Delay vaccination until later session.'
            break
          case ScreenStatus.DoNotVaccinate:
            note = 'Decided to not vaccinate at this time.'
            break
        }

        // 4️⃣ SCREEN with triage status (initial)
        patientSession.patientProgramme.recordTriage({
          status,
          note,
          createdAt: response.createdAt,
          createdBy_uid: nurse.uid
        })
      }
    }
  }

  const { patient, patientProgramme, session } = patientSession

  // Add instruction to completed sessions
  if (session.isCompleted) {
    if (session.hasPsdProtocol && patientProgramme.canBulkInstruct) {
      const instruction = generateInstruction(patientSession, nurse)

      // GIVE INSTRUCTION for PSD
      patientProgramme.giveInstruction(instruction)
    }
  }

  // Add vaccination outcome
  if (session.isCompleted) {
    // Ensure any outstanding triage has been completed
    if (patientSession.patientProgramme.screen === ScreenStatus.NeedsTriage) {
      // 4️⃣ SCREEN with triage status (final)
      patientSession.patientProgramme.recordTriage({
        status: ScreenStatus.Vaccinate,
        note: 'Spoke to GP, safe to vaccinate.',
        createdAt: removeDays(session.date, 2),
        createdBy_uid: nurse.uid
      })
    }

    for (const programme of session.programmes) {
      if (
        patientSession.patientProgramme.vaccine &&
        patientSession.patientProgramme.canRecordVaccinationInSession
      ) {
        const batch = Batch.findAll(context)
          .filter(
            ({ vaccine_snomed }) =>
              vaccine_snomed === patientSession.patientProgramme.vaccine.snomed
          )
          .find(({ archivedAt }) => archivedAt)
        let vaccination = generateVaccination(
          patientSession,
          programme,
          batch,
          nurse
        )
        vaccination = Vaccination.create(vaccination, context)

        const vaccinatedInSchool = faker.datatype.boolean(0.8)
        if (vaccinatedInSchool) {
          // REGISTER attendance (10 minutes before vaccination)
          patientSession.registerAttendance(
            {
              createdAt: addMinutes(vaccination.createdAt, -10),
              createdBy_uid: nurse.uid
            },
            RegistrationStatus.Present
          )

          // PRE-SCREEN (5 minutes before vaccination)
          patientSession.preScreen({
            createdAt: addMinutes(vaccination.createdAt, -5),
            createdBy_uid: nurse.uid
          })

          // 5️⃣ RECORD vaccination outcome
          patient.recordVaccination(vaccination)
        }
      }
    }
  }
}

// Clinic invites
// for children who are clinic ready e.g. home-educated or missed school session, but
// only do it for half of the schools (so we leave some children in the clinic-ready state)
const invited_school_ids = new Set([
  ...Object.keys(context.schools).filter((_, index) => index % 2 === 0),
  '888888',
  '999999'
])
for (const patient of Patient.findAll(context)) {
  // Skip this school to avoid inviting everyone?
  if (!invited_school_ids.has(patient.school_id)) {
    continue
  }
  const clinicReadyProgramme_ids = patient.clinicReadyProgramme_ids

  // Invite to book a clinic appointment...
  if (clinicReadyProgramme_ids.length) {
    patient.inviteToClinic(clinicReadyProgramme_ids)
    Patient.update(patient.uuid, patient, context)
  }
}

// Clinic appointments
//   To prevent us just filling every possible clinic slot, decide how full we want each clinic to get
const clinicSessions = Session.findAll(context).filter(
  ({ type }) => type === SessionType.Clinic
)
const clinicTargets = new Map(
  clinicSessions.map((session) => [
    session,
    faker.number.int({ min: 30, max: 100 })
  ])
)
context.clinicBookings = {}
for (const patient of Patient.findAll(context)) {
  // Exclude anyone not invited to clinic yet
  if (!patient.clinicProgramme_ids?.length) {
    continue
  }

  // Decide what this appointment will cover before choosing a session, so we
  // know how long it'll be and can find a session (and slot) with room for it
  const vaccinationChoices = decideClinicVaccinationChoices(patient)

  // Choose a clinic session in which we'll book an appointment, keeping hold of the
  // bookable start times we find for each, so we don't have to work them out again
  const bookableStartTimesBySession = new Map()
  const matchingClinicSessions = clinicSessions.filter((session) => {
    const matchingProgramme_ids = [
      ...new Set(patient.clinicProgramme_ids).intersection(
        new Set(session.programme_ids)
      )
    ]

    if (!matchingProgramme_ids.length) {
      return false
    }

    if (session.percentBooked >= clinicTargets.get(session)) {
      return false
    }

    const bookableStartTimes =
      session.bookableSlotStartTimesFor(vaccinationChoices)
    if (bookableStartTimes.length === 0) {
      return false
    }

    bookableStartTimesBySession.set(session, bookableStartTimes)
    return true
  })
  if (!matchingClinicSessions.length) {
    continue
  }
  const session = faker.helpers.arrayElement(matchingClinicSessions)
  const startAt = faker.helpers.arrayElement(
    bookableStartTimesBySession.get(session)
  )

  // Create a single child's appointment and containing booking
  // TODO: find or create siblings to add as well
  const clinicBooking = generateEmptyClinicBooking(context)
  const appointment = generateClinicAppointment(
    patient,
    session,
    clinicBooking,
    vaccinationChoices,
    startAt
  )

  // Store the booking on the context
  ClinicBooking.create(clinicBooking, context)

  // If we’ve matched the child, formally add them to the session (otherwise
  // the appointment will appear as an unmatched appointment)
  if (appointment.patient) {
    // Create a patient session for each programme being vaccinated, assuming
    // child will be vaccinated for everything for which they’re clinic-ready
    appointment.patient.clinicProgramme_ids.forEach((programme_id) => {
      const patientSession = new PatientSession(
        {
          patient_uuid: appointment.patient.uuid,
          programme_id,
          session_id: session.id
        },
        context
      )

      appointment.patient.addToSession(patientSession)

      PatientSession.create(patientSession, context)
    })
  }
}

// Add historic tetanus vaccinations
for (const patient of Patient.findAll(context)) {
  const tetanusDose1 = generateTetanusVaccination(patient, '5in1', '1P')
  const tetanusDose2 = generateTetanusVaccination(patient, '5in1', '2P')
  const tetanusDose3 = generateTetanusVaccination(patient, '5in1', '3P')
  const tetanusDose4 = generateTetanusVaccination(patient, '4in1', '1B')

  Vaccination.create(tetanusDose1, context)
  Vaccination.create(tetanusDose2, context)
  Vaccination.create(tetanusDose3, context)
  Vaccination.create(tetanusDose4, context)
}

// Add vaccination upload for vaccinations administered in each programme
for (const programme of Programme.findAll(context)) {
  const programmeVaccinations = Vaccination.findAll(context).filter(
    ({ programme_id }) => programme_id === programme.id
  )

  const patient_uuids = []
  programmeVaccinations.forEach(({ patientSession_uuid }) => {
    const hasPatientSession = context.patientSessions[patientSession_uuid]
    if (hasPatientSession) {
      const patientSession = context.patientSessions[patientSession_uuid]
      patient_uuids.push(patientSession.patient_uuid)
    }
  })
  if (patient_uuids.length > 0) {
    const vaccinationUpload = generateUpload(
      patient_uuids,
      nurse,
      UploadType.Report
    )
    Upload.create(vaccinationUpload, context)
  }
}

// Add moves
context.moves = {}
let matchingIndex = 0
for (const patient of Patient.findAll(context)) {
  if (patient?.pendingChanges?.school_id) {
    Move.create(
      {
        source: MoveSource.Cohort,
        team_id:
          matchingIndex === 0 ? Team.findAll(context)[0].code : undefined,
        from_urn: patient.school_id,
        to_urn: patient?.pendingChanges?.school_id,
        patient_uuid: patient.uuid
      },
      context
    )
    matchingIndex++
  }
}

// Add notices
context.notices = {}

// Flag patient as having died
const deceasedPatient = Patient.findAll(context)[0]
const deceasedNotice = generateNotice(deceasedPatient, NoticeType.Deceased)
Notice.create(deceasedNotice, context)
deceasedPatient.addNotice(deceasedNotice)

// Archive deceased patient
Patient.archive(
  deceasedPatient.uuid,
  {
    archiveReason: ArchiveRecordReason.Deceased,
    createdBy_uid: nurse.uid
  },
  context
)

// Remove patient from any sessions
for (const patientSession of deceasedPatient.patientSessions) {
  patientSession.removeFromSession({
    createdBy_uid: nurse.uid
  })
}

// Flag patient record as invalid
const invalidPatient = Patient.findAll(context)[1]
if (invalidPatient) {
  const invalidNotice = generateNotice(invalidPatient, NoticeType.Invalid)
  Notice.create(invalidNotice, context)
  invalidPatient.addNotice(invalidNotice)
}

// Flag patient record as sensitive
const sensitivePatient = Patient.findAll(context)[2]
if (sensitivePatient) {
  const sensitiveNotice = generateNotice(sensitivePatient, NoticeType.Sensitive)
  Notice.create(sensitiveNotice, context)
  sensitivePatient.addNotice(sensitiveNotice)
}

// Flag patient record as not wanting vaccination to be shared with GP
let vaccinatedPatient = Patient.findAll(context).find(
  (patient) => patient.vaccination_uuids.length > 0
)
if (vaccinatedPatient) {
  for (const patientSession of vaccinatedPatient.patientSessions) {
    // Check for a given consent response
    const givenConsentReply = patientSession.patientProgramme.replies.find(
      (reply) => reply.decision === ReplyDecision.Given
    )

    if (givenConsentReply) {
      // Add Gillick assessment
      patientSession.gillick = new Gillick({
        q1: true,
        q2: true,
        q3: true,
        q4: true,
        q5: true
      })

      // Update patient session
      PatientSession.update(patientSession.uuid, patientSession, context)

      // Update existing consent response to be self-consent from the child
      givenConsentReply.method = ReplyMethod.InPerson
      givenConsentReply.hasSelfConsent = true

      // Update consent response
      Reply.update(givenConsentReply.uuid, givenConsentReply, context)

      // Generate notice and add to patient record
      const hiddenNotice = generateNotice(
        vaccinatedPatient,
        NoticeType.NoNotify
      )
      Notice.create(hiddenNotice, context)

      vaccinatedPatient.addNotice(hiddenNotice)
    }
  }
}

// Generate date files
generateDataFile('.data/batches.json', context.batches)
generateDataFile('.data/clinic-bookings.json', context.clinicBookings)
generateDataFile('.data/clinics.json', context.clinics)
generateDataFile('.data/contacts.json', context.contacts)
generateDataFile('.data/moves.json', context.moves)
generateDataFile('.data/notices.json', context.notices)
generateDataFile('.data/patients.json', context.patients)
generateDataFile('.data/patient-sessions.json', context.patientSessions)
generateDataFile('.data/pds-records.json', context.pdsRecords)
generateDataFile('.data/programmes.json', context.programmes)
generateDataFile('.data/replies.json', context.replies)
generateDataFile('.data/schools.json', context.schools)
generateDataFile('.data/sessions.json', context.sessions)
generateDataFile('.data/teams.json', context.teams)
generateDataFile('.data/uploads.json', context.uploads)
generateDataFile('.data/users.json', context.users)
generateDataFile('.data/vaccinations.json', context.vaccinations)

// Show information about generated data
console.info(
  `Data generated for today, ${formatDate(today(), { dateStyle: 'long' })}`
)
