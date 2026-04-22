import process from 'node:process'

import { faker } from '@faker-js/faker'
import { addDays, addMinutes, addMonths, isSameDay } from 'date-fns'
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
  SessionPresetName,
  SessionPresets,
  SessionType,
  UploadType,
  UserRole,
  ReplyDecision,
  ReplyMethod,
  VaccinationOutcome,
  VaccinationSource
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
  Consent,
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
  getAcademicYear,
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

// Seeded MMR patients for testing the valid/ignored dose UI.
// Stable UUIDs and NHS numbers so they can be deep-linked during clinician testing.
// A–D are a Y9/Y10 cohort for AY 2025/26 being checked for MMR catch-up; Eshe
// remains on her own DOB for the duplicate-records demo. Added last, after the
// random session/consent/vaccination loops, so they stay isolated reference cases.
const seededMmrSchoolId = '141104A' // Seva School - Primary (historical site)

function buildSeededMmrVaccination({
  uuid,
  patient_uuid,
  patientSession_uuid,
  dob,
  ageMonths,
  ageDays = 0,
  given,
  service = false,
  notGivenOutcome,
  sequence,
  note,
  vaccineSnomed = '13968211000001108' // M-M-RvaxPro (MMR) by default
}) {
  const createdAt = addDays(addMonths(dob, ageMonths), ageDays)
  return new Vaccination({
    uuid,
    createdAt,
    createdBy_uid: nurse.uid,
    patient_uuid,
    patientSession_uuid,
    programme_id: 'mmr',
    vaccine_snomed: vaccineSnomed,
    sequence,
    note,
    outcome: given
      ? VaccinationOutcome.Vaccinated
      : notGivenOutcome || VaccinationOutcome.Unwell,
    source:
      service || !given
        ? VaccinationSource.Service
        : VaccinationSource.NhsImmunisationsApi
  })
}

