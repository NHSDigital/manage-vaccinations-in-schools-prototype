import process from 'node:process'

import { faker } from '@faker-js/faker'
import { addMinutes, isSameDay } from 'date-fns'
import 'dotenv/config'

import clinicsData from '../app/datasets/clinics.js'
import programmesData from '../app/datasets/programmes.js'
import schoolsData from '../app/datasets/schools.js'
import teamsData from '../app/datasets/teams.js'
import usersData from '../app/datasets/users.js'
import vaccinesData from '../app/datasets/vaccines.js'
import {
  ArchiveRecordReason,
  ConsentOutcome,
  ConsentWindow,
  PatientStatus,
  ProgrammeType,
  NoticeType,
  MoveSource,
  RegistrationOutcome,
  SchoolPhase,
  ScreenOutcome,
  SessionPresets,
  SessionType,
  UploadType,
  UserRole,
  ReplyDecision,
  ReplyMethod
} from '../app/enums.js'
import { generateBatch } from '../app/generators/batch.js'
import { generateClinicAppointment } from '../app/generators/clinic-appointment.js'
import { generateEmptyClinicBooking } from '../app/generators/clinic-booking.js'
import { generateClinicVaccinationPeriods } from '../app/generators/clinic-vaccination-periods.js'
import { generateConsent } from '../app/generators/consent.js'
import { generateInstruction } from '../app/generators/instruction.js'
import { generateNotice } from '../app/generators/notice.js'
import { generateParent } from '../app/generators/parent.js'
import { generatePatient } from '../app/generators/patient.js'
import { generatePDSRecord } from '../app/generators/pds-record.js'
import { generateSession } from '../app/generators/session.js'
import { generateTeam } from '../app/generators/team.js'
import { generateUpload } from '../app/generators/upload.js'
import { generateUser } from '../app/generators/user.js'
import { generateVaccination } from '../app/generators/vaccination.js'
import {
  Clinic,
  Gillick,
  Instruction,
  Move,
  PatientSession,
  Patient,
  Programme,
  School,
  Session,
  Team,
  User,
  Vaccination
} from '../app/models.js'
import {
  getDateValueDifference,
  formatDate,
  removeDays,
  today,
  getCurrentAcademicYear
} from '../app/utils/date.js'
import { range } from '../app/utils/number.js'

import { generateDataFile } from './generate-data-file.js'

// Settings
const totalUsers = Number(process.env.USERS) || 20
const totalTeams = Number(process.env.TEAMS) || 5
const totalBatches = Number(process.env.BATCHES) || 100
const totalClinicBookings = Number(process.env.CLINIC_BOOKINGS) || 10
const totalPatients = Number(process.env.RECORDS) || 4000

// Context
const context = {}

// Users
context.users = {}
Array.from([...range(0, totalUsers)]).forEach(() => {
  const user = generateUser()
  context.users[user.uid] = user
})

// Pre-defined users
for (const user of usersData) {
  context.users[user.uid] = new User(user)
}

// Nurse users
const nurses = Object.values(context.users).filter(
  (user) => user.role === UserRole.Nurse
)
const nurse = nurses[0]

// Teams
context.teams = {}
Array.from([...range(0, totalTeams)]).forEach(() => {
  const team = generateTeam()
  context.teams[team.id] = team
})

// Pre-defined teams
for (const team of teamsData) {
  context.teams[team.id] = new Team(team)
}

// Clinics
context.clinics = {}
for (const clinic of Object.values(clinicsData)) {
  context.clinics[clinic.id] = new Clinic(clinic)
}

// Schools
context.schools = {}
for (const school of Object.values(schoolsData)) {
  context.schools[school.id] = new School(school)
}

// Vaccines
context.vaccines = vaccinesData

// Batches
context.batches = {}
Array.from([...range(0, totalBatches)]).forEach(() => {
  const batch = generateBatch()
  context.batches[batch.id] = batch
})

// Patients
context.patients = {}
Array.from([...range(0, totalPatients)]).forEach(() => {
  const patient = generatePatient()
  context.patients[patient.uuid] = patient
})

