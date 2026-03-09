import _ from 'lodash'

import { SessionPresets } from '../enums.js'
import { ClinicBooking, Programme } from '../models.js'

import allProgrammesData from '../datasets/programmes.js'

export const bookIntoClinicController = {

  // Load the preset into locals
  read(request, response, next, session_preset_slug) {

    // Record both the session preset (aka "primary programme" to the parent) and the programme types that comprises
    const sessionPreset = SessionPresets.find(preset => preset.slug === session_preset_slug) ?? SessionPresets[0]
    response.locals.sessionPreset = sessionPreset

    const programmes = sessionPreset.programmeTypes.map(pt => Programme.findOne(allProgrammesData[pt].id, request.session.data))
    response.locals.programmes = programmes

    next()
  },

  /**
   * Send to the start page
   * @param {*} request 
   * @param {*} response 
   */
  redirect(request, response) {
    const { sessionPreset } = response.locals

    response.redirect(`${request.baseUrl}/${sessionPreset.slug}/start`)
  },

  /**
   * Catch-all for pages not needing to reference a given clinic booking
   * 
   * @param {*} request 
   * @param {*} response 
   */
  show(request, response) {
    const view = request.params.view || 'show'

    // TODO: later, reinsert the logic for showing emails and texts here (see the consent stuff in parent.js)

    response.render(`book-into-a-clinic/${view}`)
  },

  /**
   * Start a new clinic booking for clinics with the primary programme we've been given
   * 
   * @param {*} request 
   * @param {*} response 
   */
  new(request, response) {
    const { data } = request.session
    const { primaryProgramme } = request.params

    // TODO:
    //  [X] Add a SessionPreset property to the ClinicBooking model, so that we know what type of session the children have been invited to.
    //  [ ] Update the generators to make sure things are created right
    //  [ ] Create enough different clinic sessions of the right types to cover the different presets

    // Create a new clinic booking in the wizard context
    const booking = ClinicBooking.createInContext(
      {
        primaryProgramme
      },
      data.wizard
    )

    response.redirect(`${booking.bookingUri}/new/child-count`)
  }
}
