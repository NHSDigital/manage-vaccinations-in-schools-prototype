import _ from 'lodash'

import {
  AdditionalNeeds,
  AppointmentAbandonmentReason,
  AppointmentLengthType,
  ClinicBookingJourneyType,
  LocationSearchType,
  PatientClinicStatus,
  ReplyDecision
} from '../enums.js'
import { ClinicAppointment, Patient, Programme, Session } from '../models.js'

import { getBookableClinicSessions } from './clinic-booking.js'
import { getAdditionalNeeds } from './feature-flags.js'
import { getLocationSearchType } from './geolocation.js'
import { camelToKebabCase, stringToArray, stringToBoolean } from './string.js'

/**
 * Get the MMRV-aware list of programme IDs for which the given patient can be booked into clinic
 *
 * @param {string} patient_uuid - the UUID of the patient being booked in
 * @param {object} context - the context on which models are stored
 * @returns {Array<string>} an array of programme IDs, possibly including 'mmrv'
 */
export const getClinicBookableProgrammeIDs = (patient_uuid, context) => {
  const patient = Patient.findOne(patient_uuid, context)
  if (!patient) {
    return []
  }

  const canOfferMmrv = patient.canBeOfferedMmrv
  const bookableStatuses = [
    PatientClinicStatus.Ready,
    PatientClinicStatus.Invited
  ]

  return Object.values(patient.programmes)
    .filter(
      ({ clinicStatus }) =>
        clinicStatus && bookableStatuses.includes(clinicStatus)
    )
    .map(({ programme_id }) =>
      programme_id === 'mmr' && canOfferMmrv ? 'mmrv' : programme_id
    )
}

/**
 * Get some MMRV-aware information about programmes we can offer in the booking
 *
 * @param {Array<string>} programme_ids - IDs of programmes that can be offered
 * @param {object} context - the context on which models are stored
 * @returns {object} information about programmes to offer
 */
export const getAppointmentProgrammeOptions = (programme_ids, context) => {
  // Strip out mmrv as a programme id, but keep memory of it so we can adapt content
  const offerMmrv = programme_ids.includes('mmrv')
  programme_ids = programme_ids.map((id) => (id === 'mmrv' ? 'mmr' : id))

  // Convert to the actual programme objects
  const programmes = Programme.findAll(context)
    .map((programme) => {
      delete programme.context
      return programme
    })
    .filter(({ id }) => programme_ids.includes(id))

  // Reinstate MMRV if relevant for the booking
  if (offerMmrv) {
    const mmrProgramme = programmes.find(({ id }) => id === 'mmr')
    mmrProgramme.name = 'MMRV'
    mmrProgramme.id = 'mmrv'
    mmrProgramme.information.hint = mmrProgramme.information.hintMmrv
  }

  // Track details of the invite for pages that need to show the invited programmes
  return {
    programmes,
    programmeNames: programmes.map(({ name }) => name),
    eligibleForMmrv: offerMmrv
  }
}

/**
 * Builds the path to a view in a clinic booking journey, relative to where the journey's router is mounted
 *
 * @callback JourneyPathBuilder
 * @param {string} view - the view to link to e.g. 'programmes'
 * @param {string} [appointment_uuid] - the appointment the view is for; not required for booking-level views
 * @returns {string} the path to the view
 */

/**
 * Get a builder for journey paths, relative to wherever the router handling this request is mounted
 *
 * Booking-based routes (e.g. /book-into-a-clinic/:booking_uuid/new/:appointment_uuid/:view) include the booking
 * UUID in the path, whereas appointment-based routes (e.g. /sessions/:session_id/appointments/:appointment_uuid/edit/:view)
 * don't, and have no booking-level views.
 *
 * @param {Request} request - the request being handled
 * @param {string} action - action being carried out i.e. create new vs edit existing
 * @returns {JourneyPathBuilder} Journey path builder
 */
export const getJourneyPathBuilder = (request, action) => {
  const { booking_uuid } = request.params

  if (!booking_uuid) {
    return (view, appointment_uuid) => `/${appointment_uuid}/${action}/${view}`
  }

  return (view, appointment_uuid) =>
    appointment_uuid
      ? `/${booking_uuid}/${action}/${appointment_uuid}/${view}`
      : `/${booking_uuid}/${action}/${view}`
}

