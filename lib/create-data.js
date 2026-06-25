import process from 'node:process'

import { faker } from '@faker-js/faker'
import { addDays, addMinutes, addMonths, isSameDay } from 'date-fns'

import clinicsData from '../app/datasets/clinics.js'
import programmesData from '../app/datasets/programmes.js'
import schoolsData from '../app/datasets/schools.js'
import teamsData from '../app/datasets/teams.js'
import usersData from '../app/datasets/users.js'
import vaccinesData from '../app/datasets/vaccines.js'
import {
  ArchiveRecordReason,
  ConsentWindow,
  NotifyEmailStatus,
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
  ReplyRefusal,
  SchoolStatus,
  VaccinationOutcome,
  VaccinationSource
} from '../app/enums.js'
import { generateBatch } from '../app/generators/batch.js'
import { generateChild } from '../app/generators/child.js'
import { generateClinicAppointment } from '../app/generators/clinic-appointment.js'
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
  Vaccination,
  Vaccine
} from '../app/models.js'
import {
  getAcademicYear,
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

// Contacts
context.contacts = {}

// Patients
context.patients = {}
Array.from([...range(0, totalPatients)]).forEach(() => {
  const child = generateChild(context.schools)
  const patient = generatePatient(child)

  // Contacts
  const contact1 = generateContact(patient, true)
  context.contacts[contact1.uuid] = contact1
  patient.contact_uuids.push(contact1.uuid)

  if (faker.datatype.boolean(0.5)) {
    const contact2 = generateContact(patient)
    context.contacts[contact2.uuid] = contact2
    patient.contact_uuids.push(contact2.uuid)
  }

  context.patients[patient.uuid] = patient
})

// PDS records
context.pdsRecords = {}
Array.from([...range(0, 20)]).forEach(() => {
  const child = generateChild(context.schools)
  const pdsRecord = generatePDSRecord(child)

  // Contacts
  const contact1 = generateContact(pdsRecord, true)
  context.contacts[contact1.uuid] = contact1
  pdsRecord.contact_uuids.push(contact1.uuid)

  if (faker.datatype.boolean(0.5)) {
    const contact2 = generateContact(pdsRecord)
    context.contacts[contact2.uuid] = contact2
    pdsRecord.contact_uuids.push(contact2.uuid)
  }

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
    .map(({ uuid }) => uuid)

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

  // Schedule school sessions
  if (!preset.clinicOnly) {
    const ids = Object.values(context.schools)
      .filter(({ status }) => status !== SchoolStatus.Closed)
      .filter(({ phase }) =>
        // Adolescent programmes are only held at secondary schools
        preset.adolescent ? phase === SchoolPhase.Secondary : phase
      )
      .map(({ id }) => id)

    // Schedule school sessions
    for (const school_id of ids) {
      const schoolSession = generateSession(preset, year, nurse, { school_id })
      if (schoolSession) {
        context.sessions[schoolSession.id] = new Session(schoolSession, context)
      }
    }
  }

  // Schedule clinic sessions
  if (preset.clinicOnly) {
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
}

// Ensure at least one school session is scheduled for today
const earliestPlannedSchoolSession = Object.values(context.sessions)
  .map((session) => new Session(session))
  .sort((a, b) => getDateValueDifference(a.openAt, b.openAt))
  .find((session) => session.isPlanned && session.school_id)

const hasSchoolSessionToday = isSameDay(
  earliestPlannedSchoolSession?.date,
  today()
)

if (!hasSchoolSessionToday && earliestPlannedSchoolSession) {
  context.sessions[earliestPlannedSchoolSession.id].date = today()
}

// Ensure at least one clinic session is scheduled for today
const earliestPlannedClinicSession = Object.values(context.sessions)
  .map((session) => new Session(session))
  .sort((a, b) => getDateValueDifference(a.openAt, b.openAt))
  .find((session) => session.isPlanned && session.clinic_id)

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
for (let session of Object.values(context.sessions).filter(
  ({ type }) => type === SessionType.School
)) {
  session = new Session(session, context)

  const patientsInsideSchool = Object.values(context.patients).filter(
    ({ school_id }) => school_id === session.school_id
  )

  for (let patient of patientsInsideSchool) {
    patient = new Patient(patient, context)

    for (const programme_id of session.programme_ids) {
      const { canInviteToSession } = patient.programmes[programme_id]

      if (canInviteToSession) {
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
        patient.addToSession(patientSession)

        // 2️⃣🅰️ REQUEST CONSENT
        patient.requestConsent(patientSession)

        context.patientSessions[patientSession.uuid] = patientSession
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

  // Children over 16 years old don’t need parental consent
  if (patient.post16) {
    getConsentForPatient = false
  }

  if (getConsentForPatient && !patient.hasNoContactDetails) {
    const maxReplies = faker.helpers.weightedArrayElement([
      { value: 0, weight: 0.7 },
      { value: 1, weight: 0.3 }
    ])
    Array.from([...range(0, maxReplies)]).forEach((_, index) => {
      let lastConsentCreatedAt

      const contact = generateContact(patient, index === 0)

      // If telephone number provided, sometimes add a communication need
      if (contact.tel && faker.datatype.boolean(0.2)) {
        contact.contactPreference = true
        contact.contactPreferenceDetails =
          'I sometimes have difficulty hearing phone calls, so it’s best to send me a text message.'
      }

      context.contacts[contact.uuid] = contact

      for (programme of session.programmes) {
        let consent = generateConsent(
          programme,
          session,
          patientSession,
          contact,
          lastConsentCreatedAt
        )
        consent = new Consent(consent, context)

        if (consent?.child?.dob) {
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
      const triaged = faker.datatype.boolean(0.5)
      if (triaged) {
        let outcome = faker.helpers.weightedArrayElement([
          { value: ScreenOutcome.NeedsTriage, weight: 4 },
          { value: ScreenOutcome.InviteToClinic, weight: 1 },
          { value: ScreenOutcome.DelayVaccination, weight: 1 },
          { value: ScreenOutcome.DoNotVaccinate, weight: 1 },
          { value: ScreenOutcome.Vaccinate, weight: 2 }
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
const clinicSessions = Object.values(context.sessions).filter(
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

  // Choose a clinic session in which we'll book an appointment
  const matchingClinicSessions = clinicSessions.filter((session) => {
    const matchingProgramme_ids = [
      ...new Set(patient.clinicProgramme_ids).intersection(
        new Set(session.programme_ids)
      )
    ]

    if (!matchingProgramme_ids.length) {
      return false
    }

    return session.percentBooked < clinicTargets.get(session)
  })
  if (!matchingClinicSessions.length) {
    continue
  }
  const session = faker.helpers.arrayElement(matchingClinicSessions)

  // Create a single child's appointment and containing booking
  // TODO: find or create siblings to add as well
  const booking = generateEmptyClinicBooking(
    patient.clinicProgramme_ids,
    context
  )
  const appointment = generateClinicAppointment(patient, session, booking)

  // Store the booking on the context
  context.clinicBookings[booking.uuid] = booking

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

      context.patientSessions[patientSession.uuid] = patientSession
    })
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

// All seeded MMR patients are a Y9/Y10 cohort for AY 2025/26 being checked
// for MMR catch-up. Added last, after the random session/consent/vaccination
// loops, so they stay isolated reference cases.
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
  clinic_id,
  school_id,
  canonicalVaccination_uuid,
  source,
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
    clinic_id,
    school_id,
    canonicalVaccination_uuid,
    outcome: given
      ? VaccinationOutcome.Vaccinated
      : notGivenOutcome || VaccinationOutcome.Unwell,
    source:
      source ||
      (service || !given
        ? VaccinationSource.Service
        : VaccinationSource.NhsImmunisationsApi)
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
      // Case 2 — one valid Dose 1, two missed pre-school GP appointments,
      // then refused at Y9 Doubles + MMR catch-up (see below).
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
        source: VaccinationSource.NhsImmunisationsApi
      },
      {
        uuid: 'mmr00002-v004-4000-8000-000000000004',
        ageMonths: 57,
        ageDays: 0,
        given: false,
        notGivenOutcome: VaccinationOutcome.Absent,
        source: VaccinationSource.NhsImmunisationsApi
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
      // Case 3 — early dose at 11m (out of schedule), then a valid Dose 1
      // given by SAIS at school age. Still needs Dose 2.
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
      // and classifies the booster as Dose 1.
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
    dob: new Date('2010-10-15'), // Y10 in AY 2025/26
    doses: [
      // Case 5 — duplicate records (echoes from other systems). Clinically
      // one Dose 1, but recorded three times.
      {
        uuid: 'mmr00005-v001-4000-8000-000000000001',
        ageMonths: 13,
        ageDays: 0,
        given: true
      },
      {
        uuid: 'mmr00005-v002-4000-8000-000000000002',
        ageMonths: 13,
        ageDays: 3,
        given: true
      },
      {
        uuid: 'mmr00005-v003-4000-8000-000000000003',
        ageMonths: 13,
        ageDays: 4,
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
      // booster age with sequence 2P. No Dose 1 is present in the record.
      {
        uuid: 'mmr00006-v001-4000-8000-000000000001',
        ageMonths: 48,
        ageDays: 0,
        given: true,
        sequence: '2P'
      }
    ]
  },
  {
    uuid: 'mmr00007-0000-4000-8000-000000000007',
    nhsn: '9990000079',
    firstName: 'Gareth',
    lastName: 'Greene',
    dob: new Date('2011-05-12'), // Y10 in AY 2025/26
    doses: [
      // Case 7 — direct clashing duplicates from multiple feeds for the same
      // clinical event. Three records for Dose 1, all sharing the same date.
      {
        uuid: 'mmr00007-v001-4000-8000-000000000001',
        ageMonths: 12,
        ageDays: 14,
        given: true,
        clinic_id: 'M84008'
      },
      {
        uuid: 'mmr00007-v002-4000-8000-000000000002',
        ageMonths: 12,
        ageDays: 14,
        given: true,
        canonicalVaccination_uuid: 'mmr00007-v001-4000-8000-000000000001'
      },
      {
        uuid: 'mmr00007-v006-4000-8000-000000000006',
        ageMonths: 12,
        ageDays: 14,
        given: true,
        clinic_id: 'M84008',
        canonicalVaccination_uuid: 'mmr00007-v001-4000-8000-000000000001'
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

// Bilal's Y9 Doubles + MMR catch-up session last academic year (AY 2024/25,
// summer term). All three vaccines were refused on the day.
const bilalUuid = 'mmr00002-0000-4000-8000-000000000002'
const bilalY9DoublesSessionId = 'mmr00002-doubles-y9-prior'
const bilalY9DoublesDate = new Date(2025, 5, 12) // 12 June 2025
const bilalY9DoublesOpenAt = addDays(bilalY9DoublesDate, -42)

context.sessions[bilalY9DoublesSessionId] = new Session(
  {
    id: bilalY9DoublesSessionId,
    createdAt: bilalY9DoublesOpenAt,
    createdBy_uid: nurse.uid,
    date: bilalY9DoublesDate,
    openAt: bilalY9DoublesOpenAt,
    academicYear: getAcademicYear(bilalY9DoublesDate),
    type: SessionType.School,
    school_id: '135335', // Grace Academy Coventry
    yearGroups: [9],
    presetNames: [SessionPresetName.Doubles, SessionPresetName.MMR],
    registration: true
  },
  context
)

const consultantPendingNote =
  'Parents asked their paediatric oncology consultant for advice given Bilal’s treatment history before consenting. They had not heard back by the day of the session, so refused consent for now. To be revisited once consultant input is received.'

const bilalDoublesEntries = [
  {
    uuid: 'mmr00002-doubles-y9-mmr',
    programme_id: 'mmr',
    vaccine_snomed: '13968211000001108', // M-M-RvaxPro
    outcome: VaccinationOutcome.ConsentRefused,
    note: consultantPendingNote
  },
  {
    uuid: 'mmr00002-doubles-y9-001',
    programme_id: 'menacwy',
    vaccine_snomed: '39779611000001104', // MenQuadfi
    outcome: VaccinationOutcome.ConsentRefused,
    note: consultantPendingNote
  },
  {
    uuid: 'mmr00002-doubles-y9-002',
    programme_id: 'td-ipv',
    vaccine_snomed: '7374311000001101', // Revaxis
    outcome: VaccinationOutcome.ConsentRefused,
    note: consultantPendingNote
  }
]

for (const entry of bilalDoublesEntries) {
  const ps = new PatientSession(
    {
      createdAt: bilalY9DoublesOpenAt,
      patient_uuid: bilalUuid,
      programme_id: entry.programme_id,
      session_id: bilalY9DoublesSessionId
    },
    context
  )
  context.patientSessions[ps.uuid] = ps
  context.patients[bilalUuid].patientSession_uuids.push(ps.uuid)

  const vaccination = new Vaccination(
    {
      uuid: entry.uuid,
      createdAt: bilalY9DoublesDate,
      createdBy_uid: nurse.uid,
      patient_uuid: bilalUuid,
      patientSession_uuid: ps.uuid,
      programme_id: entry.programme_id,
      vaccine_snomed: entry.vaccine_snomed,
      outcome: entry.outcome,
      source: VaccinationSource.Service,
      note: entry.note
    },
    context
  )
  context.vaccinations[vaccination.uuid] = vaccination
  context.patients[bilalUuid].vaccination_uuids.push(vaccination.uuid)
}

// Bilal's Y8 HPV session two academic years ago (AY 2023/24, spring term).
const bilalY8HpvSessionId = 'mmr00002-hpv-y8-prior'
const bilalY8HpvDate = new Date(2024, 2, 13) // 13 March 2024
const bilalY8HpvOpenAt = addDays(bilalY8HpvDate, -42)

context.sessions[bilalY8HpvSessionId] = new Session(
  {
    id: bilalY8HpvSessionId,
    createdAt: bilalY8HpvOpenAt,
    createdBy_uid: nurse.uid,
    date: bilalY8HpvDate,
    openAt: bilalY8HpvOpenAt,
    academicYear: getAcademicYear(bilalY8HpvDate),
    type: SessionType.School,
    school_id: '135335', // Grace Academy Coventry
    yearGroups: [8],
    presetNames: [SessionPresetName.HPV],
    registration: true
  },
  context
)

const bilalY8HpvNote =
  'Parents unsure whether the HPV vaccine was suitable for Bilal given his oncology history. Asked for more time to discuss with the consultant before consenting; consent not provided in time, so refused for this session.'

{
  const ps = new PatientSession(
    {
      createdAt: bilalY8HpvOpenAt,
      patient_uuid: bilalUuid,
      programme_id: 'hpv',
      session_id: bilalY8HpvSessionId
    },
    context
  )
  context.patientSessions[ps.uuid] = ps
  context.patients[bilalUuid].patientSession_uuids.push(ps.uuid)

  const vaccination = new Vaccination(
    {
      uuid: 'mmr00002-hpv-y8-001',
      createdAt: bilalY8HpvDate,
      createdBy_uid: nurse.uid,
      patient_uuid: bilalUuid,
      patientSession_uuid: ps.uuid,
      programme_id: 'hpv',
      vaccine_snomed: '33493111000001108', // Gardasil 9
      outcome: VaccinationOutcome.ConsentRefused,
      source: VaccinationSource.Service,
      note: bilalY8HpvNote
    },
    context
  )
  context.vaccinations[vaccination.uuid] = vaccination
  context.patients[bilalUuid].vaccination_uuids.push(vaccination.uuid)
}

// Current catch-up session for the Y9/Y10 cohort. Held at a secondary
// school. Runs MMR catch-up co-located with the teenage Doubles boosters
// (MenACWY + Td/IPV).
const mmrCatchupSchoolId = '135335' // Grace Academy Coventry
const mmrCatchupSessionId = 'mmr-catchup-y9y10-current'
const mmrCatchupSessionDate = new Date(today().getFullYear(), 5, 17) // mid-June, summer term
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
    yearGroups: [9, 10],
    presetNames: [SessionPresetName.MMR, SessionPresetName.Doubles],
    registration: true
  },
  context
)

const mmrCohortUuids = [
  'mmr00001-0000-4000-8000-000000000001', // Alice
  'mmr00002-0000-4000-8000-000000000002', // Bilal
  'mmr00003-0000-4000-8000-000000000003', // Chiamaka
  'mmr00004-0000-4000-8000-000000000004', // Dmitri
  'mmr00005-0000-4000-8000-000000000005', // Eshe
  'mmr00006-0000-4000-8000-000000000006', // Farah
  'mmr00007-0000-4000-8000-000000000007' // Gareth
]

for (const patient_uuid of mmrCohortUuids) {
  for (const programme_id of ['mmr', 'menacwy', 'td-ipv']) {
    const patientSession = new PatientSession(
      {
        createdAt: mmrCatchupOpenAt,
        patient_uuid,
        programme_id,
        session_id: mmrCatchupSessionId
      },
      context
    )
    context.patientSessions[patientSession.uuid] = patientSession
    context.patients[patient_uuid].patientSession_uuids.push(
      patientSession.uuid
    )
  }
}

// Ensure every cohort member has a parent with at least an email.
const dmitri = context.patients['mmr00004-0000-4000-8000-000000000004']
for (const patient_uuid of mmrCohortUuids) {
  const p = context.patients[patient_uuid]
  if (!p.parent1) {
    p.parent1 = generateContact(p, true)
  }
  if (!p.parent1.email) {
    const firstName = p.parent1.fullName.split(' ')[0].toLowerCase()
    const lastName = p.lastName.toLowerCase()
    p.parent1.email = `${firstName}.${lastName}@example.com`
  }
  p.parent1.emailStatus = NotifyEmailStatus.Delivered
}
const dmitriParent = dmitri.parent1

// Dmitri's parent refuses MMR consent citing already vaccinated.
const dmitriConsent = new Consent(
  {
    uuid: 'mmr00004-r001-4000-8000-000000000001',
    createdAt: addDays(today(), -3),
    createdBy_uid: nurse.uid,
    child: dmitri,
    parent: dmitriParent,
    decision: ReplyDecision.Refused,
    refusalReason: ReplyRefusal.AlreadyVaccinated,
    method: ReplyMethod.Website,
    programme_id: 'mmr',
    session_id: mmrCatchupSessionId
  },
  context
)
dmitriConsent.linkToPatient(dmitri)
context.replies[dmitriConsent.uuid] = dmitriConsent

function buildAllNoHealthAnswers(programme) {
  const snomed = programme.vaccine_snomeds[0]
  const vaccine = new Vaccine(context.vaccines[snomed], context)
  const answers = {}
  for (const key of Object.keys(vaccine.flatHealthQuestions)) {
    answers[key] = { answer: 'No' }
  }
  return answers
}

const programmeReplyIndex = { mmr: 1, menacwy: 2, 'td-ipv': 3 }
for (const patient_uuid of mmrCohortUuids) {
  const patient = context.patients[patient_uuid]
  const parent = patient.parent1
  const patientPrefix = patient_uuid.slice(0, 8)

  for (const programme_id of ['mmr', 'menacwy', 'td-ipv']) {
    if (programme_id === 'mmr' && patient_uuid === dmitri.uuid) continue

    const session_id = mmrCatchupSessionId
    const programme = context.programmes[programme_id]
    const idx = programmeReplyIndex[programme_id]
    const uuid = `${patientPrefix}-r${String(idx).padStart(3, '0')}-4000-8000-000000000001`

    const healthAnswers = buildAllNoHealthAnswers(programme)

    if (patient_uuid === bilalUuid && programme_id === 'mmr') {
      healthAnswers.immuneSystem = {
        answer: 'Yes',
        details:
          'Bilal had chemotherapy for leukaemia at Birmingham Children’s Hospital, finishing treatment in 2016. He has been in remission since and was discharged from oncology follow-up. No current medication.'
      }
    }

    const consent = new Consent(
      {
        uuid,
        createdAt: addDays(mmrCatchupOpenAt, 3 + idx),
        createdBy_uid: nurse.uid,
        child: patient,
        parent,
        decision: ReplyDecision.Given,
        method: ReplyMethod.Website,
        healthAnswers,
        programme_id,
        session_id
      },
      context
    )
    consent.linkToPatient(patient)
    context.replies[consent.uuid] = consent
  }
}

// Generate date files
generateDataFile('.data/batches.json', context.batches)
generateDataFile('.data/clinic-bookings.json', context.clinicBookings)
generateDataFile('.data/clinics.json', context.clinics)
generateDataFile('.data/contacts.json', context.contacts)
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
