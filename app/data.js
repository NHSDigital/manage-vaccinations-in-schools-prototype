import batches from '../.data/batches.json' with { type: 'json' }
import clinicBookings from '../.data/clinic-bookings.json' with { type: 'json' }
import clinics from '../.data/clinics.json' with { type: 'json' }
import contacts from '../.data/contacts.json' with { type: 'json' }
import moves from '../.data/moves.json' with { type: 'json' }
import notices from '../.data/notices.json' with { type: 'json' }
import patientSessions from '../.data/patient-sessions.json' with { type: 'json' }
import patients from '../.data/patients.json' with { type: 'json' }
import pdsRecords from '../.data/pds-records.json' with { type: 'json' }
import programmes from '../.data/programmes.json' with { type: 'json' }
import replies from '../.data/replies.json' with { type: 'json' }
import schools from '../.data/schools.json' with { type: 'json' }
import sessions from '../.data/sessions.json' with { type: 'json' }
import teams from '../.data/teams.json' with { type: 'json' }
import uploads from '../.data/uploads.json' with { type: 'json' }
import users from '../.data/users.json' with { type: 'json' }
import vaccinations from '../.data/vaccinations.json' with { type: 'json' }

import vaccines from './datasets/vaccines.js'
import { ClinicBooking, Consent, Move, Notice, Session } from './models.js'

/**
 * Default values for user session data
 *
 * These are automatically added via the `autoStoreData` middleware. A values
 * will only be added to the session if it doesn't already exist. This may be
 * useful for testing journeys where users are returning or logging in to an
 * existing application.
 */
const data = {
  batches,
  clinicBookings,
  clinics,
  contacts,
  defaultBatches: {},
  downloads: {},
  moves,
  notices,
  patients,
  patientSessions,
  pdsRecords,
  programmes,
  replies,
  schools,
  sessions,
  teams,
  uploads,
  users,
  vaccinations,
  vaccines,
  wizard: {}
}

// Statistics
const unmatchedAppointmentCount = ClinicBooking.findAll(data)
  ?.flatMap(({ appointments }) => appointments)
  .filter(({ patient_uuid }) => !patient_uuid).length
const unmatchedConsentCount =
  Consent.findAll(data)
    .filter((consent) => !consent.isInvalidated)
    .filter((consent) => !consent.patient_uuid).length || 0
const moveCount = Move.findAll(data).length || 0
const noticeCount =
  Notice.findAll(data).filter(({ archivedAt }) => !archivedAt).length || 0

data.counts = {
  appointments: unmatchedAppointmentCount,
  consents: unmatchedConsentCount,
  moves: moveCount,
  notices: noticeCount,
  review:
    unmatchedAppointmentCount + unmatchedConsentCount + moveCount + noticeCount,
  sessions: Session.findAll(data).length
}

export default data
