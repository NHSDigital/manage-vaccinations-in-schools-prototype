import wizard from '@x-govuk/govuk-prototype-wizard'

import {
  ParentalRelationship,
  ProgrammeType,
  ReplyDecision,
  ReplyRefusal,
  SessionPresetName,
  SessionType
} from '../enums.js'
import { generateChild } from '../generators/child.js'
import { generateParent } from '../generators/parent.js'
import { Consent, Session } from '../models.js'
import { getHealthQuestionPaths } from '../utils/consent.js'
import { formatList, kebabToCamelCase } from '../utils/string.js'

export const parentController = {
  read(request, response, next, session_id) {
    const session = Session.findOne(session_id, request.session.data)
    const serviceName = 'Give or refuse consent for vaccinations'

    response.locals.assetsName = 'public'
    response.locals.serviceName = serviceName
    response.locals.headerOptions = {
      service: {
        text: serviceName
      }
    }
    response.locals.session = session

    next()
  },

  redirect(request, response) {
    const { session } = response.locals

    response.redirect(`${session.consentUrl}/start`)
  },

  show(request, response) {
    const view = request.params.view || 'show'
    const { data } = request.session
    const { session } = response.locals

    // Text and email messages
    if (view === 'emails' || view === 'texts') {
      const child = generateChild()
      const parent = generateParent(child.lastName)

      response.locals.assetsName = 'prototype'

      response.locals.consent = new Consent(
        {
          child,
          parent,
          session_id: session.id
        },
        data
      )

      response.locals.programme = session.programmes[0]

      const sideEffects = new Set()
      for (const programme of session.programmes) {
        for (const sideEffect of programme.vaccines[0].sideEffects) {
          sideEffects.add(sideEffect)
        }
      }

      response.locals.sideEffects = formatList([...sideEffects])
    }

    response.render(`parent/${view}`)
  },

  new(request, response) {
    const { data } = request.session
    const { session } = response.locals

    let consent = Consent.create(
      {
        session_id: session.id
      },
      data.wizard
    )
    consent = new Consent(consent, data)

    response.redirect(`${consent.parentUri}/new/child`)
  },

  update(request, response) {
    const { consent_uuid } = request.params
    const { data } = request.session
    const { consent, paths } = response.locals

    // Clean up session data
    delete data.consent

    // Update session data
    if (consent.consultation) {
      consent.decision = ReplyDecision.Declined
      Consent.update(consent_uuid, consent, data.wizard)
    }

    response.redirect(paths.next)
  },

  readForm(request, response, next) {
    const { session_id, consent_uuid } = request.params
    const { data, referrer } = request.session
    const { __, session } = response.locals

    const consent = new Consent(
      Consent.findOne(consent_uuid, data?.wizard),
      data
    )
    response.locals.consent = consent

    // If programme has alternative vaccine, and given consent has been given
    // for the default, ask for consent for the alternative as well
    const getConsentForAlternativeVaccine =
      session.offersAlternativeVaccine &&
      consent.decision === ReplyDecision.Given

    const journey = {
      [`/${session_id}`]: {},
      // Child journey
      [`/${session_id}/${consent_uuid}/new/child`]: {},
      [`/${session_id}/${consent_uuid}/new/dob`]: {},
      ...(session?.type === SessionType.School
        ? { [`/${session_id}/${consent_uuid}/new/confirm-school`]: {} }
        : {}),
      ...(session?.type === SessionType.School && data.confirmSchool !== 'yes'
        ? {
            [`/${session_id}/${consent_uuid}/new/school`]: {}
          }
        : {}),
      // Parent journey
      [`/${session_id}/${consent_uuid}/new/parent`]: {
        [`/${session_id}/parental-responsibility`]: {
          data: 'consent.parent.hasParentalResponsibility',
          value: 'false'
        },
        [`/${session_id}/${consent_uuid}/new/decision`]: () =>
          !request.session.data.consent?.parent?.tel
      },
      [`/${session_id}/${consent_uuid}/new/contact-preference`]: {},
      [`/${session_id}/${consent_uuid}/new/decision`]: {
        [`/${session_id}/${consent_uuid}/new/refusal-reason`]: {
          data: 'consent.decision',
          value: ReplyDecision.Refused
        },
        [`/${session_id}/${consent_uuid}/new/first-dose-country`]: {
          data: 'consent.decision',
          value: ReplyDecision.AlreadyVaccinated
        }
      },
      // Give consent journey
      [`/${session_id}/${consent_uuid}/new/address`]: {},
      ...(getConsentForAlternativeVaccine && {
        [`/${session_id}/${consent_uuid}/new/alternative`]: {}
      }),
      ...getHealthQuestionPaths(`/${session_id}/${consent_uuid}/new/`, consent),
      [`/${session_id}/${consent_uuid}/new/impairments`]: {},
      [`/${session_id}/${consent_uuid}/new/adjustments`]: {},
      [`/${session_id}/${consent_uuid}/new/check-answers`]: {},
      [`/${session_id}/${consent_uuid}/new/ethnicity`]: {
        [`/${session_id}/${consent_uuid}/new/confirmation`]: () =>
          request.session.data.consent?.ethnicity === 'false'
      },
      [`/${session_id}/${consent_uuid}/new/ethnic-group`]: {},
      [`/${session_id}/${consent_uuid}/new/ethnic-background`]: {},
      [`/${session_id}/${consent_uuid}/new/confirmation`]: {},
      // Refusal journey
      [`/${session_id}/${consent_uuid}/new/refusal-reason`]: {
        [`/${session_id}/${consent_uuid}/new/refusal-reason-details`]: {
          data: 'consent.refusalReason',
          values: [ReplyRefusal.GettingElsewhere, ReplyRefusal.Medical]
        },
        [`/${session_id}/${consent_uuid}/new/previous-dose`]: {
          data: 'consent.refusalReason',
          value: ReplyRefusal.AlreadyVaccinated
        },
        [`/${session_id}/${consent_uuid}/new/first-dose-country`]: {
          data: 'consent.refusalReason',
          value: ReplyRefusal.AlreadyVaccinatedMMR
        },
        [`/${session_id}/${consent_uuid}/new/consultation`]: true
      },
      [`/${session_id}/${consent_uuid}/new/refusal-reason-details`]: {
        [`/${session_id}/${consent_uuid}/new/${consent.refusalReason === ReplyRefusal.Medical ? 'consultation' : 'check-answers'}`]: true
      },
      // Consultation journey
      [`/${session_id}/${consent_uuid}/new/consultation`]: {
        [`/${session_id}/${consent_uuid}/new/check-answers`]: true
      },
      // Previous single dose journey
      [`/${session_id}/${consent_uuid}/new/previous-dose`]: {
        [`/${session_id}/${consent_uuid}/new/check-answers`]: true
      },
      // Previous multi-dose journey
      [`/${session_id}/${consent_uuid}/new/first-dose-country`]: {},
      [`/${session_id}/${consent_uuid}/new/first-dose-date`]: {},
      [`/${session_id}/${consent_uuid}/new/second-dose-country`]: {},
      [`/${session_id}/${consent_uuid}/new/second-dose-date`]: {
        [`/${session_id}/${consent_uuid}/new/check-answers`]: true
      }
    }

    const paths = wizard(journey, request)
    paths.back = referrer || paths.back
    response.locals.paths = paths

    response.locals.parentalRelationshipItems = Object.values(
      ParentalRelationship
    )
      .filter((relationship) => relationship !== ParentalRelationship.Unknown)
      .map((relationship) => ({
        text: relationship,
        value: relationship
      }))

    if (session.programmes.length > 1) {
      // MenACWY and Td/IPV: Ask for consent for none, one or all programmes
      response.locals.decisionItems = [
        {
          text: __('consent.decision.both.label'),
          value: ReplyDecision.Given
        },
        {
          text: __('consent.decision.one.label'),
          value: '_one'
        },
        {
          divider: 'or'
        },
        {
          text: __('consent.decision.no.label'),
          value: ReplyDecision.Refused,
          hint: {
            text: __('consent.decision.no.hint')
          }
        }
      ]

      response.locals.programmeItems = session.programmes.map((programme) => ({
        text: programme.name,
        value:
          programme.id === 'td-ipv'
            ? ReplyDecision.OnlyTdIPV
            : ReplyDecision.OnlyMenACWY
      }))
    } else if (session.presetNames.includes(SessionPresetName.Flu)) {
      // Flu: Ask which vaccine the parent would prefer
      response.locals.decisionItems = [
        {
          text: __('consent.decision.nasal.label'),
          hint: { text: __('consent.decision.nasal.hint') },
          value: ReplyDecision.Given
        },
        {
          text: __('consent.decision.injection.label'),
          hint: { text: __('consent.decision.injection.hint') },
          value: ReplyDecision.OnlyAlternativeInjection
        },
        {
          text: __('consent.decision.no.label'),
          value: ReplyDecision.Refused,
          hint: {
            text: __('consent.decision.no.hint')
          }
        }
      ]
    } else if (session.presetNames.includes(SessionPresetName.MMR)) {
      // MMR: Yes, no or already fully vaccinated
      response.locals.decisionItems = [
        {
          text: __('consent.decision.yes.label'),
          value: ReplyDecision.Given
        },
        {
          text: __('consent.decision.no.label'),
          value: ReplyDecision.Refused,
          hint: {
            text: __('consent.decision.no.hint')
          }
        },
        {
          divider: 'or'
        },
        {
          text: __('consent.decision.alreadyVaccinated.label'),
          value: ReplyDecision.AlreadyVaccinated,
          hint: {
            text: __('consent.decision.alreadyVaccinated.hint')
          }
        }
      ]
    } else {
      // HPV: Yes or no
      response.locals.decisionItems = [
        {
          text: __('consent.decision.yes.label'),
          value: ReplyDecision.Given
        },
        {
          text: __('consent.decision.no.label'),
          value: ReplyDecision.Refused,
          hint: {
            text: __('consent.decision.no.hint')
          }
        }
      ]
    }

    response.locals.vaccineIncludesGelatine = [
      ProgrammeType.Flu,
      ProgrammeType.MMR
    ].some((type) =>
      session.programmes.map((programme) => programme.type).includes(type)
    )

    next()
  },

  showForm(request, response) {
    let { view } = request.params
    const { consent } = response.locals
    let key = kebabToCamelCase(view)

    // All health questions use the same view
    if (view.startsWith('health-question-')) {
      key = kebabToCamelCase(view.replace('health-question-', ''))
      view = 'health-question'
    }

    // All previous dose questions use the same view
    if (view.includes('-dose')) {
      key = `${view.match(/^(first|second)-dose/)?.[1]}Dose`
      view = view.replace(/(?:first|second)(-)/g, 'previous$1')
    }

    // Only ask for details if question does not have sub-questions
    const hasSubQuestions = consent.healthQuestionsForDecision[key]?.conditional

    response.render(`parent/form/${view}`, { key, hasSubQuestions })
  },

  updateForm(request, response) {
    const { decision } = request.body
    const { consent_uuid } = request.params
    const { data } = request.session
    const { paths, consent } = response.locals

    // Flu journey
    if (request.body.consent?.healthAnswers?.asthma?.answer === 'No') {
      delete consent?.healthAnswers?.asthmaSteroids
      delete consent?.healthAnswers?.asthmaAdmitted
    }

    // MenACWY and Td/IPV consent journey
    const combinedDecisionGiven = [
      ReplyDecision.Given,
      ReplyDecision.Refused
    ].includes(request.body.consent?.decision)

    if (!combinedDecisionGiven && decision) {
      request.body.consent.decision = decision
    }

    Consent.update(consent_uuid, request.body.consent, data.wizard)

    response.redirect(paths.next)
  }
}
