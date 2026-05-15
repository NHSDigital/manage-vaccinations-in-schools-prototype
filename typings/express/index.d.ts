import 'express-flash'
import 'express-session'
import {
  ClinicBooking,
  Consent,
  Reply,
  Session,
  Team,
  User
} from '../../app/models.js'

declare module 'express-serve-static-core' {
  interface Locals extends ApplicationLocals {
    data: Record<string, any> & ApplicationData
  }
}

declare module 'express-session' {
  interface SessionData {
    data: Record<string, any> & ApplicationData
    referrer: string
  }
}

interface ApplicationData {
  booking?: ClinicBooking
  consent?: Consent
  organisationName?: string
  reply?: Reply
  teams?: Team[]
  team?: Team
  token?: User
  users?: User[]
}

interface ApplicationLocals extends ApplicationData {
  bookingPhoneNumber?: string
  currentPage?: string
  session?: Session
}
