import { getAllCountries } from 'countries-and-timezones'

/**
 * @readonly
 * @enum {import('countries-and-timezones').Country}
 */
export const Country = Object.fromEntries(
  Object.entries(getAllCountries()).map(([key, value]) => [key, value.name])
)

/**
 * @readonly
 * @enum {string}
 */
export const AcademicYear = {
  2023: '2023 to 2024',
  2024: '2024 to 2025',
  2025: '2025 to 2026'
}

/**
 * @readonly
 * @enum {string}
 */
export const Adjustment = {
  GuideDog: 'Has a guide dog',
  Distraction: 'Needs a distraction while having the vaccination',
  ExtendedAppointment: 'Needs an extended appointment',
  FirstAppointment: 'Needs the first appointment',
  LastAppointment: 'Needs the last appointment',
  Privacy: 'Needs a private space',
  HomeVisit: 'Needs a home visit',
  Other: 'Other reasonable adjustment'
}

/**
 * @readonly
 * @enum {string}
 */
export const ArchiveRecordReason = {
  Deceased: 'The child was reported as deceased',
  Duplicate: 'It’s a duplicate',
  Error: 'It was imported in error',
  Moved: 'The child has moved out of the area',
  Other: 'Other'
}

/**
 * @readonly
 * @enum {string}
 */
export const AuditEventType = {
  Notice: 'Notice',
  Pinned: 'Pinned session note',
  Reminder: 'Reminder',
  Record: 'Change to child record',
  RecordNote: 'Note added to child record',
  SessionNote: 'Session note'
}

/**
 * @readonly
 * @enum {string}
 */
export const ConsentOutcome = {
  NotDelivered: 'Request failed',
  NoResponse: 'No response',
  Inconsistent: 'Conflicting consent',
  Given: 'Consent given',
  GivenForAlternativeInjection: 'Consent given for injected vaccine',
  GivenForIntranasal: 'Consent given for nasal spray',
  Declined: 'Follow up requested',
  Refused: 'Consent refused',
  FinalRefusal: 'Refusal confirmed'
}

/**
 * @readonly
 * @enum {string}
 */
export const ConsentVaccineCriteria = {
  AlternativeFluInjectionOnly: 'Injection only',
  AlternativeMMRInjectionOnly: 'Gelatine-free injection only',
  IntranasalOnly: 'Nasal spray only',
  IntranasalPreferred: 'Nasal spray preferred'
}

/**
 * @readonly
 * @enum {string}
 */
export const ConsentWindow = {
  Opening: 'Opening',
  Open: 'Open',
  Closed: 'Closed',
  None: 'Session not scheduled'
}

/**
 * @readonly
 * @enum {string}
 */
export const DownloadFormat = {
  CSV: 'CSV',
  CarePlus: 'XLSX for CarePlus (System C)',
  SystmOne: 'XLSX for SystmOne (TPP)'
}

/**
 * @readonly
 * @enum {string}
 */
export const DownloadType = {
  Report: 'Vaccination records',
  Moves: 'School moves',
  Session: 'Offline session'
}

/**
 * @readonly
 * @enum {string}
 */
export const EthnicGroup = {
  White: 'White',
  Mixed: 'Mixed or multiple ethnic groups',
  Asian: 'Asian or Asian British',
  Black: 'Black, African, Caribbean or Black British',
  Other: 'Other ethnic group',
  Withheld: 'Prefer not to say'
}

/**
 * @readonly
 * @enum {string}
 */
export const EthnicBackgroundWhite = {
  British: 'English, Welsh, Scottish, Northern Irish or British',
  Irish: 'Irish',
  GRT: 'Gypsy or Irish Traveller',
  Other: 'Any other White background'
}

/**
 * @readonly
 * @enum {string}
 */
export const EthnicBackgroundMixed = {
  WhiteBlack: 'White and Black Caribbean',
  WhiteAfrican: 'White and Black African',
  WhiteAsian: 'White and Asian',
  Other: 'Any other mixed or multiple ethnic background'
}

