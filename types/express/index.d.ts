import { Express } from 'express-serve-static-core'
import 'connect-flash'
import 'express-session'

declare module 'express-session' {
  interface SessionData {
    data: Record<string, any>
    referrer: string
  }
}
