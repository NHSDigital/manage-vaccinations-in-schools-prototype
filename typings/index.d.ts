export interface PatientFilterQuery {
  clinicStatus?: string
  instruct?: string
  patientConsent?: string
  patientDeferred?: string
  patientRefused?: string
  patientTriage?: string
  patientVaccinated?: string
  option?: string | string[]
  programme_id?: string | string[]
  q?: string
  register?: string
  report?: string
  vaccineCriteria?: string
  yearGroup?: string | string[]
}