/**
 * Get wizard journey paths and forking details for all appointments in the given clinic booking
 *
 * @param {string} booking_uuid - the ID of the booking we're creating
 * @param {object} sessionData - the request.session.data object
 * @param {Array<ClinicAppointment>} appointments - the appointments whose journeys we're mapping
 * @param {JourneyPathBuilder} getPath - builds the (mount-relative) path to a view in the journey
 * @returns {object} An object containing all relevant pages and forks
 */
export const getAllAppointmentPaths = (
  booking_uuid,
  sessionData,
  appointments,
  getPath
) => {
  if (!appointments?.length) {
    return {}
  }

  const abandonmentReasons = stringToArray(
    sessionData.appointment?.abandonmentReasons
  )
  const extendForSupportNeeds = stringToBoolean(
    sessionData?.journeyData?.extendForSupportNeeds
  )

  // Note: the journey data will be unavailable on the confirmation page (which is parent-facing only)
  const journeyType =
    sessionData.journeyData[booking_uuid]?.journeyType ??
    ClinicBookingJourneyType.ParentOnline
  const isParentJourney = journeyType === ClinicBookingJourneyType.ParentOnline
  const isDataMigrationJourney =
    journeyType === ClinicBookingJourneyType.DataMigration

  const pathsPerAppointment = appointments.map((appointment) => {
    const appointment_uuid = appointment.uuid
    const appointmentPath = (view) => getPath(view, appointment_uuid)

    return {
      // Find the child (data migration journey only)
      ...(isDataMigrationJourney
        ? {
            [appointmentPath('find-child')]: {}
          }
        : {}),

      // Vaccinations wanted
      [appointmentPath('programmes')]: {
        [appointmentPath('availability')]: () => {
          const vaccinationChoices = appointment.vaccinationChoices
          vaccinationChoices.selected_programme_ids = stringToArray(
            sessionData.appointment?.selected_programme_ids
          )
          return (
            getBookableClinicSessions(
              sessionData,
              vaccinationChoices,
              extendForSupportNeeds,
              isParentJourney
            ).length === 0
          )
        }
      },
      ...(sessionData.appointment?.selected_programme_ids?.includes('flu')
        ? {
            [appointmentPath('flu-choice')]: {}
          }
        : {}),
      ...(sessionData.appointment?.fluDecision === ReplyDecision.Given
        ? {
            [appointmentPath('flu-alternative')]: {}
          }
        : {}),
      ...(sessionData.appointment?.selected_programme_ids?.includes('mmr')
        ? {
            [appointmentPath('mmr-alternative')]: {}
          }
        : {}),
      ...(getAdditionalNeeds() === AdditionalNeeds.Basic
        ? {
            [appointmentPath('additional-support')]: {}
          }
        : {
            [appointmentPath('impairments')]: {},
            [appointmentPath('adjustments')]: {}
          }),

      // Interrupt if the appointment is too long for the slot selected on Appointments page
      ...(isDataMigrationJourney &&
      sessionData.journeyData[booking_uuid]?.preselectedSlot &&
      !canNewAppointmentLengthFitInSession(appointment, true, sessionData)
        ? {
            [appointmentPath('shorten-appointment')]: {}
          }
        : {}),
      // Interrupt if the appointment is too long for anywhere in the session
      ...(isDataMigrationJourney &&
      !sessionData.journeyData[booking_uuid]?.preselectedSlot &&
      !canNewAppointmentLengthFitInSession(appointment, false, sessionData)
        ? {
            [appointmentPath('shorten-appointment')]: {}
          }
        : {}),

      // Clinic location preference
      ...(appointments[0].uuid !== appointment_uuid &&
      getPreviousSessionItems(appointments, sessionData).length > 2
        ? {
            [appointmentPath('session-selection')]: {
              [appointmentPath('appointment-time-range')]: () =>
                sessionData.journeyData.addressChoice !== 'new'
            }
          }
        : {}),
      ...(!isDataMigrationJourney
        ? {
            [appointmentPath('preferred-location')]: {
              [appointmentPath('clinic-location')]: () => {
                const searchTerm = sessionData.journeyData.preferredLocation
                const searchType = getLocationSearchType(searchTerm)
                switch (searchType) {
                  case LocationSearchType.Postcode:
                  case LocationSearchType.Outcode:
                    sessionData.appointment.preferredPostcode = searchTerm
                    sessionData.journeyData.outOfArea = false
                    return true
                  case LocationSearchType.Place:
                  default:
                    sessionData.journeyData.outOfArea = true
                    return false
                }
              }
            },
            [appointmentPath('preferred-location-matches')]: {
              [appointmentPath('preferred-location')]: {
                data: 'appointment.preferredPostcode',
                value: 'retry'
              }
            },
            [appointmentPath('clinic-distance')]: {}, // only used for place matching path (for demo/test purposes)

            // Session and slot selection
            [appointmentPath('clinic-location')]: {
              [appointmentPath('fully-booked')]: () => {
                return (
                  getBookableClinicSessions(
                    sessionData,
                    appointment.vaccinationChoices,
                    extendForSupportNeeds,
                    isParentJourney
                  ).length === 0
                )
              }
            },
            [appointmentPath('clinic-date')]: {
              [appointmentPath('fully-booked')]: () => {
                return (
                  getBookableClinicSessions(
                    sessionData,
                    appointment.vaccinationChoices,
                    extendForSupportNeeds,
                    isParentJourney
                  ).length === 0
                )
              }
            }
          }
        : {}),
      ...(!(
        isDataMigrationJourney &&
        sessionData.journeyData[booking_uuid]?.preselectedSlot
      )
        ? {
            [appointmentPath('appointment-time-range')]: {
              [appointmentPath('fully-booked')]: () => {
                return (
                  getBookableClinicSessions(
                    sessionData,
                    appointment.vaccinationChoices,
                    extendForSupportNeeds,
                    isParentJourney
                  ).length === 0
                )
              }
            },
            [appointmentPath('appointment-time')]: {
              [appointmentPath('fully-booked')]: () => {
                return (
                  getBookableClinicSessions(
                    sessionData,
                    appointment.vaccinationChoices,
                    extendForSupportNeeds,
                    isParentJourney
                  ).length === 0
                )
              },
              [appointmentPath('child')]: () => isParentJourney,
              [appointmentPath('team-health-questions')]: () => !isParentJourney
            }
          }
        : {}),

      // Child details
      ...(isParentJourney
        ? {
            [appointmentPath('child')]: {},
            [appointmentPath('dob')]: {},
            ...(appointments[0].uuid !== appointment_uuid &&
            getPreviousAddressItems(appointments).length > 2
              ? {
                  [appointmentPath('address-selection')]: {
                    [appointmentPath('contact')]: () =>
                      sessionData.journeyData.addressChoice !== 'new'
                  }
                }
              : {}),
            [appointmentPath('address')]: {}
          }
        : {
            [appointmentPath('team-health-questions')]: {
              [appointmentPath('contact-selection')]: () => {
                if (
                  sessionData.journeyData.optedIntoHealthQuestions === 'true'
                ) {
                  return false
                }

                return appointment.patient.contacts?.length > 0
              },
              [appointmentPath('contact')]: () => {
                if (
                  sessionData.journeyData.optedIntoHealthQuestions === 'true'
                ) {
                  return false
                }

                return appointment.patient.contacts?.length === 0
              }
            }
          }),
      ...getHealthQuestionPathsForAppointment(
        appointmentPath,
        appointment,
        sessionData
      ),

      // Parent contact details
      ...(!isParentJourney
        ? {
            [appointmentPath('contact-selection')]: {}
          }
        : {}),
      [appointmentPath('contact')]: {
        [appointmentPath('parental-responsibility')]: {
          data: 'appointment.parentHasParentalResponsibility',
          value: 'false'
        }
      },
      [appointmentPath('communication-needs')]: {},

      // Check and confirm
      [appointmentPath('check-answers')]: {
        [getPath('confirmation')]: () =>
          !appointment.isAbandoned && !appointment.patient_uuid,
        [appointmentPath('thank-you')]: () => appointment.isAbandoned
      },

      // Reporting the lack of a convenient option
      [appointmentPath('not-convenient')]: {},
      ...(abandonmentReasons?.length > 1
        ? {
            [appointmentPath('least-convenient')]: {}
          }
        : {}),
      ...(abandonmentReasons.includes(AppointmentAbandonmentReason.Distance)
        ? {
            [appointmentPath('convenient-distance')]: {}
          }
        : {}),
      ...(abandonmentReasons.includes(AppointmentAbandonmentReason.DayOfWeek)
        ? {
            [appointmentPath('convenient-days')]: {}
          }
        : {}),
      ...(abandonmentReasons.includes(AppointmentAbandonmentReason.TimeOfDay)
        ? {
            [appointmentPath('convenient-times')]: {}
          }
        : {}),
      [appointmentPath('check-feedback')]: {},
      [appointmentPath('thank-you')]: {}
    }
  })

  // Merge all the appointments' paths into a single sequence, preserving order
  return Object.assign({}, ...pathsPerAppointment)
}

