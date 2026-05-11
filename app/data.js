import vaccines from './datasets/vaccines.js'
import { ClinicBooking, Consent, Move, Notice, Session } from './models.js'
import { camelToKebabCase } from './utils/string.js'

/**
 * Load default values for user session data from JSON data files
 *
 * These are automatically added via the `autoStoreData` middleware. A values
 * will only be added to the session if it doesn't already exist. This may be
 * useful for testing journeys where users are returning or logging in to an
 * existing application.
 */
const namespaces = [
  'batches',
  'clinicBookings',
  'clinics',
  'instructions',
  'moves',
  'notices',
  'patients',
  'patientSessions',
  'pdsRecords',
  'programmes',
  'replies',
  'schools',
  'sessions',
  'teams',
  'uploads',
  'users',
  'vaccinations'
]

const data = {}

for (const namespace of namespaces) {
  // We don’t use import attributes because JSON files are not created when
  // linting files in CI workflow
  try {
    const fileName = camelToKebabCase(namespace)
    const module = await import(`../.data/${fileName}.json`, {
      with: { type: 'json' }
    })
    data[namespace] = module.default
  } catch {
    data[namespace] = {}
  }
}

data.defaultBatches = {}
data.downloads = {}
data.team = data.teams['001'] // Use Coventry and Warwickshire as team
data.vaccines = vaccines
data.wizard = {}

// Statistics
const unmatchedAppointmentCount = ClinicBooking.findAll(data)
  ?.flatMap(({ appointments }) => appointments)
  .filter(({ patient_uuid }) => !patient_uuid).length
const unmatchedConsentCount = Consent.findAll(data).length || 0
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