/**
 * @readonly
 * @enum {string}
 */
export const EthnicBackgroundAsian = {
  Indian: 'Indian',
  Pakistani: 'Pakistani',
  Bangladeshi: 'Bangladeshi',
  Chinese: 'Chinese',
  Other: 'Any other Asian background'
}

/**
 * @readonly
 * @enum {string}
 */
export const EthnicBackgroundBlack = {
  African: 'African',
  Caribbean: 'Caribbean',
  Other: 'Any other Black, African or Caribbean background'
}

/**
 * @readonly
 * @enum {string}
 */
export const EthnicBackgroundOther = {
  Arab: 'Arab',
  Other: 'Any other ethnic group'
}

/**
 * @typedef {EthnicBackgroundWhite | EthnicBackgroundMixed | EthnicBackgroundAsian | EthnicBackgroundBlack | EthnicBackgroundOther} EthnicBackground
 */

/**
 * @readonly
 * @enum {string}
 */
export const Gender = {
  Female: 'Female',
  Male: 'Male',
  NotKnown: 'Not known',
  NotSpecified: 'Not specified'
}

/**
 * @readonly
 * @enum {string}
 */
export const GillickCompetent = {
  True: 'Child assessed as Gillick competent',
  False: 'Child assessed as not Gillick competent'
}

/**
 * @readonly
 * @enum {string}
 */
export const Impairment = {
  Vision: 'Vision',
  Hearing: 'Hearing',
  Mobility: 'Mobility',
  Memory: 'Memory',
  MentalHealth: 'Mental health',
  Communicative: 'Social and/or communication differences',
  Other: 'Other'
}

/**
 * @readonly
 * @enum {string}
 */
export const InstructionOutcome = {
  Given: 'PSD added',
  Needed: 'PSD not added'
}

/**
 * @readonly
 * @enum {string}
 */
export const LocationType = {
  Clinic: 'Community clinic',
  Home: 'At the child’s home',
  School: 'School',
  Other: 'Another location'
}

/**
 * @readonly
 * @enum {string}
 */
export const MoveSource = {
  Cohort: 'Cohort record',
  Consent: 'Consent response',
  School: 'Class list',
  External: 'Another SAIS team'
}

/**
 * @readonly
 * @enum {string}
 */
export const NoticeType = {
  Deceased: 'Deceased',
  Invalid: 'Invalid',
  NoNotify: 'Do not notify parents',
  Sensitive: 'Sensitive'
}

/**
 * @readonly
 * @enum {string}
 */
export const NotifyEmailStatus = {
  Delivered: 'Delivered',
  Permanent: 'Email address does not exist',
  Temporary: 'Inbox not accepting messages right now',
  Technical: 'Technical failure'
}

/**
 * @readonly
 * @enum {string}
 */
export const NotifySmsStatus = {
  Delivered: 'Delivered',
  Permanent: 'Not delivered',
  Temporary: 'Phone not accepting messages right now',
  Technical: 'Technical failure'
}

/**
 * @readonly
 * @enum {string}
 */
export const ParentalRelationship = {
  Mum: 'Mum',
  Dad: 'Dad',
  Guardian: 'Guardian',
  Fosterer: 'Foster carer',
  Other: 'Other',
  Unknown: 'Unknown'
}

/**
 * @readonly
 * @enum {string}
 */
export const PatientStatus = {
  Ineligible: 'Not eligible',
  Consent: 'Needs consent',
  Refused: 'Has a refusal',
  Triage: 'Needs triage',
  Due: 'Due vaccination',
  Deferred: 'Unable to vaccinate',
  PartiallyVaccinated: 'Partially vaccinated',
  Vaccinated: 'Fully vaccinated'
}

/**
 * @readonly
 * @enum {string}
 */
export const PatientConsentStatus = {
  NotScheduled: 'No request scheduled',
  Scheduled: 'Request scheduled',
  NoDetails: 'No contact details',
  NotDelivered: 'Request failed',
  NoResponse: 'No response',
  FollowUp: 'Follow-up requested'
}

