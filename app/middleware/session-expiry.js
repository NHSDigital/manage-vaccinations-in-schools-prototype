export const DEFAULT_SESSION_MAX_AGE = 1000 * 60 * 60 * 4 // 4 hours
const FIRST_REQUEST_SESSION_MAX_AGE = 1000 * 60 * 30 // 30 minutes

/**
 * Shorten the cookie (and therefore stored session data's) lifetime for a
 * session's very first request, then restore it to the normal length from
 * its second request onwards
 *
 * Every session - real visitor or not - gets the full seeded dataset copied
 * into it and persisted, so this doesn't stop that write. It does bound how
 * long a one-off session's data survives afterwards: a burst of requests that
 * each start a brand new, never-reused session (the F4 attack pattern, and
 * also bots/crawlers) gets pruned from the shared session store within
 * minutes rather than sitting there for the full 4-hour session length.
 *
 * @param {Request} request - Request
 * @param {Response} response - Response
 * @param {NextFunction} next - Next function
 */
export const sessionExpiry = (request, response, next) => {
  if (request.session.establishedAt || request.session.data?.token) {
    request.session.cookie.maxAge = DEFAULT_SESSION_MAX_AGE
  } else {
    request.session.establishedAt = Date.now()
    request.session.cookie.maxAge = FIRST_REQUEST_SESSION_MAX_AGE
  }

  next()
}

/**
 * @import { NextFunction, Request, Response } from 'express'
 */
