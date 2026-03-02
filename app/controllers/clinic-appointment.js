import _ from 'lodash'

import { ClinicAppointment } from '../models.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const clinicAppointmentController = {
  read(request, response, next, clinic_appointment_uuid) {
    response.locals.clinicAppointment = ClinicAppointment.findOne(clinic_appointment_uuid, request.session.data)

    next()
  },

  readAll(request, response, next) {
    let clinicAppointments = ClinicAppointment.findAll(request.session.data)

    // // Sort - not available yet
    // clinicAppointments = _.sortBy(clinicAppointments, 'createdAt')

    response.locals.clinicAppointments = clinicAppointments
    response.locals.results = getResults(clinicAppointments, request.query)
    response.locals.pages = getPagination(clinicAppointments, request.query)

    next()
  },

  show(request, response) {
    response.render('clinic-appointment/show')
  },

  list(request, response) {
    response.render('clinic-appointment/list')
  },

  update(request, response) {
    // const { decision } = request.body
    const { data } = request.session
    const { __, clinicAppointment } = response.locals

    // // Clean up session data
    // delete data.decision

    // // Ignore or switch schools  
    // decision === 'ignore'
    //   ? clinicAppointment.ignore(clinicAppointment.uuid, data)
    //   : clinicAppointment.switch(clinicAppointment.uuid, data)

    // request.flash('success', __(`clinicAppointment.${decision}.success`, { clinicAppointment }))

    response.redirect('/clinic-appointments')
  }
}
