import sessionInDatabase from 'connect-pg-simple'
import session from 'express-session'
import NHSPrototypeKit from 'nhsuk-prototype-kit'
import { Pool } from 'pg'

import sessionDataDefaults from './app/data.js'
import filters from './app/filters.js'
import globals from './app/globals.js'
import routes from './app/routes.js'

const { DATABASE_URL, NODE_ENV } = process.env

const prototype = await NHSPrototypeKit.init({
  buildOptions: {
    entryPoints: [
      'app/assets/stylesheets/*.scss',
      'app/assets/javascripts/*.js'
    ]
  },
  filters,
  globals,
  routes,
  serviceName: 'Manage vaccinations in schools',
  ...(DATABASE_URL && {
    session: session({
      cookie: {
        maxAge: 1000 * 60 * 60 * 4, // 4 hours
        secure: NODE_ENV === 'production'
      },
      resave: false,
      saveUninitialized: false,
      secret: 'manage-vaccinations-in-schools-prototype',
      store: new (sessionInDatabase(session))({
        pool: new Pool({
          connectionString: DATABASE_URL,
          ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
        })
      })
    })
  }),
  sessionDataDefaults,
  viewsPath: ['app', 'app/views', 'node_modules/nhsuk-decorated-components']
})

prototype.start()
