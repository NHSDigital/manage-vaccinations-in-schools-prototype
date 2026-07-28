import '/nhsuk-prototype-kit/javascripts/send-unchecked-checkboxes.js'

import {
  createAll,
  Button,
  Checkboxes,
  ErrorSummary,
  Radios,
  SkipLink,
  Tabs
} from '/nhsuk-frontend/nhsuk-frontend.min.js'

import { Autocomplete } from './components/autocomplete.js'

// Initiate NHS.UK frontend components on page load
document.addEventListener('DOMContentLoaded', () => {
  createAll(Autocomplete)
  createAll(Button, { preventDoubleClick: true })
  createAll(Checkboxes)
  createAll(ErrorSummary)
  createAll(Radios)
  createAll(SkipLink)
  createAll(Tabs)
})
