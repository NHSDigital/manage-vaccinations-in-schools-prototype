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
   * @type {RequestHandler}
   */
  readAll(request, response, next) {
    const clinicBookings = ClinicBooking.findAll(request.session.data)

    // // Sort - not available yet
    // clinicBookings = _.sortBy(clinicBookings, 'createdAt')

    response.locals.clinicBookings = clinicBookings
    response.locals.results = getResults(clinicBookings, request.query)
    response.locals.pages = getPagination(clinicBookings, request.query)

    return next()
  },

  /**
   * @type {RequestHandler}
   */
  show(request, response) {
    return response.render('clinic-booking/show')
  },

  /**
   * @type {RequestHandler}
   */
  list(request, response) {
    return response.render('clinic-booking/list')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
