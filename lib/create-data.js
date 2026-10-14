import process from 'node:process'

import { faker } from '@faker-js/faker'
import { addDays, addMinutes, addMonths, addYears, isSameDay } from 'date-fns'

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
  NotifyEmailStatus,
  ProgrammeType,
  RegistrationStatus,
  ReplyDecision,
  ReplyMethod,
  ReplyRefusal,
  SchoolPhase,
  ScreenStatus,
  SessionPresets,
  SessionPresetName,
  SessionType,
  SchoolStatus,
  UploadType,
  VaccinationOutcome,
  VaccinationSource,
  VaccinationSourceSystem
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
  getAcademicYear,
  getCurrentAcademicYear,
  getDateValueDifference,
  removeDays,
  setMidday,
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
  // Only create data for a primary, a secondary, unknown and home-educated URNs
  if (['135335', '133556', '888888', '999999'].includes(school.id)) {
    School.create(school, context)
  }
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

// How many clinics to schedule for each preset that gets one. The majority of clinics are
// single-focus, with only a handful using the broader catch-up presets
const singleFocusPresetNames = [
  SessionPresetName.Flu,
  SessionPresetName.HPV,
  SessionPresetName.Doubles
]
const catchUpPresetNames = [
  SessionPresetName.AutumnCatchup,
  SessionPresetName.SpringCatchup,
  SessionPresetName.SummerCatchup
]
const clinicCountsByPresetName = new Map([
  ...singleFocusPresetNames.map((name) => [name, 4]),
  ...catchUpPresetNames.map((name) => [name, 2])
])

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
  const clinicsPerPreset = clinicCountsByPresetName.get(preset.name)
  if (clinicsPerPreset) {
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
  if (!clinicReadyProgramme_ids.length) {
    continue
  }

  // Mirror the clinics on offer: most invites are for a single programme (matching our
  // majority of single-programme clinics), leaving a minority inviting for everything the
  // child's ready for (matching our smaller number of broader catch-up clinics)
  const invitedProgramme_ids =
    clinicReadyProgramme_ids.length > 1 &&
    faker.helpers.weightedArrayElement([
      { value: true, weight: 70 },
      { value: false, weight: 30 }
    ])
      ? [faker.helpers.arrayElement(clinicReadyProgramme_ids)]
      : clinicReadyProgramme_ids

  // Invite to book a clinic appointment...
  patient.inviteToClinic(invitedProgramme_ids)
  Patient.update(patient.uuid, patient, context)
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

  // Decide what this child will be vaccinated for up front, without considering what clinics are available
  const vaccinationChoices = decideClinicVaccinationChoices(
    patient.clinicProgramme_ids
  )

  // Now find a clinic session that can cover that choice and has room for it. (Keep hold
  // of the bookable start times we find for each so we don't have to work them out again.)
  const bookableStartTimesBySession = new Map()
  const matchingClinicSessions = clinicSessions.filter((session) => {
    if (!session.canCoverVaccinationChoices(vaccinationChoices)) {
      return false
    }

    if (session.percentBooked >= clinicTargets.get(session)) {
      return false
    }

    const bookableStartTimes =
      session.bookableStartTimesForVaccinationChoices(vaccinationChoices)
    if (bookableStartTimes.length === 0) {
      return false
    }

    bookableStartTimesBySession.set(session, bookableStartTimes)
    return true
  })
  if (!matchingClinicSessions.length) {
    continue
  }

  // Prefer a single-focus clinic over a catch-up one where either could serve this booking.
  // Otherwise, catch-up clinics end up over-represented.
  const singleFocusMatches = matchingClinicSessions.filter(
    (session) => !catchUpPresetNames.includes(session.presetNames[0])
  )
  const preferredSessions =
    singleFocusMatches.length && faker.datatype.boolean(0.8)
      ? singleFocusMatches
      : matchingClinicSessions

  const session = faker.helpers.arrayElement(preferredSessions)
  const startAt = faker.helpers.arrayElement(
    bookableStartTimesBySession.get(session)
  )

  // Create the booking containing the child's appointment
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
    // Create a patient session for each programme actually selected for this
    // appointment (not necessarily everything the child was invited for)
    vaccinationChoices.selected_programme_ids.forEach((programme_id) => {
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

// MMR catch-up cohort
// Seven reference cases for the MMR dose schedule, plus two design variants
// of case 7 (see mmr-test-scenarios.md), added after the generated data so
// they stay isolated. Written for academic year 2025/26 and shifted by whole years to
// the current academic year, so the cohort is always in Years 9 and 10 and
// every age at a dose is unchanged.
const mmrYearOffset = getCurrentAcademicYear() - 2025
const mmrSchool_id = '135335' // Grace Academy Coventry
const mmrPreschool_id = '133556' // St Mary’s Catholic Primary School
const mmrVaccine = {
  MMRVaxPro: '13968211000001108',
  ProQuad: '45480711000001107', // MMRV
  MenQuadfi: '39779611000001104',
  Revaxis: '7374311000001101',
  Gardasil9: '33493111000001108'
}
const consultantNote =
  'Parents asked their paediatric oncology consultant for advice given Bilal’s treatment history before consenting. They had not heard back by the day of the session, so refused consent for now. To be revisited once consultant input is received.'

/**
 * Date at an age, given in months and days
 *
 * @param {Date} dob - Date of birth
 * @param {number} months - Months
 * @param {number} [days] - Days
 * @returns {Date} Date (midday)
 */
const atAge = (dob, months, days = 0) =>
  setMidday(addDays(addMonths(dob, months), days))

// Dose history from outside Mavis (NHS Immunisations API or CHIS)
const mmrSeedPatients = [
  {
    uuid: 'mmr00001-0000-4000-8000-000000000001',
    nhsn: '9990000011',
    firstName: 'Alice',
    lastName: 'Adams',
    sourceSystem: VaccinationSourceSystem.SystmOne,
    dob: '2012-01-12', // Year 9
    // Case 1: two valid doses, dose 2 recorded with an MMRV product
    doses: [
      { uuid: 'mmr00001-v001-4000-8000-000000000001', months: 12, days: 14 },
      {
        uuid: 'mmr00001-v002-4000-8000-000000000002',
        months: 40,
        days: 10,
        vaccine_snomed: mmrVaccine.ProQuad
      }
    ]
  },
  {
    uuid: 'mmr00002-0000-4000-8000-000000000002',
    nhsn: '9990000029',
    firstName: 'Bilal',
    lastName: 'Begum',
    sourceSystem: VaccinationSourceSystem.EMIS,
    dob: '2011-03-03', // Year 10
    // Case 2: one valid dose, two missed pre-school appointments, then
    // refusals at the Year 9 Doubles and MMR session (see below)
    doses: [
      { uuid: 'mmr00002-v001-4000-8000-000000000001', months: 12, days: 14 },
      {
        uuid: 'mmr00002-v002-4000-8000-000000000002',
        months: 50,
        outcome: VaccinationOutcome.Absent,
        source: VaccinationSource.CHIS
      },
      {
        uuid: 'mmr00002-v004-4000-8000-000000000004',
        months: 57,
        outcome: VaccinationOutcome.Absent,
        source: VaccinationSource.CHIS
      }
    ]
  },
  {
    uuid: 'mmr00003-0000-4000-8000-000000000003',
    nhsn: '9990000037',
    firstName: 'Chiamaka',
    lastName: 'Chen',
    sourceSystem: VaccinationSourceSystem.SystmOne,
    dob: '2011-11-28', // Year 9
    // Case 3: dose at 11 months (out of schedule), then dose 1 given by the
    // SAIS team at 50 months (see below)
    doses: [{ uuid: 'mmr00003-v001-4000-8000-000000000001', months: 11 }]
  },
  {
    uuid: 'mmr00004-0000-4000-8000-000000000004',
    nhsn: '9990000045',
    firstName: 'Dmitri',
    lastName: 'Dixit',
    sourceSystem: VaccinationSourceSystem.EMIS,
    dob: '2012-07-05', // Year 9
    // Case 4: dose one day before 1st birthday (out of schedule), then the
    // pre-school booster, which becomes dose 1
    doses: [
      { uuid: 'mmr00004-v001-4000-8000-000000000001', months: 11, days: 29 },
      { uuid: 'mmr00004-v002-4000-8000-000000000002', months: 48, days: 14 }
    ]
  },
  {
    uuid: 'mmr00005-0000-4000-8000-000000000005',
    nhsn: '9990000053',
    firstName: 'Eshe',
    lastName: 'Edwards',
    sourceSystem: VaccinationSourceSystem.SystmOne,
    dob: '2010-10-15', // Year 10
    // Case 5: one dose recorded three times on different dates, so not
    // collapsed as duplicates: by the GP on the day, then in two historical
    // uploads (CHIS keyed it in later, and a previous area's CHIS or SAIS
    // file after the child moved)
    doses: [
      { uuid: 'mmr00005-v001-4000-8000-000000000001', months: 13 },
      {
        uuid: 'mmr00005-v002-4000-8000-000000000002',
        months: 13,
        days: 3,
        source: VaccinationSource.HistoricalUpload
      },
      {
        uuid: 'mmr00005-v003-4000-8000-000000000003',
        months: 13,
        days: 4,
        source: VaccinationSource.HistoricalUpload
      }
    ]
  },
  {
    uuid: 'mmr00006-0000-4000-8000-000000000006',
    nhsn: '9990000061',
    firstName: 'Farah',
    lastName: 'Farooq',
    sourceSystem: VaccinationSourceSystem.SystmOne,
    dob: '2012-03-15', // Year 9
    // Case 6: single dose labelled 2P by the source, with no dose 1 record
    doses: [
      {
        uuid: 'mmr00006-v001-4000-8000-000000000001',
        months: 48,
        sequence: '2P'
      }
    ]
  },
  {
    uuid: 'mmr00007-0000-4000-8000-000000000007',
    nhsn: '9990000079',
    firstName: 'Gita',
    lastName: 'Gill',
    dob: '2011-01-20', // Year 10
    // Case 7 (known gap): no dose records, only an already had the vaccine
    // record from a CHIS import, dated on the import date. It is not
    // classified as a dose but marks the child vaccinated, as already_had
    // does in Mavis
    doses: [
      {
        uuid: 'mmr00007-v001-4000-8000-000000000001',
        importedAt: '2025-06-10',
        outcome: VaccinationOutcome.AlreadyVaccinated,
        source: VaccinationSource.CHIS,
        vaccine_snomed: undefined
      }
    ]
  }
]

// Cases 7A and 7B (design variants, prototype only): copies of Gita Gill
// with the same record, each with a flag that chooses how the MMR page
// shows the already had gap
for (const [n, nhsn, designVariant] of [
  [8, '9990000087', 'A'],
  [9, '9990000095', 'B']
]) {
  const gita = mmrSeedPatients.find(({ uuid }) => uuid.startsWith('mmr00007'))
  mmrSeedPatients.push({
    ...gita,
    uuid: `mmr0000${n}-0000-4000-8000-00000000000${n}`,
    nhsn,
    lastName: `Gill ${designVariant}`,
    designVariant,
    doses: gita.doses.map((dose) => ({
      ...dose,
      uuid: dose.uuid.replace('mmr00007', `mmr0000${n}`)
    }))
  })
}

const mmrPatients = {}
for (const seed of mmrSeedPatients) {
  const dob = addYears(new Date(seed.dob), mmrYearOffset)
  const patient = Patient.create(
    {
      uuid: seed.uuid,
      nhsn: seed.nhsn,
      firstName: seed.firstName,
      lastName: seed.lastName,
      dob,
      designVariant: seed.designVariant,
      school_id: mmrSchool_id,
      address: {
        addressLine1: '1 Test Street',
        addressLevel1: 'Coventry',
        postalCode: 'CV1 1AA'
      }
    },
    context
  )

  // Parent contact with a delivered email, so consent requests and online
  // replies reach them
  const contact = generateContact(patient, true)
  contact.email = `${contact.fullName.split(' ')[0].toLowerCase()}.${patient.lastName.toLowerCase().replaceAll(' ', '')}@example.com`
  contact.emailStatus = NotifyEmailStatus.Delivered
  Contact.create(contact, context)
  patient.contact_uuids.push(contact.uuid)

  for (const dose of seed.doses) {
    const administeredAt = dose.importedAt
      ? setMidday(addYears(new Date(dose.importedAt), mmrYearOffset))
      : atAge(dob, dose.months, dose.days)
    const outcome = dose.outcome || VaccinationOutcome.Vaccinated
    Vaccination.create(
      {
        uuid: dose.uuid,
        createdAt: administeredAt,
        administeredAt,
        patient_uuid: patient.uuid,
        programme_id: 'mmr',
        vaccine_snomed:
          'vaccine_snomed' in dose ? dose.vaccine_snomed : mmrVaccine.MMRVaxPro,
        sequence: dose.sequence,
        outcome,
        source: dose.source || VaccinationSource.NhsImmunisationsApi,
        sourceSystem: seed.sourceSystem,
        ...(outcome === VaccinationOutcome.Vaccinated && { dose: 0.5 })
      },
      context
    )
  }

  mmrPatients[seed.firstName + (seed.designVariant || '')] = patient
}

/**
 * Add a historical session, held at an age of a patient
 *
 * @param {string} id - Session ID
 * @param {object} options - Session options
 * @param {Date} date - Session date
 * @returns {Session} Session
 */
const createMmrHistoricalSession = (id, options, date) =>
  Session.create(
    {
      id,
      createdAt: removeDays(date, 42),
      createdBy_uid: nurse.uid,
      date,
      consentOpenAt: removeDays(date, 42),
      academicYear: getAcademicYear(date),
      type: SessionType.School,
      hasRegistration: true,
      ...options
    },
    context
  )

/**
 * Add a patient to a session for a programme
 *
 * @param {Patient} patient - Patient
 * @param {Session} session - Session
 * @param {string} programme_id - Programme ID
 */
const addToMmrSession = (patient, session, programme_id) => {
  const patientSession = new PatientSession(
    {
      createdAt: session.consentOpenAt,
      patient_uuid: patient.uuid,
      programme_id,
      session_id: session.id
    },
    context
  )
  patient.addToSession(patientSession)
  PatientSession.create(patientSession, context)
}

/**
 * Record a vaccination outcome given in a past session (SAIS record)
 *
 * Linked to the session’s school, not the session itself: a vaccination with
 * a `session_id` is always dated today.
 *
 * @param {Patient} patient - Patient
 * @param {Session} session - Session
 * @param {object} options - Vaccination options
 */
const recordMmrSessionOutcome = (patient, session, options) => {
  const vaccination = Vaccination.create(
    {
      createdAt: session.date,
      createdBy_uid: nurse.uid,
      administeredAt: session.date,
      administeredBy_uid: nurse.uid,
      patient_uuid: patient.uuid,
      school_id: session.school_id,
      source: VaccinationSource.Service,
      ...options
    },
    context
  )
  patient.recordVaccination(vaccination)
}

// Chiamaka’s dose 1, given by the SAIS team at 50 months
const { Chiamaka } = mmrPatients
const chiamakaSession = createMmrHistoricalSession(
  'mmr00003-session-50m',
  { school_id: mmrPreschool_id, presetNames: [SessionPresetName.MMR] },
  atAge(Chiamaka.dob, 50)
)
addToMmrSession(Chiamaka, chiamakaSession, 'mmr')
recordMmrSessionOutcome(Chiamaka, chiamakaSession, {
  uuid: 'mmr00003-v002-4000-8000-000000000002',
  programme_id: 'mmr',
  vaccine_snomed: mmrVaccine.MMRVaxPro,
  outcome: VaccinationOutcome.Vaccinated,
  dose: 0.5
})

// Bilal’s Year 8 HPV session; consent refused while parents asked the
// consultant about his oncology history
const { Bilal } = mmrPatients
const bilalHpvSession = createMmrHistoricalSession(
  'mmr00002-hpv-y8-prior',
  {
    school_id: mmrSchool_id,
    yearGroups: [8],
    presetNames: [SessionPresetName.HPV]
  },
  atAge(Bilal.dob, 156, 10)
)
addToMmrSession(Bilal, bilalHpvSession, 'hpv')
recordMmrSessionOutcome(Bilal, bilalHpvSession, {
  uuid: 'mmr00002-hpv-y8-001',
  programme_id: 'hpv',
  vaccine_snomed: mmrVaccine.Gardasil9,
  outcome: VaccinationOutcome.ConsentRefused,
  note: 'Parents unsure whether the HPV vaccine was suitable for Bilal given his oncology history. Asked for more time to discuss with the consultant before consenting; consent not provided in time, so refused for this session.'
})

// Bilal’s Year 9 Doubles and MMR session; all 3 vaccinations refused
const bilalDoublesSession = createMmrHistoricalSession(
  'mmr00002-doubles-y9-prior',
  {
    school_id: mmrSchool_id,
    yearGroups: [9],
    presetNames: [SessionPresetName.Doubles, SessionPresetName.MMR]
  },
  atAge(Bilal.dob, 171, 9)
)
for (const [uuid, programme_id, vaccine_snomed] of [
  ['mmr00002-doubles-y9-mmr', 'mmr', mmrVaccine.MMRVaxPro],
  ['mmr00002-doubles-y9-001', 'menacwy', mmrVaccine.MenQuadfi],
  ['mmr00002-doubles-y9-002', 'td-ipv', mmrVaccine.Revaxis]
]) {
  addToMmrSession(Bilal, bilalDoublesSession, programme_id)
  recordMmrSessionOutcome(Bilal, bilalDoublesSession, {
    uuid,
    programme_id,
    vaccine_snomed,
    outcome: VaccinationOutcome.ConsentRefused,
    note: consultantNote
  })
}

// Current catch-up session for the cohort, always 2 weeks away with the
// consent window open
const mmrCatchupDate = setMidday(addDays(today(), 14))
const mmrCatchupSession = Session.create(
  {
    id: 'mmr-catchup-y9y10-current',
    createdAt: removeDays(today(), 28),
    createdBy_uid: nurse.uid,
    date: mmrCatchupDate,
    consentOpenAt: removeDays(today(), 28),
    academicYear: getAcademicYear(mmrCatchupDate),
    type: SessionType.School,
    school_id: mmrSchool_id,
    yearGroups: [9, 10],
    hasRegistration: true,
    presetNames: [SessionPresetName.MMR, SessionPresetName.Doubles]
  },
  context
)

for (const patient of Object.values(mmrPatients)) {
  for (const programme_id of ['mmr', 'menacwy', 'td-ipv']) {
    addToMmrSession(patient, mmrCatchupSession, programme_id)
  }

  for (const patientSession of patient.patientSessions.filter(
    ({ session_id }) => session_id === mmrCatchupSession.id
  )) {
    patient.requestConsent(patientSession)
  }
}

// Consent replies for the catch-up session. Dmitri’s parent refuses MMR as
// already had both doses; every other reply gives consent with no health issues,
// except Bilal’s immune system answer for MMR
const mmrReplyIndex = { mmr: 1, menacwy: 2, 'td-ipv': 3 }
for (const patient of Object.values(mmrPatients)) {
  const contact = patient.contacts[0]

  for (const programme_id of ['mmr', 'menacwy', 'td-ipv']) {
    const index = mmrReplyIndex[programme_id]
    const uuid = `${patient.uuid.slice(0, 8)}-r00${index}-4000-8000-000000000001`
    const isRefusal = patient === mmrPatients.Dmitri && programme_id === 'mmr'

    const healthAnswers = {}
    const vaccine = Programme.findOne(programme_id, context).vaccines[0]
    for (const key of Object.keys(vaccine.flatHealthQuestions)) {
      healthAnswers[key] = { answer: 'No' }
    }
    if (patient === mmrPatients.Bilal && programme_id === 'mmr') {
      healthAnswers.immuneSystem = {
        answer: 'Yes',
        details:
          'Bilal had chemotherapy for leukaemia at Birmingham Children’s Hospital, finishing treatment in 2016. He has been in remission since and was discharged from oncology follow-up. No current medication.'
      }
    }

    const consent = new Consent(
      {
        uuid,
        createdAt: isRefusal
          ? removeDays(today(), 3)
          : addDays(mmrCatchupSession.consentOpenAt, 3 + index),
        child: patient,
        contact_uuid: contact.uuid,
        method: ReplyMethod.Website,
        programme_id,
        session_id: mmrCatchupSession.id,
        ...(isRefusal
          ? {
              decision: ReplyDecision.Refused,
              refusalReason: ReplyRefusal.AlreadyVaccinatedMMR
            }
          : { decision: ReplyDecision.Given, healthAnswers })
      },
      context
    )
    consent.linkToPatient(patient)
    Consent.create(consent, context)
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