const seededMmrPatients = [
  {
    uuid: 'mmr00001-0000-4000-8000-000000000001',
    nhsn: '9990000011',
    firstName: 'Alice',
    lastName: 'Adams',
    dob: new Date('2012-01-12'), // Y9 in AY 2025/26
    doses: [
      // Case 1 — two valid doses; Dose 2 miscoded as MMRV (a product not used
      // on the UK schedule) to simulate a common data-entry error.
      {
        uuid: 'mmr00001-v001-4000-8000-000000000001',
        ageMonths: 12,
        ageDays: 14,
        given: true
      },
      {
        uuid: 'mmr00001-v002-4000-8000-000000000002',
        ageMonths: 40,
        ageDays: 10,
        given: true,
        vaccineSnomed: '99926011000001103'
      }
    ]
  },
  {
    uuid: 'mmr00002-0000-4000-8000-000000000002',
    nhsn: '9990000029',
    firstName: 'Bilal',
    lastName: 'Begum',
    dob: new Date('2011-03-03'), // Y10 in AY 2025/26
    doses: [
      // Case 2 — two valid doses with repeated failed attempts between them
      {
        uuid: 'mmr00002-v001-4000-8000-000000000001',
        ageMonths: 12,
        ageDays: 14,
        given: true
      },
      {
        uuid: 'mmr00002-v002-4000-8000-000000000002',
        ageMonths: 50,
        ageDays: 0,
        given: false,
        notGivenOutcome: VaccinationOutcome.Absent,
        sessionKey: 'session_50m'
      },
      {
        uuid: 'mmr00002-v004-4000-8000-000000000004',
        ageMonths: 57,
        ageDays: 0,
        given: false,
        notGivenOutcome: VaccinationOutcome.Absent,
        sessionKey: 'session_57m'
      },
      {
        uuid: 'mmr00002-v005-4000-8000-000000000005',
        ageMonths: 61,
        ageDays: 0,
        given: false,
        notGivenOutcome: VaccinationOutcome.Refused,
        sessionKey: 'session_61m'
      },
      {
        uuid: 'mmr00002-v006-4000-8000-000000000006',
        ageMonths: 63,
        ageDays: 10,
        given: true,
        service: true,
        sessionKey: 'session_63m',
        note: 'Catch-up dose following long-term sickness absence. Bilal was under paediatric oncology care at Birmingham Children’s Hospital from late 2014; MMR was deferred at earlier sessions on his consultant’s advice while his immune system was compromised, and declined by his parents during one mid-treatment session. Discharge summary (June 2016, Dr Patel) confirms he is fit to resume routine immunisations — dose given in today’s session with parental consent.'
      }
    ]
  },
  {
    uuid: 'mmr00003-0000-4000-8000-000000000003',
    nhsn: '9990000037',
    firstName: 'Chiamaka',
    lastName: 'Chen',
    dob: new Date('2011-11-28'), // Y9 in AY 2025/26
    doses: [
      // Case 3 — dose at 11m (ignored), then two valid doses given at school age by SAIS
      {
        uuid: 'mmr00003-v001-4000-8000-000000000001',
        ageMonths: 11,
        ageDays: 0,
        given: true
      },
      {
        uuid: 'mmr00003-v002-4000-8000-000000000002',
        ageMonths: 50,
        ageDays: 0,
        given: true,
        service: true,
        sessionKey: 'session_50m'
      },
      {
        uuid: 'mmr00003-v003-4000-8000-000000000003',
        ageMonths: 54,
        ageDays: 0,
        given: true,
        service: true,
        sessionKey: 'session_54m'
      }
    ]
  },
  {
    uuid: 'mmr00004-0000-4000-8000-000000000004',
    nhsn: '9990000045',
    firstName: 'Dmitri',
    lastName: 'Dixit',
    dob: new Date('2012-07-05'), // Y9 in AY 2025/26
    doses: [
      // Case 4 — dose given one day before 1st birthday (ignored as under 12m),
      // then the scheduled pre-school booster at 4 years. The clinician at the
      // time treated these as Dose 1 + Dose 2, but Mavis ignores the early dose
      // and classifies the booster as Dose 1 — so the patient appears to still
      // need a Dose 2.
      {
        uuid: 'mmr00004-v001-4000-8000-000000000001',
        ageMonths: 11,
        ageDays: 29,
        given: true
      },
      {
        uuid: 'mmr00004-v002-4000-8000-000000000002',
        ageMonths: 48,
        ageDays: 14,
        given: true
      }
    ]
  },
  {
    uuid: 'mmr00005-0000-4000-8000-000000000005',
    nhsn: '9990000053',
    firstName: 'Eshe',
    lastName: 'Edwards',
    dob: new Date('2020-09-01'),
    doses: [
      // Case 5 — duplicate records (echoes from other systems). Clinically two
      // doses, but recorded four times: each dose arrives once from the
      // originating system and once as an echo from another feed.
      // Dose 1 recorded by GP
      {
        uuid: 'mmr00005-v001-4000-8000-000000000001',
        ageMonths: 13,
        ageDays: 0,
        given: true
      },
      // Dose 1 echo — same event via a different external feed (e.g. CHIS),
      // recorded a few days later
      {
        uuid: 'mmr00005-v002-4000-8000-000000000002',
        ageMonths: 13,
        ageDays: 3,
        given: true
      },
      // Dose 2 given in a Mavis session by SAIS
      {
        uuid: 'mmr00005-v003-4000-8000-000000000003',
        ageMonths: 50,
        ageDays: 0,
        given: true,
        service: true,
        sessionKey: 'session_50m'
      },
      // Dose 2 near-duplicate — GP echo two days later
      {
        uuid: 'mmr00005-v004-4000-8000-000000000004',
        ageMonths: 50,
        ageDays: 2,
        given: true
      }
    ]
  },
  {
    uuid: 'mmr00006-0000-4000-8000-000000000006',
    nhsn: '9990000061',
    firstName: 'Farah',
    lastName: 'Farooq',
    dob: new Date('2012-03-15'), // Y9 in AY 2025/26
    doses: [
      // Case 6 — partial record: a single MMR dose recorded at the pre-school
      // booster age (~4y) with sequence '2P'. No Dose 1 is present in the
      // record — a common data-quality issue when doses arrive from external
      // feeds without the preceding dose. Mavis classifies the single dose as
      // Dose 1 per the schedule rules, so the vaccination's own "Second dose"
      // label disagrees with the computed schedule position.
      {
        uuid: 'mmr00006-v001-4000-8000-000000000001',
        ageMonths: 48,
        ageDays: 0,
        given: true,
        sequence: '2P'
      }
    ]
  }
]