// PDS records
context.pdsRecords = {}
Array.from([...range(0, 20)]).forEach(() => {
  const pdsRecord = generatePDSRecord()
  context.pdsRecords[pdsRecord.uuid] = pdsRecord
})

// Programmes
context.programmes = {}
for (const programme of Object.values(programmesData)) {
  context.programmes[programme.id] = new Programme(programme)
}

// Uploads
context.uploads = {}

// Add cohort upload
const patient_uuids = Object.values(context.patients).flatMap(
  ({ uuid }) => uuid
)
const cohortUpload = generateUpload(patient_uuids, nurse, UploadType.Cohort)
context.uploads[cohortUpload.id] = cohortUpload

// Add class list uploads
for (const school of Object.values(context.schools)) {
  const patient_uuids = Object.values(context.patients)
    .filter(({ school_id }) => school_id === school.id)
    .flatMap(({ uuid }) => uuid)

  const schoolUpload = generateUpload(
    patient_uuids,
    nurse,
    UploadType.School,
    school
  )
  context.uploads[schoolUpload.id] = schoolUpload
}

// Sessions
context.sessions = {}
for (const preset of Object.values(SessionPresets)) {
  const year = getCurrentAcademicYear()

  const ids = Object.values(context.schools)
    .filter(({ phase }) =>
      // Adolescent programmes are only held at secondary schools
      preset.adolescent ? phase === SchoolPhase.Secondary : phase
    )
    .flatMap(({ id }) => id)

  // Schedule school sessions
  for (const school_id of ids) {
    const schoolSession = generateSession(preset, year, nurse, { school_id })
    if (schoolSession) {
      context.sessions[schoolSession.id] = new Session(schoolSession, context)
    }
  }

  // Schedule clinic sessions
  // TODO: Get clinics from team (linked to patient’s school)
  const clinicsPerPreset = 3
  const clinic_ids = faker.helpers.arrayElements(
    Object.values(context.teams).flatMap((team) => team.clinic_ids),
    clinicsPerPreset
  )
  for (const clinic_id of clinic_ids) {
    const clinicSession = generateSession(preset, year, nurse, { clinic_id })
    if (clinicSession) {
      generateClinicVaccinationPeriods(clinicSession)
      context.sessions[clinicSession.id] = new Session(clinicSession, context)
    }
  }
}

// Ensure at least one school session is scheduled for today
const earliestPlannedSchoolSession = Object.values(context.sessions)
  .map((session) => new Session(session))
  .sort((a, b) => getDateValueDifference(a.openAt, b.openAt))
  .find((session) => session.isPlanned)

const hasSessionToday = isSameDay(earliestPlannedSchoolSession?.date, today())

if (!hasSessionToday) {
  context.sessions[earliestPlannedSchoolSession.id].date = today()
}

// Clinic bookings
context.clinicBookings = {}
Array.from([...range(1, totalClinicBookings)]).forEach(() => {
  const booking = generateEmptyClinicBooking(context)
  context.clinicBookings[booking.uuid] = booking
})

// Clinic appointments
context.clinicAppointments = {}
for (const booking of Object.values(context.clinicBookings)) {
  // Create the first appointment for the booking
  const firstAppointment = generateClinicAppointment(booking, context)
  if (!firstAppointment) {
    // TEMP fix while I figure out what's causing the failure to find a clinic session with the relevant preset
    continue
  }
  booking.addAppointment(firstAppointment)
  context.clinicAppointments[firstAppointment.uuid] = firstAppointment

  // Generate parent details based on first child, updating both the booking and appointment with this info
  const patient = firstAppointment.patient
  booking.parent =
    patient?.parent1 ||
    patient?.parent2 ||
    generateParent(firstAppointment.lastName, faker.datatype.boolean(0.5))
  firstAppointment.parentalRelationship = booking.parent.relationship
  firstAppointment.parentalRelationshipOther = booking.parent.relationshipOther
  firstAppointment.parentHasParentalResponsibility =
    booking.parent.hasParentalResponsibility

  // Make any additional appointments for this booking
  const additionalAppointmentsCount = faker.datatype.boolean(0.8)
    ? 0
    : faker.helpers.weightedArrayElement([
        { value: 1, weight: 90 },
        { value: 2, weight: 9 },
        { value: 3, weight: 1 }
      ])
  for (let i = 0; i < additionalAppointmentsCount; i++) {
    // Don't sweat it making the child's last name match; can imagine they're from an earlier marriage or something
    const nextAppointment = generateClinicAppointment(booking, context)
    booking.addAppointment(nextAppointment)
    context.clinicAppointments[nextAppointment.uuid] = nextAppointment
  }
}

