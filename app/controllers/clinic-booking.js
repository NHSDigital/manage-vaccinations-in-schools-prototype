import { ClinicBooking } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const clinicBookingController = {
  read(request, response, next, clinic_booking_uuid) {
    response.locals.clinicBooking = ClinicBooking.findOne(
      clinic_booking_uuid,
      request.session.data
    )

    next()
  },

  readAll(request, response, next) {
    const clinicBookings = ClinicBooking.findAll(request.session.data)

    // // Sort - not available yet
    // clinicBookings = _.sortBy(clinicBookings, 'createdAt')

    response.locals.clinicBookings = clinicBookings
    response.locals.results = getResults(clinicBookings, request.query)
    response.locals.pages = getPagination(clinicBookings, request.query)

    next()
  },

  show(request, response) {
    response.render('clinic-booking/show')
  },

  list(request, response) {
    response.render('clinic-booking/list')
  }
}
