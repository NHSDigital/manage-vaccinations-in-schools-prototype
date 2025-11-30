import '/nhsuk-prototype-kit/javascripts/send-unchecked-checkboxes.js'

import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  FileUpload,
  Header,
  NotificationBanner,
  Radios,
  SkipLink,
  Tabs
} from '/nhsuk-frontend/nhsuk-frontend.min.js'

import { Autocomplete } from './components/autocomplete.js'
import { Sticky } from './components/sticky.js'
import { AddAnotherComponent } from './custom-elements/add-another.js'
import { AutoSubmitComponent } from './custom-elements/auto-submit.js'

// Register custom elements
customElements.define('app-add-another', AddAnotherComponent)
customElements.define('app-auto-submit', AutoSubmitComponent)

// Initiate NHS.UK frontend components on page load
document.addEventListener('DOMContentLoaded', () => {
  createAll(Autocomplete)
  createAll(Button, { preventDoubleClick: true })
  createAll(Checkboxes)
  createAll(ErrorSummary)
  createAll(FileUpload)
  createAll(Header)
  createAll(Sticky)
  createAll(Radios)
  createAll(NotificationBanner)
  createAll(SkipLink)
  createAll(Tabs)
})
