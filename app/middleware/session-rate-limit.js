import expressRateLimit from 'express-rate-limit'

/**
 * Limit how fast a single IP can create new sessions
 *
 * Every request without an existing session cookie causes the prototype
 * kit to populate `session.data` with a full copy of the seeded dataset
 * (multiple megabytes), which then gets persisted to the shared session
 * store.
 *
 * This rate-limiting must run before the session/session-data middleware,
 * so a request that's rate limited never reaches the point where that
 * copy - and the resulting store write - happens. Requests that already
 * carry a session cookie are exempt, since they aren't creating new
 * copies of the dataset.
 */
export const sessionRateLimit = expressRateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (request) => Boolean(request.headers.cookie?.includes('connect.sid=')),
  message: 'Too many requests. Please try again shortly.'
})