/**
 * Get wizard journey for editing an existing appointment
 *
 * Note: the wizard evaluates forks before the posted form is saved to the appointment, so any conditions that
 * depend on the page being posted should use the auto-stored answers in the session data (e.g.
 * `sessionData.journeyData.appointmentLengthType`) rather than the appointment itself.
 *
 * @param {ClinicAppointment} appointment - the appointment being edited
 * @param {object} sessionData - the request.session.data object
 * @param {JourneyPathBuilder} getPath - builds the (mount-relative) path to a view in the journey
 * @param {string} [firstView] - the view at which the change started
 * @returns {object} The journey object
 */
export const getAppointmentChangePaths = (
  appointment,
  sessionData,
  getPath,
  firstView
) => {
  const appointmentPath = (view) => getPath(view, appointment.uuid)

  // Will the chosen length fit anywhere in the session, and at the appointment's current time?
  const session = Session.findOne(appointment.session_id, sessionData)
  const slotCount = getEditedAppointmentSlotCount(appointment, sessionData)
  const fitsInSession = session.canFitSlotCount(
    slotCount,
    undefined,
    appointment.uuid
  )
  const fitsAtCurrentTime = session.canFitSlotCount(
    slotCount,
    appointment.startAt,
    appointment.uuid
  )

  const isChangingOnlyLength = firstView === 'appointment-length'

  const journey = {
    [appointmentPath('clinic-location')]: {},
    [appointmentPath('clinic-date')]: {},
    [appointmentPath('appointment-length')]: {},

    // Interrupt if the chosen length can't fit anywhere in the session
    ...(!fitsInSession ? { [appointmentPath('shorten-appointment')]: {} } : {}),

    // If only the length is changing and it won't fit at the current time (but will elsewhere), offer to shorten
    // the appointment to keep its time, or to choose a new time
    ...(isChangingOnlyLength && fitsInSession && !fitsAtCurrentTime
      ? { [appointmentPath('resolve-overrun')]: {} }
      : {}),

    [appointmentPath('appointment-time-range')]: {},
    [appointmentPath('appointment-time')]: {}
  }

  // Start the journey at the page at which the change started
  const firstIndex = Math.max(
    0,
    Object.keys(journey).indexOf(appointmentPath(firstView))
  )

  return Object.fromEntries(Object.entries(journey).slice(firstIndex))
}