/**
 * @readonly
 * @enum {string}
 */
export const PatientDueStatus = {
  Only: 'Due vaccination',
  First: 'Due 1st dose',
  Second: 'Due 2nd dose',
  Third: 'Due 3rd dose'
}

/**
 * @readonly
 * @enum {string}
 */
export const PatientRefusedStatus = {
  Conflict: 'Conflicting consent',
  Refusal: 'Parent refused'
}

/**
 * @readonly
 * @enum {string}
 */
export const PatientDeferredStatus = {
  ChildAbsent: 'Child absent',
  ChildRefused: 'Child refused',
  ChildUnwell: 'Child unwell',
  DoNotVaccinate: 'Contraindicated',
  DelayVaccination: 'Delay vaccination',
  InviteToClinic: 'Invited to clinic'
}

/**
 * @readonly
 * @enum {string}
 */
export const PatientVaccinatedStatus = {
  Vaccinated: 'Vaccinated by team',
  AlreadyVaccinated: 'Already vaccinated'
}

/**
 * @readonly
 * @enum {string}
 */
export const PreScreenQuestion = {
  IsWell: 'is not acutely unwell',
  IsPregnant: 'is not pregnant',
  IsMedicated: 'is not taking any medication which prevents vaccination',
  IsAsthmatic:
    'if they have asthma, has not had a flare-up of symptoms in the past 72 hours, including wheezing or needing to use a reliever inhaler more than usual',
  IsHappy: 'knows what the vaccination is for, and agrees to have it',
  IsNotContraindicated:
    'has no other contraindications which prevent vaccination'
}

/**
 * @readonly
 * @enum {string}
 */
export const ProgrammeType = {
  _4in1: '4-in-1',
  _5in1: '5-in-1',
  _6in1: '6-in-1',
  Flu: 'Flu',
  HPV: 'HPV',
  TdIPV: 'Td/IPV',
  MenACWY: 'MenACWY',
  MMR: 'MMR',
  Other: 'A programme administered outside the UK'
}

/**
 * @readonly
 * @enum {string}
 */
export const SchoolTerm = {
  Autumn: 'Autumn',
  Spring: 'Spring',
  Summer: 'Summer'
}

/**
 * @readonly
 * @enum {string}
 */
export const SessionPresetName = {
  Flu: 'Flu',
  HPV: 'HPV',
  Doubles: 'Doubles',
  MMR: 'MMR(V)'
}

/**
 * @readonly
 * @enum {string}
 */
export const SessionMMRConsent = {
  Standard: 'Standard request',
  Outbreak: 'Outbreak request'
}

/**
 * @typedef {Object} SessionPreset
 * @property {SessionPresetName} name - Session preset name
 * @property {boolean} active - Whether preset is active
 * @property {boolean} [adolescent] - Adolescent programme flag
 * @property {Array<ProgrammeType>} programmeTypes - Preset programme types
 * @property {SchoolTerm} term - School term to schedule session
 */

/**
 * @readonly
 * @enum {Array<SessionPreset>}
 */
export const SessionPresets = [
  {
    name: SessionPresetName.Flu,
    active: true,
    programmeTypes: [ProgrammeType.Flu],
    term: SchoolTerm.Autumn
  },
  {
    name: SessionPresetName.HPV,
    active: true,
    adolescent: true,
    programmeTypes: [ProgrammeType.HPV],
    term: SchoolTerm.Spring
  },
  {
    name: SessionPresetName.Doubles,
    active: true,
    adolescent: true,
    programmeTypes: [ProgrammeType.MenACWY, ProgrammeType.TdIPV],
    term: SchoolTerm.Summer
  },
  {
    name: SessionPresetName.MMR,
    active: true,
    programmeTypes: [ProgrammeType.MMR],
    term: SchoolTerm.Spring
  }
]

/**
 * @readonly
 * @enum {string}
 */
