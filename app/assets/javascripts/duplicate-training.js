// Research scaffolding for the duplicate training pages, one shared file rather than
// inline copies (CLAUDE.md rule 9). Selection, tags and the set bar status are painted
// by CSS from the checked radio; product state is read from the form controls only.
// Part 1 runs on every page with a choose-record form (the 6-records table demo and
// the six test sets). Part 2 runs on the test sets only, which carry data-set on the
// bar. Removing this file leaves the form, Skip and Submit working with HTML alone.

// scaffolding: simulated server-side validation. In Rails the form posts and, with no
// record chosen, the controller re-renders the page with the error summary, the inline
// error, the error class on the form group and aria-describedby on the fieldset, and
// nhsuk-frontend focuses the summary on load. Here the pre-rendered, hidden errors are
// shown in place and focus is moved, instead of a round trip the prototype cannot make.
const form = document.querySelector('[data-choose-form]')
const checkedRadio = () =>
  form.querySelector('input[name="preferred-record"]:checked')
form.addEventListener('submit', (event) => {
  if (checkedRadio()) return
  event.preventDefault()
  const summary = document.querySelector('[data-choose-error-summary]')
  summary.hidden = false
  form.querySelector('[data-choose-error]').hidden = false
  form
    .querySelector('[data-choose-group]')
    .classList.add('nhsuk-form-group--error')
  form
    .querySelector('fieldset')
    .setAttribute('aria-describedby', 'preferred-record-error')
  summary.focus()
})

// scaffolding: research session state for the six test sets. Remembers the choice per
// set, opens the comment panel, stores the decision and comment, and marks the set as
// moved past for the Duplicate records count and the completion page. Two parts
// deliberately deviate from rules 2 and 7 at the brief's request: the Add comment
// button is swapped in by script when the checkbox is ticked, and the panel question
// is written by script from the button pressed.
const bar = document.querySelector('[data-set-bar][data-set]')
if (bar) {
  const set = bar.dataset.set
  const q = (selector) => document.querySelector(selector)
  const radios = form.querySelectorAll('input[name="preferred-record"]')
  // This file runs in the browser; the Node built-ins rule does not apply to Web Storage
  /* eslint-disable n/no-unsupported-features/node-builtins */
  const read = (key) => {
    try {
      return window.sessionStorage.getItem(key)
    } catch {
      return null
    }
  }
  const write = (key, value) => {
    try {
      value === null
        ? window.sessionStorage.removeItem(key)
        : window.sessionStorage.setItem(key, value)
    } catch {
      // Storage unavailable: carry on without it
    }
  }
  /* eslint-enable n/no-unsupported-features/node-builtins */
  const CHOICE_KEY = `duplicate-training:choice:${set}`

  // Re-check the stored radio on a fresh load (the browser restores form state itself
  // on back), and store each change
  if (!checkedRadio()) {
    const saved = q(
      `input[name="preferred-record"][value="${read(CHOICE_KEY)}"]`
    )
    if (saved) saved.checked = true
  }
  for (const radio of radios)
    radio.addEventListener('change', () => write(CHOICE_KEY, radio.value))

  // Which bar button was pressed. Skip ignores any checked radio: it clears the stored
  // choice so the completion page reads the set as skipped. Either way the set is
  // marked as moved past.
  let action = 'submit'
  const finish = () => {
    let progressed = []
    try {
      progressed = JSON.parse(read('duplicate-training:progressed') || '[]')
    } catch {
      // Storage unavailable: carry on without it
    }
    if (!progressed.includes(set)) progressed.push(set)
    write('duplicate-training:progressed', JSON.stringify(progressed))
    if (action === 'skip') write(CHOICE_KEY, null)
  }

  // Comment panel: opened by Skip or Add comment when the checkbox is ticked, in place
  // of leaving the page; the bar is measured into --app-set-bar-height as it opens
  // and closes, for the sticky table feet and the page's bottom padding
  const toggle = q('[data-comment-toggle]'),
    panel = q('[data-comment-panel]'),
    field = document.getElementById('comment')
  const buttons = {
    skip: q('[data-set-action="skip"]'),
    submit: q('[data-set-action="submit"]'),
    comment: q('[data-set-action="comment"]')
  }
  const showButtons = () => {
    const open = !panel.hidden,
      wants = toggle.checked
    buttons.skip.classList.toggle('nhsuk-u-display-none', open)
    buttons.submit.classList.toggle('nhsuk-u-display-none', open || wants)
    buttons.comment.classList.toggle('nhsuk-u-display-none', open || !wants)
  }
  const measureBar = () =>
    document.documentElement.style.setProperty(
      '--app-set-bar-height',
      `${bar.offsetHeight}px`
    )
  const openPanel = () => {
    q('[data-comment-question]').textContent =
      action === 'skip'
        ? 'Why did you skip this set?'
        : 'Why did you choose this record?'
    if (panel.hidden) {
      panel.hidden = false
      showButtons()
      measureBar()
    }
    field.focus()
  }
  const closePanel = () => {
    field.value = ''
    if (panel.hidden) {
      showButtons()
      return
    }
    panel.hidden = true
    showButtons()
    measureBar()
  }
  toggle.addEventListener('change', () =>
    toggle.checked ? showButtons() : closePanel()
  )
  buttons.skip.addEventListener('click', (event) => {
    action = 'skip'
    if (!toggle.checked) {
      finish()
      return
    }
    event.preventDefault()
    openPanel()
  })
  buttons.comment.addEventListener('click', (event) => {
    event.preventDefault()
    form.requestSubmit()
  })
  // Runs after the validation listener above, so only a valid submit reaches here
  form.addEventListener('submit', (event) => {
    if (event.defaultPrevented) return
    action = 'submit'
    if (!toggle.checked) {
      finish()
      return
    }
    event.preventDefault()
    openPanel()
  })
  q('[data-comment-cancel]').addEventListener('click', (event) => {
    event.preventDefault()
    closePanel()
    ;(action === 'skip' ? buttons.skip : buttons.comment).focus()
  })

  // Submit in the panel stores decision and comment for this set, logs them, marks the
  // set as moved past, and moves on as the bar would have; nothing is sent anywhere
  q('[data-comment-form]').addEventListener('submit', (event) => {
    event.preventDefault()
    const entry = {
      decision: action === 'skip' ? 'skip' : checkedRadio().value,
      comment: field.value
    }
    write(`duplicate-training:comment:${set}`, JSON.stringify(entry))
    console.log(`[duplicate-training] ${set}:`, JSON.stringify(entry))
    finish()
    window.location.assign(event.target.action)
  })
}
