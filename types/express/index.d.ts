import { Express } from 'express-serve-static-core'

declare global {
  namespace Express {
    interface Request {
      session: {
        data: {
          batch: Batch
          batches: Record<string, Batch>
          clinicBookings: Record<string, ClinicBooking>
          clinic: Clinic
          clinics: Record<string, Clinic>
          consent: Consent
          defaultBatches: Record<string, DefaultBatch>
          downloads: Record<string, Download>
          features: T
          instructions: Record<string, Instruction>
          moves: Record<string, Move>
          notices: Record<string, Notice>
          patients: Record<string, Patient>
          patientSessions: Record<string, PatientSession>
          pdsRecords: T
          programmes: Record<string, Programme>
          replies: Record<string, Reply>
          schools: Record<string, School>
          sessions: Record<string, Session>
          team: Team
          teams: Record<string, Team>
          token: any
          uploads: Record<string, Upload>
          users: Record<string, User>
          vaccinations: Record<string, Vaccination>
          vaccines: Record<string, Vaccine>
          wizard: any
        }
        referrer: string
      }
    }
  }
}
