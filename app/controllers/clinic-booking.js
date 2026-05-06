import { ClinicBooking } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const clinicBookingController = {
  /**
   * @type {import("express").RequestParamHandler}
   */
  read(request, response, next, clinic_booking_uuid) {
    response.locals.clinicBooking = ClinicBooking.findOne(
      clinic_booking_uuid,
      request.session.data
    )

    next()
  },

  /**
   * @type {import("express").RequestHandler}
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
   * @type {import("express").RequestHandler}
   */
  show(request, response) {
    return response.render('clinic-booking/show')
  },

  /**
   * @type {import("express").RequestHandler}
   */
  list(request, response) {
    return response.render('clinic-booking/list')
  }
}
