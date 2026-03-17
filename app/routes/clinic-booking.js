import express from 'express'

import { clinicBookingController as clinicBooking } from '../controllers/clinic-booking.js'

const router = express.Router({ strict: true, mergeParams: true })

router.get('/', clinicBooking.readAll, clinicBooking.list)

router.param('clinic_booking_uuid', clinicBooking.read)

router.get('/:clinic_booking_uuid', clinicBooking.show)

export const clinicBookingRoutes = router
