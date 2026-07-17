import 'express-flash'
import 'express-session'
import {
  ClinicBooking,
  Consent,
  PatientSession,
  Reply,
  Session,
  Team,
  User
} from '../../app/models.js'

declare module 'express-serve-static-core' {
  interface Locals extends ApplicationLocals {
    data: Record<string, unknown> & ApplicationData
  }
}

declare module 'express-session' {
  interface SessionData {
    data: Record<string, unknown> & ApplicationData
    referrer: string
  }
}

interface ApplicationData {
  booking?: ClinicBooking
  cancellation?: Record<string, any>
  clinicAdvert?: Record<string, any>
  programmesToOffer?: Record<string, any>
  clinicPatient_ids?: string | string[]
  consent?: Consent
  counts?: {
    appointments: number
    consents: number
    review: number
  }
  organisationName?: string
  patientSession?: PatientSession
  patientSession_uuid?: string
  preScreen?: Record<string, any>
  reply?: Reply
  team?: Team
  teams?: Team[]
  token?: User
  transaction?: Record<string, any>
  users?: User[]
  wizard?: Record<string, any>
}

interface ApplicationLocals extends ApplicationData {
  bookingPhoneNumber?: string
  currentPage?: string
  session?: Session
}