/**
 * Get the length (in slots) chosen for an appointment being edited
 *
 * Note: when the appointment-length page is submitted, the chosen length is in the auto-stored answers but not yet
 * the appointment, so we use those answers when present
 *
 * @param {ClinicAppointment} appointment - the appointment being edited
 * @param {object} sessionData - the request.session.data object
 * @returns {number} - the chosen length of the appointment, in slots
 */
const getEditedAppointmentSlotCount = (appointment, sessionData) => {
  switch (sessionData.journeyData?.appointmentLengthType) {
    case AppointmentLengthType.Default:
      return appointment.session.calculateSlotCount(appointment)
    case AppointmentLengthType.Specific:
      return Number(sessionData.appointment?.editedSlotCount)
    default:
      return appointment.slotCount
  }
}

/**
 * Get the length (in slots) needed by an appointment being newly booked: the length needed for its vaccinations,
 * plus a slot if extending for support needs
 *
 * Note: if the team has accepted shortening the appointment to fit, that shortening applies only while this is
 * still the length it was shortened from, i.e. the appointment's `preferredSlotCount`
 *
 * @param {ClinicAppointment} appointment - the appointment we're booking
 * @param {boolean} extendForSupportNeeds - should the appointment have an extra slot for support needs?
 * @returns {number} - the length needed by the appointment, in slots
 */
export const getRequiredSlotCount = (appointment, extendForSupportNeeds) =>
  appointment.session.calculateSlotCount(appointment) +
  (extendForSupportNeeds ? 1 : 0)

/**
 * Are there enough consecutive slots free to fit this appointment in?
 *
 * @param {ClinicAppointment} appointment - the appointment we're booking
 * @param {boolean} useAppointmentTime - do we care about the appointment time or can we look anywhere?
 * @param {object} sessionData - the global data context
 * @returns {boolean} - true if the appointment will fit in the schedule, or false otherwise
 */
