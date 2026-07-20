import i18n from 'i18n'

import { en } from '../locales/en.js'

i18n.configure({
  cookie: 'locale',
  defaultLocale: 'en',
  objectNotation: true,
  // @ts-ignore
  staticCatalog: { en }
})

export default i18n
