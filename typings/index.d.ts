export interface PatientFilterQuery {
  canBeOfferedCatchUps?: string
  clinicStatus?: string
  consent?: string
  instruct?: string
  patientConsent?: string
  patientDeferred?: string
  patientIneligible?: string
  patientRefused?: string
  patientTriage?: string
  patientVaccinated?: string
  option?: string | string[]
  programme_id?: string | string[]
  q?: string
  register?: string
  status?: string
  vaccineCriteria?: string
  yearGroup?: string | string[]
}

export interface SchoolFilterQuery {
  option?: string | string[]
  phase?: string | string[]
  programme_id?: string | string[]
  q?: string
}
