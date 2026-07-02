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

router.get('/rosa', (request, response) => {
  response.render('parent-test/rosa')
})

router.get('/maya', (request, response) => {
  response.render('parent-test/maya')
})

router.get('/theo', (request, response) => {
  response.render('parent-test/theo')
})

router.get('/priya', (request, response) => {
  response.render('parent-test/priya')
})

router.get('/idris', (request, response) => {
  response.render('parent-test/idris')
})

router.get('/esme', (request, response) => {
  response.render('parent-test/esme')
})

router.get('/caleb', (request, response) => {
  response.render('parent-test/caleb')
})

router.get('/dose-detail', (request, response) => {
  response.render('parent-test/dose-detail')
})

export const parentTestRoutes = router