const canNewAppointmentLengthFitInSession = (
  appointment,
  useAppointmentTime,
  sessionData
) => {
  const extendForSupportNeeds = stringToBoolean(
    sessionData.journeyData.extendForSupportNeeds
  )
  const requiredSlotCount = getRequiredSlotCount(
    appointment,
    extendForSupportNeeds
  )

  // Use any shortening to fit that the team has already accepted for this length
  const slotCount =
    appointment.preferredSlotCount === requiredSlotCount
      ? appointment.editedSlotCount
      : requiredSlotCount

  const session = Session.findOne(appointment.session_id, sessionData)
  return session.canFitSlotCount(
    slotCount,
    useAppointmentTime ? appointment.startAt : undefined,
    appointment.uuid
  )
}

/**
 * Get the path for a single health question
 *
 * @param {string} key
 * @param {(view: string) => string} path - builds the path to a view in the appointment's journey
 * @returns {string} The full path to the given health question
 */
const getHealthQuestionPath = (key, path) => {
  return path(`health-question-${camelToKebabCase(key)}`)
}

/**
 * Get health question paths for the given appointment
 *
 * @param {(view: string) => string} path - builds the path to a view in the appointment's journey
 * @param {ClinicAppointment} appointment - the appointment whose questions we're after
 * @param {object} programmeContext - the data context holding the programme and vaccine info
 * @returns {object} Health question paths
 */
const getHealthQuestionPathsForAppointment = (
  path,
  appointment,
  programmeContext
) => {
  const paths = {}

  const healthQuestions = Object.entries(
    appointment.getUnansweredHealthQuestions(programmeContext)
  )

  healthQuestions.forEach(([key, question], index) => {
    const questionPath = getHealthQuestionPath(key, path)

    if (question.conditional) {
      const nextQuestion = healthQuestions[index + 1]
      if (nextQuestion) {
        const forkPath = getHealthQuestionPath(nextQuestion[0], path)

        paths[questionPath] = {
          [forkPath]: {
            data: `appointment.healthAnswers.${key}.answer`,
            value: 'No'
          }
        }
      } else {
        paths[questionPath] = {}
      }

      // Add paths for conditional sub-questions
      for (const subKey of Object.keys(question.conditional)) {
        const subQuestionPath = getHealthQuestionPath(subKey, path)
        paths[subQuestionPath] = {}
      }
    } else {
      paths[questionPath] = {}
    }
  })

  return paths
}

/**
 * Get a set of radio items to offer the user when entering address details of
 * the 2nd and subsequent children
 *
 * @param {Array<ClinicAppointment>} appointments - Appointments we’re creating
 * @returns {Array<object>} Set of radio items to display on address selection page
 */
export const getPreviousAddressItems = (appointments) => {
  let previousAddressItems = appointments
    .map(
      (appointment) =>
        appointment.child?.address && {
          text: Object.values(appointment.child.address)
            .filter((string) => string)
            .join(', '),
          value: appointment.uuid
        }
    )
    .filter((item) => item && item.text)
  // Take only copy of each address we've used so far
  previousAddressItems = [
    ...new Map(previousAddressItems.map((item) => [item.text, item])).values()
  ]

  return [
    ...previousAddressItems,
    {
      divider: 'or'
    },
    {
      text: 'Enter a different address',
      value: 'new'
    }
  ]
}

/**
 * Get a set of radio items to offer the user when choosing a clinic for
 * the 2nd and subsequent children
 *
 * @param {Array<ClinicAppointment>} appointments - Appointments we’re creating
 * @param {object} sessionContext - Context on which the sessions are stored
 * @returns {Array<object>} Set of radio items to display on the address selection page
 */
export const getPreviousSessionItems = (appointments, sessionContext) => {
  let previousClinicSessions = appointments
    .map(({ session_id }) => Session.findOne(session_id, sessionContext))
    .filter(Boolean)
  previousClinicSessions = _.uniqBy(previousClinicSessions, 'id')

  let previousClinicSessionItems = previousClinicSessions.map((session) => ({
    text: session.formatted.location,
    value: session.id,
    hint: session.formatted.date
  }))

  return [
    ...previousClinicSessionItems,
    {
      divider: 'or'
    },
    {
      text: 'Choose a different clinic location or date',
      value: 'new'
    }
  ]
}

/**
 * @import { Request } from 'express'
 */
