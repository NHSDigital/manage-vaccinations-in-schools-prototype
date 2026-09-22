import autoprefixer from 'autoprefixer'
import sessionInDatabase from 'connect-pg-simple'
import { sassPlugin } from 'esbuild-sass-plugin'
import express from 'express'
import session from 'express-session'
import NHSPrototypeKit, { config } from 'nhsuk-prototype-kit'
import { Pool } from 'pg'
import postcss from 'postcss'

import sessionDataDefaults from './app/data.js'
import filters from './app/filters.js'
import globals from './app/globals.js'
import { DEFAULT_SESSION_MAX_AGE } from './app/middleware/session-expiry.js'
import { sessionRateLimit } from './app/middleware/session-rate-limit.js'
import routes from './app/routes.js'

const { DATABASE_URL, NODE_ENV, SESSION_SECRET } = process.env

if (DATABASE_URL && !SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET environment variable must be set when DATABASE_URL is set'
  )
}

const processor = postcss([
  autoprefixer({
    env: 'stylesheets'
  })
])

// Create the app ourselves so the rate limiter runs before the prototype
// kit's own session middleware - otherwise a rate-limited request would
// already have had the full seeded dataset copied into (and persisted as
// part of) its session before we get a chance to reject it
const app = express()

if (DATABASE_URL) {
  app.use(sessionRateLimit)
}

const prototype = await NHSPrototypeKit.init({
  app,
  buildOptions: {
    entryPoints: [
      'app/assets/stylesheets/*.scss',
      'app/assets/javascripts/*.js'
    ],
    external: ['/nhsuk-prototype-kit/*'],
    plugins: [
      sassPlugin({
        embedded: true,
        loadPaths: config.modulePaths,
        quietDeps: true,
        sourceMap: true,
        sourceMapIncludeSources: true,
        async transform(css, resolveDir, filePath) {
          const result = await processor.process(css, {
            from: filePath
          })

          return result.css
        }
      })
    ],
    tsconfigRaw: {}
  },
  filters,
  globals,
  routes,
  serviceName: 'Manage vaccinations in schools',
  ...(DATABASE_URL && {
    session: session({
      cookie: {
        maxAge: DEFAULT_SESSION_MAX_AGE,
        sameSite: 'lax',
        secure: NODE_ENV === 'production'
      },
      resave: false,
      // Without this, a plain GET with no other session change never sends
      // a fresh Set-Cookie (express-session ignores `cookie` when deciding
      // if a session was modified), so sessionExpiry's cookie.maxAge changes
      // would never actually reach the browser
      rolling: true,
      saveUninitialized: false,
      secret: SESSION_SECRET,
      store: new (sessionInDatabase(session))({
        pool: new Pool({
          connectionString: DATABASE_URL,
          ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        })
      })
    })
  }),
  sessionDataDefaults,
  viewsPath: [
    'app',
    'app/views',
    'node_modules/govuk-frontend/dist',
    'node_modules/nhsuk-decorated-components'
  ]
})

prototype.start()