// Invite
// TODO: Don’t invite patients who’ve already had a programme’s vaccination
context.patientSessions = {}
for (let session of Object.values(context.sessions)) {
  session = new Session(session, context)

  if (session.type === SessionType.School) {
    const patientsInsideSchool = Object.values(context.patients).filter(
      ({ school_id }) => school_id === session.school_id
    )

    for (let patient of patientsInsideSchool) {
      patient = new Patient(patient, context)

      for (const programme_id of session.programme_ids) {
        const { inviteToSession } = patient.programmes[programme_id]

        if (inviteToSession) {
          const patientSession = new PatientSession(
            {
              createdAt: session.openAt,
              patient_uuid: patient.uuid,
              programme_id,
              session_id: session.id
            },
            context
          )

          // Add patient to session
          patient.addToSession(patientSession.session)

          // 2️⃣🅰️ REQUEST CONSENT
          patient.requestConsent(patientSession)

          context.patientSessions[patientSession.uuid] = patientSession
        }
      }
    }
  }

  if (session.type === SessionType.Clinic) {
    const patientsOutsideSchool = Object.values(context.patients).filter(
      ({ school_id }) => ['888888', '999999'].includes(school_id)
    )

    for (const patient of patientsOutsideSchool) {
      for (const programme_id of session.programme_ids) {
        const { inviteToSession } = patient.programmes[programme_id]

        if (inviteToSession) {
          const patientSession = new PatientSession(
            {
              patient_uuid: patient.uuid,
              programme_id,
              session_id: session.id
            },
            context
          )

          // Add patient to session
          patient.addToSession(patientSession.session)

          // 2️⃣🅱️ INVITE home-educated/school unknown patient to clinic
          patient.requestConsent(patientSession)

          context.patientSessions[patientSession.uuid] = patientSession
        }
      }
    }
  }
}

