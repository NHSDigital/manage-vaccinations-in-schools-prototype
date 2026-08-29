import filters from '@x-govuk/govuk-prototype-filters'
import { isToday } from 'date-fns'

import {
  ConsentStatus,
  ConsentVaccineCriteria,
  ConsentWindow,
  InstructionStatus,
  PatientConsentStatus,
  PatientDeferredStatus,
  PatientRefusedStatus,
  PatientStatus,
  PatientTriageStatus,
  PatientVaccinatedStatus,
  ReplyDecision,
  ScreenStatus,
  VaccinationOutcome,
  VaccineCriteria
} from '../enums.js'

import { getRepliesWithHealthAnswers } from './reply.js'

/**
 * Get confirmed consent status
 *
 * @param {Reply} reply - Reply
 * @param {Session} session - Session
 * @returns {ConsentStatus} Confirmed consent status
 */
export function getConfirmedConsentStatus(reply, session) {
  if (reply.decision === ReplyDecision.NoResponse) {
    return ConsentStatus.NoResponse
  }

  if (reply.decision === ReplyDecision.Refused && reply.hasConfirmedRefusal) {
    return ConsentStatus.FinalRefusal
  }

  if (reply.hasRefusedConsent) {
    return ConsentStatus.Refused
  }

  if (reply.hasGivenConsent) {
    if (
      session?.canOfferAlternativeVaccine &&
      reply.decision === ReplyDecision.OnlyAlternativeInjection
    ) {
      return ConsentStatus.GivenForAlternativeInjection
    }

    if (
      session?.canOfferIntranasalVaccine &&
      reply.decision !== ReplyDecision.OnlyAlternativeInjection &&
      !reply.hasConsentForAlternativeVaccine
    ) {
      return ConsentStatus.GivenForIntranasal
    }

    return ConsentStatus.Given
  }

  return reply.decision
}

/**
 * Get consent status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {ConsentStatus} Consent status
 */
export function getConsentStatus(patientProgramme) {
  const session = patientProgramme.lastPatientSession?.session

  // If patient is 16+, assume consent given
  if (patientProgramme.patient.isPost16) {
    return ConsentStatus.Given
  }

  // Get valid replies
  const replies = Object.values(patientProgramme.replies).filter(
    ({ isValid }) => isValid
  )

  // If no valid replies, no response
  if (replies.length === 0) {
    return ConsentStatus.NoResponse
  }

  // If any reply is child self consenting, use child’s decision
  const childReply = replies.find((reply) => reply.hasSelfConsent)
  if (childReply) {
    return getConfirmedConsentStatus(childReply, session)
  }

  // If only one reply, use that decision
  if (replies.length === 1) {
    return getConfirmedConsentStatus(replies[0], session)
  }

  // If many replies, determine if responses are consistent or inconsistent
  if (replies.length > 1) {
    // If one of the replies is a confirmed refusal, consent is final refusal
    if (
      replies.find(
        ({ hasRefusedConsent, hasConfirmedRefusal }) =>
          hasRefusedConsent && hasConfirmedRefusal
      )
    ) {
      return ConsentStatus.FinalRefusal
    }

    // If one of the replies is a refusal, consent is refused
    if (replies.find(({ hasRefusedConsent }) => hasRefusedConsent)) {
      return ConsentStatus.Refused
    }

    // If one of the replies has requested follow up, show this status
    // over showing inconsistent consent
    if (replies.find(({ hasDeclinedConsent }) => hasDeclinedConsent)) {
      return ConsentStatus.Declined
    }

    // If consent given, determine which vaccine method has consent
    if (replies.every(({ hasGivenConsent }) => hasGivenConsent)) {
      // For flu programme, determine if consent given for injection
      if (session?.canOfferIntranasalVaccine) {
        const allWantInjection = replies.every(
          ({ vaccineCriteria }) =>
            vaccineCriteria ===
            ConsentVaccineCriteria.AlternativeFluInjectionOnly
        )
        const someWantInjectionOnly = replies.some(
          ({ vaccineCriteria }) =>
            vaccineCriteria ===
            ConsentVaccineCriteria.AlternativeFluInjectionOnly
        )
        const someWantIntranasalOnly = replies.some(
          ({ vaccineCriteria }) =>
            vaccineCriteria === ConsentVaccineCriteria.IntranasalOnly
        )
        const allAcceptAlternative = replies.every(
          ({ hasConsentForAlternativeVaccine }) =>
            hasConsentForAlternativeVaccine
        )

        if (someWantInjectionOnly && someWantIntranasalOnly) {
          return ConsentStatus.Inconsistent
        }

        if (
          allWantInjection ||
          (someWantInjectionOnly && allAcceptAlternative)
        ) {
          return ConsentStatus.GivenForAlternativeInjection
        }

        return ConsentStatus.GivenForIntranasal
      }

      // For MMR programme, determine if any consent requested gelatine-free
      if (session?.canOfferAlternativeVaccine) {
        if (
          replies.some(
            ({ hasConsentForAlternativeVaccine }) =>
              hasConsentForAlternativeVaccine
          )
        ) {
          return ConsentStatus.GivenForAlternativeInjection
        }
      }

      if (replies.every(({ hasGivenConsent }) => hasGivenConsent)) {
        return ConsentStatus.Given
      }
    }

    return ConsentStatus.Inconsistent
  }

  return ConsentStatus.NoResponse
}