for (const seed of seededMmrPatients) {
  const vaccination_uuids = []
  const patientSession_uuids = []

  for (const dose of seed.doses) {
    let patientSession_uuid
    if (dose.sessionKey) {
      const sessionId = `mmr-seed-${seed.uuid.slice(0, 8)}-${dose.sessionKey}`
      const sessionDate = addDays(
        addMonths(seed.dob, dose.ageMonths),
        dose.ageDays || 0
      )
      const openAt = addDays(sessionDate, -42)

      if (!context.sessions[sessionId]) {
        const session = new Session(
          {
            id: sessionId,
            createdAt: openAt,
            createdBy_uid: nurse.uid,
            date: sessionDate,
            openAt,
            academicYear: getAcademicYear(sessionDate),
            type: SessionType.School,
            school_id: seededMmrSchoolId,
            presetNames: [SessionPresetName.MMR],
            registration: true
          },
          context
        )
        context.sessions[session.id] = session
      }

      const patientSession = new PatientSession(
        {
          createdAt: openAt,
          patient_uuid: seed.uuid,
          programme_id: 'mmr',
          session_id: sessionId
        },
        context
      )
      context.patientSessions[patientSession.uuid] = patientSession
      patientSession_uuid = patientSession.uuid
      patientSession_uuids.push(patientSession.uuid)
    }

    const vaccination = buildSeededMmrVaccination({
      ...dose,
      dob: seed.dob,
      patient_uuid: seed.uuid,
      patientSession_uuid
    })
    context.vaccinations[vaccination.uuid] = vaccination
    vaccination_uuids.push(vaccination.uuid)
  }

  const patient = new Patient({
    uuid: seed.uuid,
    nhsn: seed.nhsn,
    firstName: seed.firstName,
    lastName: seed.lastName,
    dob: seed.dob,
    school_id: seededMmrSchoolId,
    address: {
      addressLine1: '1 Test Street',
      addressLevel1: 'Coventry',
      postalCode: 'CV1 1AA'
    },
    patientSession_uuids,
    vaccination_uuids
  })
  context.patients[patient.uuid] = patient
}

// Current MMR catch-up session for the Y9/Y10 cohort (Alice, Bilal, Chiamaka,
// Dmitri). Held at a secondary school so the scenario matches their year
// groups — separate from each patient's historical primary-school sessions.
const mmrCatchupSchoolId = '135335' // Grace Academy Coventry
const mmrCatchupSessionId = 'mmr-catchup-y9y10-current'
const mmrCatchupSessionDate = addDays(today(), 28)
const mmrCatchupOpenAt = addDays(mmrCatchupSessionDate, -42)

context.sessions[mmrCatchupSessionId] = new Session(
  {
    id: mmrCatchupSessionId,
    createdAt: mmrCatchupOpenAt,
    createdBy_uid: nurse.uid,
    date: mmrCatchupSessionDate,
    openAt: mmrCatchupOpenAt,
    academicYear: getAcademicYear(mmrCatchupSessionDate),
    type: SessionType.School,
    school_id: mmrCatchupSchoolId,
    presetNames: [SessionPresetName.MMR],
    registration: true
  },
  context
)

const mmrCohortUuids = [
  'mmr00001-0000-4000-8000-000000000001', // Alice
  'mmr00002-0000-4000-8000-000000000002', // Bilal
  'mmr00003-0000-4000-8000-000000000003', // Chiamaka
  'mmr00004-0000-4000-8000-000000000004', // Dmitri
  'mmr00006-0000-4000-8000-000000000006' // Farah
]

const mmrCohortPatientSessionUuids = {}
for (const patient_uuid of mmrCohortUuids) {
  const patientSession = new PatientSession(
    {
      createdAt: mmrCatchupOpenAt,
      patient_uuid,
      programme_id: 'mmr',
      session_id: mmrCatchupSessionId
    },
    context
  )
  context.patientSessions[patientSession.uuid] = patientSession
  context.patients[patient_uuid].patientSession_uuids.push(patientSession.uuid)
  mmrCohortPatientSessionUuids[patient_uuid] = patientSession.uuid
}

// Dmitri's parent responds via the consent process declaring him already
// vaccinated, supplying dates that match his two seeded vaccinations. Mavis
// still ignores the early first dose per the 12-month rule, so the record
// preserves the parent-vs-schedule mismatch that's the point of the demo.
const dmitri = context.patients['mmr00004-0000-4000-8000-000000000004']
const dmitriParent = generateParent(dmitri.lastName, true)
dmitri.parent1 = dmitriParent

const dmitriConsent = new Consent(
  {
    uuid: 'mmr00004-r001-4000-8000-000000000001',
    createdAt: addDays(today(), -3),
    createdBy_uid: nurse.uid,
    child: dmitri,
    parent: dmitriParent,
    decision: ReplyDecision.AlreadyVaccinated,
    method: ReplyMethod.Website,
    firstDose: {
      outcome: VaccinationOutcome.AlreadyVaccinated,
      createdAt: addDays(addMonths(dmitri.dob, 11), 29),
      sequence: '1P',
      country: 'England',
      programme_id: 'mmr'
    },
    secondDose: {
      outcome: VaccinationOutcome.AlreadyVaccinated,
      createdAt: addDays(addMonths(dmitri.dob, 48), 14),
      sequence: '2P',
      country: 'England',
      programme_id: 'mmr'
    },
    programme_id: 'mmr',
    session_id: mmrCatchupSessionId
  },
  context
)
dmitriConsent.linkToPatient(dmitri)
context.replies[dmitriConsent.uuid] = dmitriConsent

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
