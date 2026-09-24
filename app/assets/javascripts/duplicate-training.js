// Research scaffolding for the duplicate training test sets (test-1 to test-6).
// Selection, tags and the set bar are painted by CSS from the checked radio. This
// file does only what CSS cannot, and is shared by the six pages rather than
// copied into each (CLAUDE.md rule 9). It is about 50 lines, over the 20-line
// guide, because the five research behaviours below share the same radio and
// storage lookups; the size was accepted for this task. Two parts deliberately
// deviate from rules 2 and 7 at the brief's request: the Add comment button is
// swapped in by script when the checkbox is ticked, and the panel question is
// written by script from the checked radio.
const bar = document.querySelector("[data-set-bar][data-set]")
if (bar) {
  const set = bar.dataset.set
  const q = (selector) => document.querySelector(selector)
  const radios = document.querySelectorAll('input[name="preferred-record"]')
  const checkedRadio = () => q('input[name="preferred-record"]:checked')
  const read = (key) => { try { return sessionStorage.getItem(key) } catch (error) { return null } }
  const write = (key, value) => { try { value === null ? sessionStorage.removeItem(key) : sessionStorage.setItem(key, value) } catch (error) {} }
  const CHOICE_KEY = `duplicate-training:choice:${set}`

  // CSS cannot remember a choice across page loads: re-check the stored radio on a
  // fresh load (the browser restores form state itself on back), and store each change
  if (!checkedRadio()) { const saved = q(`input[name="preferred-record"][value="${read(CHOICE_KEY)}"]`); if (saved) saved.checked = true }
  for (const radio of radios) radio.addEventListener("change", () => { write(CHOICE_KEY, radio.value); wordQuestion() })

  // CSS cannot untick a radio from a link
  q("[data-clear-choice]").addEventListener("click", (event) => { event.preventDefault(); for (const radio of radios) radio.checked = false; write(CHOICE_KEY, null); wordQuestion() })

  // CSS cannot open the comment panel from the action link, and (by decision, rules 2
  // and 7) the Add comment button and the panel question are swapped here rather than in CSS
  const toggle = q("[data-comment-toggle]"), panel = q("[data-comment-panel]"), field = document.getElementById("comment")
  const buttons = { skip: q('[data-set-action="skip"]'), review: q('[data-set-action="review"]'), comment: q('[data-set-action="comment"]') }
  const wordQuestion = () => { q("[data-comment-question]").textContent = checkedRadio() ? "Why did you choose this record?" : "Why did you skip this set?" }
  const showButtons = () => {
    const open = !panel.hidden, wants = toggle.checked
    buttons.skip.classList.toggle("nhsuk-u-display-none", open)
    buttons.review.classList.toggle("nhsuk-u-display-none", open || wants)
    buttons.comment.classList.toggle("nhsuk-u-display-none", open || !wants)
  }
  // CSS cannot measure the bar: its height is the one layout value written to a custom
  // property, which the sticky table feet and the page's bottom padding read
  const measureBar = () => document.documentElement.style.setProperty("--app-set-bar-height", bar.offsetHeight + "px")
  const openPanel = () => { if (!panel.hidden) { field.focus(); return } panel.hidden = false; wordQuestion(); showButtons(); measureBar(); field.focus() }
  const closePanel = () => { field.value = ""; if (panel.hidden) { showButtons(); return } panel.hidden = true; showButtons(); measureBar() }
  toggle.addEventListener("change", () => toggle.checked ? showButtons() : closePanel())
  for (const button of Object.values(buttons)) button.addEventListener("click", (event) => { if (!toggle.checked) { markProgressed(); return } event.preventDefault(); openPanel() })
  q("[data-comment-cancel]").addEventListener("click", (event) => { event.preventDefault(); closePanel(); (checkedRadio() ? (toggle.checked ? buttons.comment : buttons.review) : buttons.skip).focus() })

  // CSS cannot record the decision: submit stores decision and comment for this set, logs
  // them, marks the set as moved past for the Duplicate records count, and moves on
  const markProgressed = () => {
    let progressed = []
    try { progressed = JSON.parse(read("duplicate-training:progressed") || "[]") } catch (error) {}
    if (!progressed.includes(set)) progressed.push(set)
    write("duplicate-training:progressed", JSON.stringify(progressed))
  }
  q("[data-comment-form]").addEventListener("submit", (event) => {
    event.preventDefault()
    const checked = checkedRadio()
    const entry = { decision: checked ? checked.value : "skip", comment: field.value }
    write(`duplicate-training:comment:${set}`, JSON.stringify(entry))
    console.log(`[duplicate-training] ${set}:`, JSON.stringify(entry))
    markProgressed()
    window.location.assign(event.target.action)
  })
}
