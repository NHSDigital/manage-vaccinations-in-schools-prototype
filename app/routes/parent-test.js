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

router.get('/lena', (request, response) => {
  response.render('parent-test/lena')
})

router.get('/maya-overview', (request, response) => {
  response.render('parent-test/maya-overview')
})

router.get('/rosa-overview', (request, response) => {
  response.render('parent-test/rosa-overview')
})

router.get('/understanding-records', (request, response) => {
  response.render('parent-test/understanding-records')
})

router.get('/rosa/dose-1', (request, response) => {
  response.render('parent-test/rosa/dose-1')
})

router.get('/rosa/not-counted', (request, response) => {
  response.render('parent-test/rosa/not-counted')
})

router.get('/maya/dose-1', (request, response) => {
  response.render('parent-test/maya/dose-1')
})

router.get('/maya/dose-2', (request, response) => {
  response.render('parent-test/maya/dose-2')
})

router.get('/theo/dose-1', (request, response) => {
  response.render('parent-test/theo/dose-1')
})

router.get('/idris/dose-1', (request, response) => {
  response.render('parent-test/idris/dose-1')
})

router.get('/caleb/dose-1', (request, response) => {
  response.render('parent-test/caleb/dose-1')
})

router.get('/lena/dose-1', (request, response) => {
  response.render('parent-test/lena/dose-1')
})

router.get('/dose-detail', (request, response) => {
  response.render('parent-test/dose-detail')
})

export const parentTestRoutes = router
