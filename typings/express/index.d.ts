import 'express-flash'
import 'express-session'
import {
  ClinicBooking,
  ClinicInvitation,
  Consent,
  Patient,
  PatientSession,
  Reply,
  School,
  Session,
  Team,
  User
} from '../../app/models.js'
import type { ClinicInvitationJourneyType } from '../../app/enums.js'
import type { ClinicInvitationOptions } from '../../app/models/clinic-invitation.js'

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
  bookingInvitation_id?: string
  cancellation?: Record<string, any>
  clinicInvitation?: ClinicInvitationOptions
  clinicInvitationQuery?: Record<string, any>
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
  clinicInvitation?: ClinicInvitation
  currentPage?: string
  inviteJourneyType?: ClinicInvitationJourneyType
  patient?: Patient
  school?: School
  session?: Session
}