// Consent
let programme
context.replies = {}
for (const patientSession of Object.values(context.patientSessions)) {
  const { patient, session } = patientSession

  let getConsentForPatient
  switch (true) {
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

  if (getConsentForPatient && !patient.hasNoContactDetails) {
    const maxReplies = faker.helpers.weightedArrayElement([
      { value: 0, weight: 0.7 },
      { value: 1, weight: 0.3 }
    ])
    Array.from([...range(0, maxReplies)]).forEach((_, index) => {
      let lastConsentCreatedAt
      for (programme of session.programmes) {
        const consent = generateConsent(
          programme,
          session,
          patientSession,
          index,
          lastConsentCreatedAt
        )

        if (consent) {
          lastConsentCreatedAt = consent.createdAt

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
          context.replies[consent.uuid] = consent
        }
      }
    })
  }
}

// Screen and record
context.instructions = {}
context.vaccinations = {}
for (const patientSession of Object.values(context.patientSessions)) {
  // Screen answers to health questions
  if (patientSession.screen === ScreenOutcome.NeedsTriage) {
    // Get triage notes
    for (const response of patientSession.responsesWithTriageNotes) {
      const triaged = faker.datatype.boolean(0.3)
      if (triaged) {
        let outcome = faker.helpers.weightedArrayElement([
          { value: ScreenOutcome.NeedsTriage, weight: 2 },
          { value: ScreenOutcome.InviteToClinic, weight: 1 },
          { value: ScreenOutcome.DelayVaccination, weight: 2 },
          { value: ScreenOutcome.DoNotVaccinate, weight: 1 },
          { value: ScreenOutcome.Vaccinate, weight: 7 }
        ])

        // For programmes that offer alternative vaccine methods, we use
        // screening outcomes specific to each vaccine method
        if (outcome === ScreenOutcome.Vaccinate) {
          if (patientSession.programme.alternativeVaccine) {
            outcome = patientSession.hasConsentForAlternativeInjectionOnly
              ? patientSession.programme.type === ProgrammeType.Flu
                ? ScreenOutcome.VaccinateAlternativeFluInjectionOnly
                : ScreenOutcome.VaccinateAlternativeMMRInjectionOnly
              : ScreenOutcome.VaccinateIntranasalOnly
          }
        }

        let note = response.triageNote

        switch (outcome) {
          case ScreenOutcome.NeedsTriage:
            note = 'Keep in triage until can contact GP.'
            break
          case ScreenOutcome.DelayVaccination:
            note = 'Delay vaccination until later session.'
            break
          case ScreenOutcome.DoNotVaccinate:
            note = 'Decided to not vaccinate at this time.'
            break
        }

        // 4️⃣ SCREEN with triage outcome (initial)
        patientSession.recordTriage({
          outcome,
          note,
          createdAt: response.createdAt,
          createdBy_uid: nurse.uid
        })
      }
    }
  }

  const { patient, session } = patientSession

  // Add instruction outcome to completed sessions
  if (session.isCompleted) {
    // Don’t add a PSD if patient needs triage
    const canInstruct = patientSession.report !== PatientStatus.Triage

    if (session.psdProtocol && canInstruct) {
      let instruction = generateInstruction(
        patientSession,
        programme,
        session,
        nurses
      )
      instruction = new Instruction(instruction, context)
      context.instructions[instruction.uuid] = instruction

      // GIVE INSTRUCTION for PSD
      patientSession.giveInstruction(instruction)
    }
  }

  // Add vaccination outcome
  if (session.isCompleted) {
    // Ensure any outstanding triage has been completed
    if (patientSession.screen === ScreenOutcome.NeedsTriage) {
      // 4️⃣ SCREEN with triage outcome (final)
      patientSession.recordTriage({
        outcome: ScreenOutcome.Vaccinate,
        note: 'Spoke to GP, safe to vaccinate.',
        createdAt: removeDays(session.date, 2),
        createdBy_uid: nurse.uid
      })
    }

    for (const programme of session.programmes) {
      if (
        patientSession.vaccine &&
        patientSession.report === PatientStatus.Due
      ) {
        const batch = Object.values(context.batches)
          .filter(
            ({ vaccine_snomed }) =>
              vaccine_snomed === patientSession.vaccine.snomed
          )
          .find(({ archivedAt }) => archivedAt)

        let vaccination = generateVaccination(
          patientSession,
          programme,
          batch,
          nurses
        )
        vaccination = new Vaccination(vaccination, context)
        context.vaccinations[vaccination.uuid] = vaccination

        const vaccinatedInSchool = faker.datatype.boolean(0.8)
        if (vaccinatedInSchool) {
          // REGISTER attendance (10 minutes before vaccination)
          patientSession.registerAttendance(
            {
              createdAt: addMinutes(vaccination.createdAt, -10),
              createdBy_uid: nurse.uid
            },
            RegistrationOutcome.Present
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

// Invite remaining unvaccinated patients to clinics
for (const programme of Object.values(context.programmes)) {
  const programmeSchoolSessions = Object.values(context.sessions).filter(
    ({ programme_ids }) => programme_ids.includes(programme.id)
  )

  const programmeClinicSession = Object.values(context.sessions)
    .filter(({ programme_ids }) => programme_ids.includes(programme.id))
    .find(({ type }) => type === SessionType.Clinic)

  // Move patients without outcome in a completed school session to a clinic
  for (const session of programmeSchoolSessions) {
    if (session.isCompleted) {
      // TODO: Patients have no context, so won’t have outcomes to filter on
      const sessionPatients = session.patients
        .filter(({ report }) => report !== PatientStatus.Vaccinated)
        .filter(({ screen }) => screen !== ScreenOutcome.DoNotVaccinate)
        .filter(({ consent }) => consent !== ConsentOutcome.Refused)
        .filter(({ consent }) => consent !== ConsentOutcome.FinalRefusal)

      for (let patient of sessionPatients) {
        patient = new Patient(patient, context)

        // Add patient to community clinic
        patient.addToSession(programmeClinicSession)

        // 2️⃣ INVITE TO BOOK CLINIC APPOINTMENT
        patient.inviteToClinic(programmeClinicSession)
      }
    }
  }
}

// Add vaccination upload for vaccinations administered in each programme
for (const programme of Object.values(context.programmes)) {
  const programmeVaccinations = Object.values(context.vaccinations).filter(
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
    context.uploads[vaccinationUpload.id] = vaccinationUpload
  }
}

// Add moves
context.moves = {}
let matchingIndex = 0
for (const patient of Object.values(context.patients)) {
  if (patient?.pendingChanges?.school_id) {
    const move = new Move({
      source: MoveSource.Cohort,
      team_id:
        matchingIndex === 0 ? Object.values(context.teams)[0].code : undefined,
      from_urn: patient.school_id,
      to_urn: patient?.pendingChanges?.school_id,
      patient_uuid: patient.uuid
    })
    context.moves[move.uuid] = move
    matchingIndex++
  }
}

// Add notices
context.notices = {}

// Flag patient as having died
const deceasedPatient = Object.values(context.patients)[0]
const deceasedNotice = generateNotice(deceasedPatient, NoticeType.Deceased)
context.notices[deceasedNotice.uuid] = deceasedNotice
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
for (const uuid of deceasedPatient.patientSession_uuids) {
  const hasPatientSession = context.patientSessions[uuid]

  if (hasPatientSession) {
    const patientSession = context.patientSessions[uuid]

    patientSession.removeFromSession({
      createdBy_uid: nurse.uid
    })
  }
}

// Flag patient record as invalid
const invalidPatient = Object.values(context.patients)[1]
if (invalidPatient) {
  const invalidNotice = generateNotice(invalidPatient, NoticeType.Invalid)
  context.notices[invalidNotice.uuid] = invalidNotice
  invalidPatient.addNotice(invalidNotice)
}

// Flag patient record as sensitive
const sensitivePatient = Object.values(context.patients)[2]
if (sensitivePatient) {
  const sensitiveNotice = generateNotice(sensitivePatient, NoticeType.Sensitive)
  context.notices[sensitiveNotice.uuid] = sensitiveNotice
  sensitivePatient.addNotice(sensitiveNotice)
}

// Flag patient record as not wanting vaccination to be shared with GP
let vaccinatedPatient = Object.values(context.patients).find(
  (patient) => patient.vaccination_uuids.length > 0
)
if (vaccinatedPatient) {
  vaccinatedPatient = new Patient(vaccinatedPatient, context)

  for (let patientSession of vaccinatedPatient.patientSessions) {
    patientSession = new PatientSession(patientSession, context)

    // Check for a given consent response
    const givenConsentReply = patientSession.responses.find(
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
      context.patientSessions[patientSession.uuid] = patientSession

      // Update existing consent response to be self-consent from the child
      givenConsentReply.method = ReplyMethod.InPerson
      givenConsentReply.parent = false
      givenConsentReply.selfConsent = true

      // Update consent response
      context.replies[givenConsentReply.uuid] = givenConsentReply

      // Generate notice and add to patient record
      const hiddenNotice = generateNotice(
        vaccinatedPatient,
        NoticeType.NoNotify
      )
      context.notices[hiddenNotice.uuid] = hiddenNotice
      vaccinatedPatient.addNotice(hiddenNotice)
    }
  }
}

// Generate date files
generateDataFile('.data/batches.json', context.batches)
generateDataFile('.data/clinic-appointments.json', context.clinicAppointments)
generateDataFile('.data/clinic-bookings.json', context.clinicBookings)
generateDataFile('.data/clinics.json', context.clinics)
generateDataFile('.data/instructions.json', context.instructions)
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
