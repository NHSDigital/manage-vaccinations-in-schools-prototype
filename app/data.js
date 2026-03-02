import vaccines from './datasets/vaccines.js'
import batches from '../.data/batches.json' with { type: 'json' }
import clinics from '../.data/clinics.json' with { type: 'json' }
import instructions from '../.data/instructions.json' with { type: 'json' }
import moves from '../.data/moves.json' with { type: 'json' }
import notices from '../.data/notices.json' with { type: 'json' }
import patients from '../.data/patients.json' with { type: 'json' }
import patientSessions from '../.data/patient-sessions.json' with { type: 'json' }
import programmes from '../.data/programmes.json' with { type: 'json' }
import replies from '../.data/replies.json' with { type: 'json' }
import schools from '../.data/schools.json' with { type: 'json' }
import sessions from '../.data/sessions.json' with { type: 'json' }
import teams from '../.data/teams.json' with { type: 'json' }
import uploads from '../.data/uploads.json' with { type: 'json' }
import users from '../.data/users.json' with { type: 'json' }
import vaccinations from '../.data/vaccinations.json' with { type: 'json' }

import { Consent, Move, Notice, Session } from './models.js'

// Use Coventry and Warwickshire as team
const team = teams['001']

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
  clinics,
  counts: {},
  defaultBatches: {},
  downloads: {},
  features: {},
  instructions,
  moves,
  notices,
  patients,
  patientSessions,
  programmes,
  replies,
  schools,
  sessions,
  team,
  teams,
  uploads,
  users,
  vaccinations,
  vaccines,
  wizard: {}
}

// Statistics
data.counts.consents = Consent.findAll(data).length
data.counts.moves = Move.findAll(data).length
data.counts.notices = Notice.findAll(data).filter(
  ({ archivedAt }) => !archivedAt
).length
data.counts.sessions = Session.findAll(data).length

export default data