export const RecordVaccineCriteria = {
  NoMMRPreference: 'No preference',
  AlternativeFluInjectionOnly: 'Injected vaccine only',
  AlternativeMMRInjectionOnly: 'Gelatine-free injection only',
  IntranasalOnly: 'Nasal spray only',
  IntranasalPreferred: 'Nasal spray preferred'
}

/**
 * @readonly
 * @enum {string}
 */
export const RegistrationOutcome = {
  Pending: 'Not registered yet',
  Present: 'Attending session',
  Absent: 'Absent from session',
  Complete: 'Completed session'
}

/**
 * @readonly
 * @enum {string}
 */
export const ReplyDecision = {
  AlreadyVaccinated: 'Already vaccinated',
  NoResponse: 'No response',
  Given: 'Consent given',
  OnlyAlternativeInjection: 'Consent given for flu injection',
  OnlyMenACWY: 'Consent given for MenACWY only',
  OnlyTdIPV: 'Consent given for Td/IPV only',
  Declined: 'Follow up requested',
  Refused: 'Consent refused'
}

/**
 * @readonly
 * @enum {string}
 */
export const ReplyMethod = {
  Website: 'Online',
  Phone: 'By phone',
  Paper: 'Paper form',
  InPerson: 'In person'
}

/**
 * @readonly
 * @enum {string}
 */
export const ReplyRefusal = {
  Gelatine: 'Nasal vaccine contains gelatine',
  GelatineMMR:
    'Do not want my child to have the MMR vaccine that contains gelatine',
  AlreadyVaccinated: 'Vaccine already received',
  AlreadyVaccinatedMMR: 'Already had both doses of the MMR vaccine',
  GettingElsewhere: 'Vaccine will be given elsewhere',
  Medical: 'Medical reasons',
  OutsideSchool: 'Do not want vaccination in school',
  Personal: 'Personal choice',
  Other: 'Other'
}

/**
 * @readonly
 * @enum {string}
 */
export const SchoolPhase = {
  Nursery: 'Nursery',
  Primary: 'Primary',
  Secondary: 'Secondary',
  Other: 'Other'
}

/**
 * @readonly
 * @enum {string}
 */
export const SchoolYearGroup = {
  0: 'Reception',
  1: 'Year 1',
  2: 'Year 2',
  3: 'Year 3',
  4: 'Year 4',
  5: 'Year 5',
  6: 'Year 6',
  7: 'Year 7',
  8: 'Year 8',
  9: 'Year 9',
  10: 'Year 10',
  11: 'Year 11',
  12: 'Year 12',
  13: 'Year 13'
}

/**
 * @readonly
 * @enum {string}
 */
export const ScreenVaccineCriteria = {
  AlternativeFluInjectionOnly:
    'The parent has consented to the injected vaccine only',
  AlternativeMMRInjectionOnly:
    'The parent has consented to the injected vaccine only',
  IntranasalOnly: 'The parent has consented to the nasal spray only',
  IntranasalPreferred:
    'The parent has consented to the injected vaccine being offered if the nasal spray is not suitable'
}

/**
 * @readonly
 * @enum {string}
 */
export const ScreenOutcome = {
  Vaccinate: 'Safe to vaccinate',
  VaccinateAlternativeFluInjectionOnly: 'Safe to vaccinate with injection',
  VaccinateAlternativeMMRInjectionOnly:
    'Safe to vaccinate with gelatine-free injection',
  VaccinateIntranasalOnly: 'Safe to vaccinate with nasal spray',
  NeedsTriage: 'Needs triage',
  InviteToClinic: 'Invited to clinic',
  DelayVaccination: 'Delay vaccination',
  DoNotVaccinate: 'Do not vaccinate'
}

/**
 * @readonly
 * @enum {string}
 */
export const SessionStatus = {
  Active: 'In progress',
  Unplanned: 'Not scheduled',
  Planned: 'Scheduled',
  Completed: 'Completed',
  Closed: 'Closed'
}

