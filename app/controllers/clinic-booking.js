import _ from 'lodash'

import { ClinicBooking } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const clinicBookingController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, clinic_booking_uuid) {
    response.locals.clinicBooking = ClinicBooking.findOne(
      clinic_booking_uuid,
      request.session.data
    )

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    const clinicBookings = ClinicBooking.findAll(request.session.data)

    // Sort
    let results = _.sortBy(clinicBookings, 'createdAt')

    response.locals.clinicBookings = clinicBookings
    response.locals.results = getResults(results, request.query)
    response.locals.pages = getPagination(results, request.query)

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    return response.render('clinic-booking/show')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    return response.render('clinic-booking/list')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
