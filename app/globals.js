import _ from 'lodash'

import { healthQuestions } from './datasets/health-questions.js'
import {
  InstructionOutcome,
  PatientConsentStatus,
  PatientRefusedStatus
} from './enums.js'
import { Location, User } from './models.js'
import { getSessionActivityCount } from './utils/session.js'
import {
  camelToKebabCase,
  formatHealthAnswer,
  formatLink,
  formatMarkdown
} from './utils/string.js'

/**
 * Prototype specific global functions for use in Nunjucks templates.
 *
 * @returns {object} Globals
 */
export default () => {
  const globals = {}

  /**
   * Get boolean form field items
   *
   * @returns {object} Form field items
   */
  globals.booleanItems = [
    { text: 'Yes', value: true },
    { text: 'No', value: false }
  ]

  /**
   * Get form field items for a given Enum
   *
   * @param {object} Enum - Enumerable name
   * @returns {object} Form field items
   */
  globals.enumItems = function (Enum) {
    return Object.entries(Enum).map(([, value]) => ({
      text: value,
      value
    }))
  }

  globals.otherCountryItems = function (countries, value) {
    countries = Object.entries(countries).filter(
      ([, name]) => name !== 'United Kingdom'
    )

    return [
      {
        value: '',
        text: 'Select a country',
        disabled: true,
        ...(!value && { selected: true })
      },
      ...countries.map(([value, name]) => ({
        text: name,
        value: name,
        ...(value && { selected: value === name })
      }))
    ]
  }

  /**
   * Get location form field items
   *
   * @param {object} locations - Locations data
   * @param {string} value - Current value
   * @returns {object} Form field items
   */
  globals.locationItems = function (locations, value) {
    const type = Object.values(locations).at(1).phase
      ? 'school'
      : 'community clinic'

    return [
      {
        value: '',
        text: `Select a ${type}`,
        disabled: true,
        ...(!value && { selected: true })
      },
      ...Object.values(locations)
        .map((location) => new Location(location))
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((location) => ({
          text: location.name,
          value: location.id,
          ...(value && { selected: value === location.id }),
          ...(location.address && {
            attributes: {
              'data-hint': location.formatted.address
            }
          })
        }))
    ]
  }

  globals.timelineItems = function (auditEvents) {
    const { filters } = this.ctx.settings.nunjucksEnv
    const timelineItems = []

    for (const auditEvent of Object.values(auditEvents)) {
      timelineItems.push({
        headingText: formatMarkdown(auditEvent.name),
        isPastItem: auditEvent.isPastEvent,
        html: auditEvent.formatted?.note,
        description: filters.safe(auditEvent.formatted.createdAtAndBy)
      })
    }

    return timelineItems
  }

  /**
   * Get user form field items
   *
   * @param {object} users - Users data
   * @param {string} value - Current value
   * @returns {object} Form field items
   */
  globals.userItems = function (users, value) {
    return [
      {
        value: '',
        text: 'Select a user',
        disabled: true,
        ...(!value && { selected: true })
      },
      ...Object.values(users)
        .map((user) => new User(user))
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
        .map((user) => ({
          text: user.fullName,
          value: user.uid,
          ...(value && { selected: value === user.uid }),
          ...(user.email && {
            attributes: {
              'data-hint': user.email
            }
          })
        }))
    ]
  }

  /**
   * Get triage outcome form field items
   *
   * @param {Array} outcomes - Screen outcomes
   * @returns {object} Form field items
   */
  globals.triageOutcomeItems = function (outcomes) {
    const { __ } = this.ctx

    return Object.values(outcomes).map((value) =>
      value === 'or'
        ? { divider: 'or' }
        : {
            text: __(`triage.outcome.${value}`),
            value
          }
    )
  }

  /**
   * Inject Nunjucks generated HTML into an object requiring conditional HTML
   *
   * @param {object} object
   * @param {string} value
   * @param {string} html
   * @returns {object} Nunjucks parameters
   */
  globals.injectConditionalHtml = function (object, value, html) {
    const item = object.find((item) => item.value === value)

    if (item) {
      item.conditional = { html }
    }

    return object
  }

  /**
   * Get checkbox items for a given Enum
   *
   * @param {object} Enum - Enumerable name
   * @param {string} selected - Selected value
   * @returns {object} Checkbox items
   */
  globals.checkboxFilterItems = function (Enum, selected) {
    return Object.values(Enum).map((value) => ({
      text: value,
      value,
      checked: value === selected
    }))
  }

  /**
   * Get radio items for a given Enum
   *
   * @param {object} Enum - Enumerable name
   * @param {string} selected - Selected value
   * @returns {object} Radio items
   */
  globals.radioFilterItems = function (Enum, selected) {
    return [
      {
        text: 'Any',
        value: 'none',
        checked: !selected || selected === 'none'
      },
      ...Object.values(Enum).map((value) => ({
        text: value,
        value,
        checked: value === selected
      }))
    ]
  }

  /**
   * Convert errors object to array for errorSummary component
   *
   * @param {object} errors - Error messages
   * @returns {Array} Error list
   */
  globals.errorList = function (errors) {
    const errorsList = []

    for (const [key, value] of Object.entries(errors)) {
      errorsList.push({
        text: value,
        href: `#${key}`
      })
    }

    return errorsList
  }

  /**
   * Get health answers for summary list rows
   *
   * @param {object} healthAnswers - Health answers
   * @param {string} edit - Edit link
   * @param {string} [parentFacing] - Use parent-facing questions (‘your child’)
   * @returns {Array|undefined} Parameters for summary list component
   */
  globals.healthAnswerRows = function (healthAnswers, edit, parentFacing) {
    if (healthAnswers.length === 0) {
      return
    }

    const summaryRows = []
    for (const [key, healthAnswer] of Object.entries(healthAnswers)) {
      let html = ''

      if (Array.isArray(healthAnswer)) {
        // Answers in multiple replies
        for (const answer of Object.values(healthAnswer)) {
          html += formatHealthAnswer(answer)
        }
      } else {
        // Answer in single reply
        html += formatHealthAnswer(healthAnswer)
      }

      let keyText =
        healthQuestions[key].labelWithOptions || healthQuestions[key].label

      keyText = parentFacing
        ? healthQuestions[key].label.replace('the child', 'your child')
        : `<p class="nhsuk-body nhsuk-u-margin-bottom-1">${healthQuestions[key].label}</p>`

      if (!parentFacing && healthQuestions[key].hint) {
        keyText += `<p class="nhsuk-hint nhsuk-u-font-size-16 nhsuk-u-margin-bottom-2">${healthQuestions[key].hint}</p>`
      }

      summaryRows.push({
        classes: undefined,
        key: { html: keyText },
        value: { html },
        ...(edit && {
          actions: {
            items: [
              {
                href: edit.replace(`{{key}}`, camelToKebabCase(key)),
                text: 'Change',
                visuallyHiddenText: healthQuestions[key].label
              }
            ]
          }
        })
      })
    }

    summaryRows.at(-1).classes = 'nhsuk-summary-list__row--no-border'

    return summaryRows
  }

  /**
   * Inspect session data
   *
   * @param {object} data - Data to inspect
   * @param {boolean} includeContext - Include context data
   * @returns {string} Inspected data within a `<pre>` element
   */
  globals.inspect = function (data, includeContext = false) {
    const { filters } = this.ctx.settings.nunjucksEnv

    if (!includeContext) {
      const contextlessData = structuredClone(data)
      delete contextlessData.context
      data = contextlessData
    }

    const json = JSON.stringify(data, null, 2)
    return filters.safe(`<pre>${json}</pre>`)
  }

  /**
   * Format link
   *
   * @param {string} href - Hyperlink reference
   * @param {string} text - Hyperlink text
   * @param {object} [attributes] - Hyperlink attributes
   * @returns {string} HTML anchor decorated with nhsuk-link class
   */
  globals.link = function (href, text, attributes) {
    return formatLink(href, text, attributes)
  }

  /**
   * Get summaryList `row` parameter for session activity counts
   *
   * @param {string} activity - Data
   * @returns {object} `row`
   */
  globals.sessionActivityRow = function (activity) {
    const { __, __mf, account, session } = this.ctx

    const activities = {
      getConsent: {
        view: 'report',
        key: 'patientConsent',
        value: PatientConsentStatus.NoResponse,
        ...(!session.isCompleted && { action: 'reminders' })
      },
      followUp: {
        view: 'report',
        key: 'patientConsent',
        value: PatientConsentStatus.FollowUp
      },
      resolveConsent: {
        view: 'report',
        key: 'patientRefused',
        value: PatientRefusedStatus.Conflict
      },
      instruct: {
        view: 'instruct',
        key: 'instruct',
        value: InstructionOutcome.Needed,
        ...(account.canPrescribe && { action: 'instructions' })
      },
      record: {
        view: 'record',
        key: 'record',
        value: true,
        showProgrammes: true
      }
    }

    const { key, value, view, action, showProgrammes } = activities[activity]

    let totalCount = 0
    const links = []
    if (showProgrammes) {
      for (const { nameSentenceCase, id } of session.programmes) {
        const filters = [{ [key]: value }]
        filters.push({ 'programme_id': id })

        const params = new URLSearchParams()
        params.append(key, value)
        params.append('programme_id', id)

        const count = getSessionActivityCount(session, filters)
        totalCount += count

        const label = __mf(`session.activity.${activity}.programmeCount`, {
          count,
          nameSentenceCase
        })

        if (count === 0) {
          links.push(label)
        } else if (count > 0) {
          links.push(formatLink(`${session.uri}/${view}?${params}`, label))
        }
      }
    } else {
      const filters = [{ [key]: value }]

      const params = new URLSearchParams()
      params.append(key, value)

      const count = getSessionActivityCount(session, filters)
      totalCount += count

      const label = __mf(`session.activity.${activity}.count`, { count })

      if (count === 0) {
        links.push(label)
      } else if (count > 0) {
        links.push(formatLink(`${session.uri}/${view}?${params}`, label))
      }
    }

    return (
      totalCount > 0 && {
        key: {
          text: __(`session.activity.${activity}.label`)
        },
        value: {
          html: links.join('<br>')
        },
        ...(action && {
          actions: {
            items: [
              {
                text: __(`session.${action}.label`),
                href: `${session.uri}/${action}`
              }
            ]
          }
        })
      }
    )
  }

  /**
   * Get vaccinator summary table row items
   *
   * @param {import('./models.js').Session} session - Session
   * @returns {Array} Table row items
   */
  globals.vaccinationTableRows = function (session) {
    const { __, defaultBatches, data } = this.ctx

    const tableRows = []
    for (const vaccine of Object.values(session.vaccines)) {
      const defaultBatch = defaultBatches.find(
        ({ vaccine_snomed }) => vaccine_snomed === vaccine.snomed
      )
      const vaccinationCount = data?.token?.vaccinations?.[vaccine.snomed] || 0

      const defaultBatchHtml = defaultBatch
        ? `${defaultBatch.formatted.id} ${formatLink(
            `${session.uri}/default-batch/${vaccine.snomed}`,
            __('defaultBatch.visuallyHiddenText', vaccine.brand)
          )}`
        : 'Not set'

      tableRows.push([
        {
          header: __('vaccine.label'),
          text: vaccine.brand
        },
        {
          header: __('user.vaccinations.label'),
          text: vaccinationCount
        },
        {
          header: __('defaultBatch.label'),
          html: defaultBatchHtml
        }
      ])
    }

    return tableRows
  }

  /**
   * Get tag parameters
   *
   * @param {object} status - Status
   * @param {string} [status.text] - Status text
   * @param {string} [status.html] - Status HTML
   * @param {string} [status.colour] - Status colour
   * @returns {object} Parameters
   */
  globals.statusTag = function ({ text, html, colour }) {
    return {
      text,
      html,
      ...(colour && { classes: `nhsuk-tag--${colour}` })
    }
  }

  /**
   * Get summaryList `rows` parameters
   *
   * @param {object} data - Data
   * @param {object} rows - Row configuration
   * @returns {object} `rows`
   */
  globals.summaryRows = function (data, rows) {
    const { __ } = this.ctx
    const summaryRows = []

    for (const key in rows) {
      // Formatted value may be an empty string, so only check for `undefined`
      let formattedValue
      if (data?.formatted?.[key] !== undefined) {
        formattedValue = data.formatted[key]
      } else {
        formattedValue = data[key]
      }

      // Allow value to be explicitly set
      let value = rows[key]?.value || formattedValue

      if (typeof value !== 'undefined' && value !== 0 && value?.length !== 0) {
        // Handle _unchecked checkbox value
        if (value === '_unchecked') {
          value = 'None selected'
        }

        // Handle falsy values
        if (value === false) {
          value = 'No'
        }

        // Handle truthy values
        if (value === true) {
          value = 'Yes'
        }

        const label = rows[key].label || __(`${data.ns}.${key}.label`)
        const changeText = rows[key].changeText || __(`actions.change`)
        const changeLabel = rows[key].changeLabel || _.lowerFirst(label)
        const href = rows[key].href
        const fallbackValue = href
          ? `<a href="${href}">Add ${changeLabel}</a>`
          : 'Not provided'

        summaryRows.push({
          classes: '',
          key: {
            text: label
          },
          value: {
            classes: rows[key]?.classes,
            html: value ? String(value) : fallbackValue
          },
          actions: href &&
            value && {
              items: [
                {
                  href,
                  text: changeText,
                  visuallyHiddenText: changeLabel
                }
              ]
            }
        })
      }
    }

    // Remove border from final row
    summaryRows.at(-1).classes = 'nhsuk-summary-list__row--no-border'

    return summaryRows
  }

  return globals
}