/**
 * @readonly
 * @enum {string}
 */
export const SessionType = {
  School: 'School session',
  Clinic: 'Community clinic'
}

/**
 * @readonly
 * @enum {boolean|number}
 */
export const TeamDefaults = {
  SessionOpenWeeks: 3,
  SessionReminderWeeks: 1,
  SessionRegistration: true
}

/**
 * @readonly
 * @enum {string}
 */
export const UploadType = {
  Cohort: 'Child records',
  School: 'Class list records',
  Report: 'Vaccination records'
}

/**
 * @readonly
 * @enum {string}
 */
export const UploadStatus = {
  Processing: 'Processing',
  Failed: 'Failed',
  Invalid: 'Invalid',
  Devoid: 'No new records',
  Review: 'Review and approve',
  Approved: 'Approved'
}

/**
 * @readonly
 * @enum {string}
 */
export const UserRole = {
  Nurse: 'Nurse',
  NursePrescriber: 'Prescribing nurse',
  Pharmacist: 'Pharmacist',
  HCA: 'Healthcare assistant',
  MedicalSecretary: 'Medical secretary',
  DataConsumer: 'Data consumer'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccinationOutcome = {
  Vaccinated: 'Vaccinated',
  PartVaccinated: 'Partially vaccinated',
  AlreadyVaccinated: 'Already had the vaccine',
  ConsentRefused: 'Parent refused',
  Refused: 'Child refused',
  Absent: 'Child absent',
  Unwell: 'Child unwell',
  InviteToClinic: 'Invited to clinic',
  DelayVaccination: 'Delay vaccination',
  DoNotVaccinate: 'Contraindicated'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccinationMethod = {
  Intranasal: 'Nasal spray',
  Intramuscular: 'Intramuscular (IM) injection',
  Subcutaneous: 'Subcutaneous injection'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccinationSite = {
  Nose: 'Nose',
  ArmLeftUpper: 'Left arm (upper position)',
  ArmLeftLower: 'Left arm (lower position)',
  ArmRightUpper: 'Right arm (upper position)',
  ArmRightLower: 'Right arm (lower position)',
  ThighLeft: 'Left thigh',
  ThighRight: 'Right thigh',
  Other: 'Other'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccinationProtocol = {
  PGD: 'Patient Group Direction (PGD)',
  PSD: 'Patient Specific Direction (PSD)',
  National: 'National protocol'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccinationSource = {
  Service: 'Recorded in Mavis',
  HistoricalUpload: 'Uploaded as a historical vaccination',
  NhsImmunisationsApi: 'External source such as GP practice',
  ConsentRefusal: 'Parent reported already vaccinated'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccinationSyncStatus = {
  CannotSync: 'Cannot sync',
  NotSynced: 'Not synced',
  Pending: 'Pending',
  Synced: 'Synced',
  Failed: 'Failed'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccineCriteria = {
  AlternativeInjection: 'Gelatine-free injection',
  Injection: 'Injection',
  Intranasal: 'Nasal spray'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccineMethod = {
  Injection: 'Injection',
  Intranasal: 'Nasal spray'
}

/**
 * @readonly
 * @enum {string}
 */
export const VaccineSideEffect = {
  AppetiteLoss: 'loss of appetite',
  BlockedNose: 'a runny or blocked nose',
  Bruising: 'bruising or itching at the site of the injection',
  Dizzy: 'dizziness',
  Drowsy: 'feeling drowsy',
  Headache: 'a headache',
  Irritable: 'feeling irritable',
  PainArms: 'pain in the arms, hands, fingers',
  PainSite: 'pain, swelling or itchiness where the injection was given',
  Rash: 'a rash',
  Sick: 'feeling or being sick',
  SickFeeling: 'feeling sick (nausea)',
  Tiredness: 'general tiredness',
  Temperature: 'a high temperature',
  TemperatureShiver: 'a high temperature, or feeling hot and shivery',
  Unwell: 'generally feeling unwell'
}