/**
 * Get expanded description about consent status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {string} Consent status description
 */
export function getConsentStatusDescription(patientProgramme) {
  const relationships = filters.formatList(
    patientProgramme.parentalRelationships
  )
  const contactNames = filters.formatList(
    patientProgramme.contactsRequestingFollowUp
  )

  if (patientProgramme.patient?.isPost16) {
    return `${patientProgramme.patient.firstName} is old enough to self-consent.`
  }

  if (!patientProgramme.patient?.hasContactDetails) {
    return 'There are no contact details for this child.'
  }

  if (patientProgramme.patientSessions.length === 0) {
    return PatientConsentStatus.NotScheduled
  }

  const session = patientProgramme.lastPatientSession?.session
  if (session?.consentWindow === ConsentWindow.Opening) {
    return session?.formatted.consentWindowSentence
  }

  switch (patientProgramme.consent) {
    case ConsentStatus.NoResponse:
      return 'No-one responded to our requests for consent.'
    case ConsentStatus.NotDelivered:
      return 'Consent response could not be delivered.'
    case ConsentStatus.Inconsistent:
      return 'You can only vaccinate if all respondents give consent.'
    case ConsentStatus.Declined:
      return `${contactNames} would like to speak to a member of the team about other options for their child’s vaccination.`
    case ConsentStatus.Given:
    case ConsentStatus.GivenForAlternativeInjection:
    case ConsentStatus.GivenForIntranasal:
      return `${relationships} gave consent.`
    case ConsentStatus.Refused:
      return `${relationships} refused consent.`
    case ConsentStatus.FinalRefusal:
      return `Refusal to give consent confirmed by ${relationships}.`
    default:
  }
}

/**
 * Get screen status (what was the triage decision)
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {ScreenStatus|boolean} Screen status
 */
export function getScreenStatus(patientProgramme) {
  // No consent given, so cannot triage yet
  if (!patientProgramme.consentGiven) {
    return false
  }

  // Triage occurred during a previous vaccination session
  if (patientProgramme.lastVaccinationOutcome) {
    if (
      patientProgramme.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.InvitedToClinic
    ) {
      return ScreenStatus.InvitedToClinic
    }

    if (
      patientProgramme.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.DelayVaccination
    ) {
      return ScreenStatus.DelayVaccination
    }

    if (
      patientProgramme.lastVaccinationOutcome.outcome ===
      VaccinationOutcome.DoNotVaccinate
    ) {
      return ScreenStatus.DoNotVaccinate
    }
  }

  const responses = Object.values(patientProgramme.replies)
  const responsesToTriage = getRepliesWithHealthAnswers(responses)
  const lastTriageNoteWithStatus = patientProgramme.triageNotes
    .filter((event) => event.status)
    .at(-1)

  if (responsesToTriage.length === 0) {
    // Triage completed without any ‘Yes’ answers to health questions
    if (lastTriageNoteWithStatus) {
      return lastTriageNoteWithStatus.status
    }

    // Clinic appointment without any answers to health questions
    if (
      !responses.length &&
      patientProgramme.lastPatientSession?.clinicAppointment
    ) {
      return ScreenStatus.NeedsTriage
    }

    return false
  }

  // Triage needed or completed due to answers to health questions
  if (responsesToTriage.length > 0) {
    if (lastTriageNoteWithStatus) {
      return lastTriageNoteWithStatus.status
    }

    return ScreenStatus.NeedsTriage
  }

  return false
}

