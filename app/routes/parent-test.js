import express from 'express'

const router = express.Router({ strict: true })

const serviceName = "Check children’s vaccination history"

// Render parent-facing chrome (suppressed clinician nav and account menu),
// matching the give-or-refuse-consent flow.
router.use((request, response, next) => {
  response.locals.assetsName = 'public'
  response.locals.serviceName = serviceName
  response.locals.headerOptions = { service: { text: serviceName } }

  next()
})

router.get('/', (request, response) => {
  response.render('parent-test/index')
})

router.get('/fully-vaccinated', (request, response) => {
  response.render('parent-test/fully-vaccinated')
})

router.get('/dose-detail', (request, response) => {
  response.render('parent-test/dose-detail')
})

export const parentTestRoutes = router
