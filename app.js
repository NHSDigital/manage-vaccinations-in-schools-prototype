import autoprefixer from 'autoprefixer'
import sessionInDatabase from 'connect-pg-simple'
import { sassPlugin } from 'esbuild-sass-plugin'
import session from 'express-session'
import NHSPrototypeKit, { config } from 'nhsuk-prototype-kit'
import { Pool } from 'pg'
import postcss from 'postcss'

import sessionDataDefaults from './app/data.js'
import filters from './app/filters.js'
import globals from './app/globals.js'
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

const prototype = await NHSPrototypeKit.init({
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
        maxAge: 1000 * 60 * 60 * 4, // 4 hours
        sameSite: 'lax',
        secure: NODE_ENV === 'production'
      },
      resave: false,
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