/**
 * Get expanded description about screen status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {string} Screen status description
 */
export function getScreenStatusDescription(patientProgramme) {
  const triageNote = patientProgramme.triageNotes.at(-1)
  const user = triageNote?.createdBy || { fullName: 'Jane Joy' }
  const person = patientProgramme.patient.isPost16 ? 'child' : 'parent'

  switch (patientProgramme.screen) {
    case ScreenStatus.NeedsTriage:
      return patientProgramme.lastPatientSession?.clinicAppointment
        ? `You need to review the health questions with the ${person} to decide if it’s safe to vaccinate ${patientProgramme.patient.firstName}.`
        : `You need to decide if it’s safe to vaccinate ${patientProgramme.patient.firstName}.`
    case ScreenStatus.InvitedToClinic:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName}’s vaccination should take place at a clinic.`
    case ScreenStatus.DelayVaccination:
      return triageNote?.statusInvalidAt
        ? `${user.fullName} decided that ${patientProgramme.patient.firstName}’s vaccination should be delayed until ${triageNote.formatted.statusInvalidAt}.`
        : `${user.fullName} decided that ${patientProgramme.patient.firstName}’s vaccination should be delayed`
    case ScreenStatus.DoNotVaccinate:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} should not be vaccinated.`
    case ScreenStatus.Vaccinate:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} is safe to vaccinate.`
    case ScreenStatus.VaccinateAlternativeFluInjectionOnly:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} is safe to vaccinate using the injected vaccine only.`
    case ScreenStatus.VaccinateAlternativeMMRInjectionOnly:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} is safe to vaccinate using the gelatine-free injection only.`
    case ScreenStatus.VaccinateIntranasalOnly:
      return `${user.fullName} decided that ${patientProgramme.patient.firstName} is safe to vaccinate using the nasal spray only.`
    default:
      return `No triage is needed for ${patientProgramme.patient.firstName}.`
  }
}

/**
 * Get instruction status for nasal spray
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {InstructionStatus|undefined} Instruction status
 */
export function getInstructionStatus(patientProgramme) {
  if (!patientProgramme.vaccine) {
    return
  }

  if (patientProgramme.vaccine.criteria === VaccineCriteria.Intranasal) {
    return patientProgramme.instruction
      ? InstructionStatus.Given
      : InstructionStatus.Needed
  }

  return
}

/**
 * Get vaccination (session) outcome
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {VaccinationOutcome|undefined} Vaccination (session) outcome
 */
export function getVaccinationOutcome(patientProgramme) {
  if (patientProgramme.lastVaccinationOutcome) {
    return patientProgramme.lastVaccinationOutcome.outcome
  } else if (
    [ConsentStatus.Refused, ConsentStatus.FinalRefusal].includes(
      patientProgramme.consent
    )
  ) {
    return VaccinationOutcome.ConsentRefused
  } else if (patientProgramme.screen === ScreenStatus.InvitedToClinic) {
    return VaccinationOutcome.InvitedToClinic
  } else if (patientProgramme.screen === ScreenStatus.DelayVaccination) {
    return VaccinationOutcome.DelayVaccination
  } else if (patientProgramme.screen === ScreenStatus.DoNotVaccinate) {
    return VaccinationOutcome.DoNotVaccinate
  }
}

/**
 * Get patient status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientStatus} Overall patient status
 */
export function getPatientStatus(patientProgramme) {
  // Not eligible for any school-age vaccination or this programme
  if (
    patientProgramme.patient.hasAgedOutOfProgrammes ||
    patientProgramme.isNotEligibleYet
  ) {
    return PatientStatus.Ineligible
  }

  // Is fully vaccinated
  if (patientProgramme.dosesRemaining === 0) {
    return PatientStatus.Vaccinated
  }

  // Is no longer eligible for this programme
  if (patientProgramme.isNoLongerEligible) {
    return PatientStatus.Ineligible
  }

  // Has vaccination outcome
  if (patientProgramme.vaccinationOutcomes?.length > 0) {
    switch (patientProgramme.outcome) {
      case VaccinationOutcome.Vaccinated:
      case VaccinationOutcome.AlreadyVaccinated:
        return PatientStatus.Vaccinated

      case VaccinationOutcome.Absent:
      case VaccinationOutcome.Refused:
      case VaccinationOutcome.Unwell:
        if (isToday(patientProgramme.lastVaccinationOutcome?.createdAt)) {
          // ‘Could not vaccinate’ only applies on the day it was recorded
          return PatientStatus.Deferred
        }
    }
  }

  // Has screening status
  switch (patientProgramme.screen) {
    case ScreenStatus.DelayVaccination:
    case ScreenStatus.InvitedToClinic:
    case ScreenStatus.DoNotVaccinate:
      return PatientStatus.Deferred

    case ScreenStatus.Vaccinate:
    case ScreenStatus.VaccinateAlternativeFluInjectionOnly:
    case ScreenStatus.VaccinateAlternativeMMRInjectionOnly:
    case ScreenStatus.VaccinateIntranasalOnly:
      return PatientStatus.Due

    case ScreenStatus.NeedsTriage:
      return PatientStatus.Triage
  }

  // Has consent status
  if (patientProgramme.consentGiven) {
    return PatientStatus.Due
  }

  switch (patientProgramme.consent) {
    case ConsentStatus.Declined:
    case ConsentStatus.Inconsistent:
    case ConsentStatus.Refused:
    case ConsentStatus.FinalRefusal:
      return PatientStatus.Refused

    default:
      return PatientStatus.Consent
  }
}

/**
 * Get expanded description about patient status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {string|undefined} Patient status description
 */
export function getPatientStatusDescription(patientProgramme) {
  switch (patientProgramme.status) {
    case PatientStatus.Ineligible:
      return patientProgramme?.ineligibilityDescription
    case PatientStatus.Vaccinated:
      return `${patientProgramme.patient?.firstName} was vaccinated by ${patientProgramme.lastVaccinationOutcome.createdBy.fullName} on ${patientProgramme.lastVaccinationOutcome.formatted.createdAt}.`
    case PatientStatus.Due:
      return patientProgramme.vaccineCriteria
        ? `${patientProgramme.patient?.firstName} is ready to vaccinate (${patientProgramme.vaccineCriteria.toLowerCase()}).`
        : `${patientProgramme.patient?.firstName} is ready to vaccinate.`
    case PatientStatus.Deferred:
      return patientProgramme.deferredDescription
    case PatientStatus.Triage:
      return patientProgramme.screenDescription
    case PatientStatus.Refused:
    case PatientStatus.Consent:
      // Don’t show full consent description as it’s shown directly below
      return `${patientProgramme.patientConsent}.`
  }
}

/**
 * Get patient consent status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientConsentStatus|undefined} Patient consent status
 */
export function getPatientConsentStatus(patientProgramme) {
  if (patientProgramme.patient?.isPost16) {
    return PatientConsentStatus.SelfConsent
  }

  if (!patientProgramme.patient?.hasContactDetails) {
    return PatientConsentStatus.NoDetails
  }

  if (patientProgramme.patientSessions.length === 0) {
    return PatientConsentStatus.NotScheduled
  }

  // Only school sessions have a consent window
  const session = patientProgramme.lastPatientSession?.session
  if (session?.school_id) {
    if (session?.consentWindow === ConsentWindow.None) {
      return PatientConsentStatus.NotScheduled
    } else if (session?.consentWindow === ConsentWindow.Opening) {
      return PatientConsentStatus.Scheduled
    }
  }

  switch (patientProgramme.consent) {
    case ConsentStatus.NotDelivered:
      return PatientConsentStatus.NotDelivered
    case ConsentStatus.NoResponse:
      return PatientConsentStatus.NoResponse
    case ConsentStatus.Declined:
      return PatientRefusedStatus.FollowUp
    case ConsentStatus.Inconsistent:
      return PatientRefusedStatus.Conflict
    case ConsentStatus.Refused:
      return PatientRefusedStatus.Refusal
  }
}

/**
 * Get patient triage status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientTriageStatus|undefined} Patient triage status
 */
export function getPatientTriageStatus(patientProgramme) {
  const responses = Object.values(patientProgramme.replies)
  const responsesToTriage = getRepliesWithHealthAnswers(responses)

  if (patientProgramme.screen === ScreenStatus.NeedsTriage) {
    if (responsesToTriage.length > 0) {
      return PatientTriageStatus.Responses
    } else if (patientProgramme.lastPatientSession?.clinicAppointment) {
      return PatientTriageStatus.Consultation
    }
  }
}

/**
 * Get patient deferred status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientDeferredStatus|undefined} Patient deferred status
 */
export function getPatientDeferredStatus(patientProgramme) {
  if (patientProgramme.screen === ScreenStatus.DoNotVaccinate) {
    return PatientDeferredStatus.DoNotVaccinate
  } else if (patientProgramme.screen === ScreenStatus.DelayVaccination) {
    return PatientDeferredStatus.DelayVaccination
  } else if (patientProgramme.screen === ScreenStatus.InvitedToClinic) {
    return PatientDeferredStatus.InvitedToClinic
  }

  switch (patientProgramme.outcome) {
    case VaccinationOutcome.Absent:
      return PatientDeferredStatus.ChildAbsent
    case VaccinationOutcome.Refused:
      return PatientDeferredStatus.ChildRefused
    case VaccinationOutcome.Unwell:
      return PatientDeferredStatus.ChildUnwell
    case VaccinationOutcome.InvitedToClinic:
      return PatientDeferredStatus.InvitedToClinic
    case VaccinationOutcome.DelayVaccination:
      return PatientDeferredStatus.DelayVaccination
    case VaccinationOutcome.DoNotVaccinate:
      return PatientDeferredStatus.DoNotVaccinate
  }
}

/**
 * Get expanded description about deferred status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {string} Deferred description
 */
export function getPatientDeferredDescription(patientProgramme) {
  switch (patientProgramme.patientDeferred) {
    case PatientDeferredStatus.ChildAbsent:
    case PatientDeferredStatus.ChildRefused:
    case PatientDeferredStatus.ChildUnwell:
      return `${patientProgramme.patientDeferred} on ${patientProgramme.lastVaccinationOutcome?.formatted.createdAt}.`
    case PatientDeferredStatus.InvitedToClinic:
    case PatientDeferredStatus.DelayVaccination:
    case PatientDeferredStatus.DoNotVaccinate:
      return patientProgramme.screenDescription
    default:
      return patientProgramme.patientDeferred
  }
}

/**
 * Get patient refused status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientRefusedStatus|undefined} Patient refused status
 */
export function getPatientRefusedStatus(patientProgramme) {
  switch (patientProgramme.consent) {
    case ConsentStatus.Inconsistent:
      return PatientRefusedStatus.Conflict
    case ConsentStatus.Declined:
      return PatientRefusedStatus.FollowUp
    case ConsentStatus.Refused:
    case ConsentStatus.FinalRefusal:
      return PatientRefusedStatus.Refusal
  }
}

/**
 * Get patient vaccinated status
 *
 * @param {PatientProgramme} patientProgramme - Patient programme
 * @returns {PatientVaccinatedStatus|undefined} Patient vaccinated status
 */
export function getPatientVaccinatedStatus(patientProgramme) {
  switch (patientProgramme.outcome) {
    case VaccinationOutcome.Vaccinated:
    case VaccinationOutcome.PartVaccinated:
      return PatientVaccinatedStatus.Vaccinated
    case VaccinationOutcome.AlreadyVaccinated:
      return PatientVaccinatedStatus.AlreadyVaccinated
  }
}

/**
 * @import { PatientProgramme, Reply, Session } from '../models.js'
 */
