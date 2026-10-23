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
  response.render('parent-test/rosa/index')
})

router.get('/rosa/mmr', (request, response) => {
  response.render('parent-test/rosa/mmr/index')
})

router.get('/rosa/mmr/dose-1', (request, response) => {
  response.render('parent-test/rosa/mmr/dose-1')
})

router.get('/rosa/mmr/not-counted', (request, response) => {
  response.render('parent-test/rosa/mmr/not-counted')
})

router.get('/maya', (request, response) => {
  response.render('parent-test/maya/index')
})

router.get('/maya/mmr', (request, response) => {
  response.render('parent-test/maya/mmr/index')
})

router.get('/maya/mmr/dose-1', (request, response) => {
  response.render('parent-test/maya/mmr/dose-1')
})

router.get('/maya/mmr/dose-2', (request, response) => {
  response.render('parent-test/maya/mmr/dose-2')
})

router.get('/theo', (request, response) => {
  response.render('parent-test/theo/index')
})

router.get('/theo/mmr', (request, response) => {
  response.render('parent-test/theo/mmr/index')
})

router.get('/theo/mmr/dose-1', (request, response) => {
  response.render('parent-test/theo/mmr/dose-1')
})

router.get('/priya', (request, response) => {
  response.render('parent-test/priya/index')
})

router.get('/priya/mmr', (request, response) => {
  response.render('parent-test/priya/mmr/index')
})

router.get('/idris', (request, response) => {
  response.render('parent-test/idris/index')
})

router.get('/idris/mmr', (request, response) => {
  response.render('parent-test/idris/mmr/index')
})

router.get('/idris/mmr/dose-1', (request, response) => {
  response.render('parent-test/idris/mmr/dose-1')
})

router.get('/esme', (request, response) => {
  response.render('parent-test/esme/index')
})

router.get('/esme/mmr', (request, response) => {
  response.render('parent-test/esme/mmr/index')
})

router.get('/caleb', (request, response) => {
  response.render('parent-test/caleb/index')
})

router.get('/caleb/mmr', (request, response) => {
  response.render('parent-test/caleb/mmr/index')
})

router.get('/caleb/mmr/dose-1', (request, response) => {
  response.render('parent-test/caleb/mmr/dose-1')
})

router.get('/lena', (request, response) => {
  response.render('parent-test/lena/index')
})

router.get('/lena/mmr', (request, response) => {
  response.render('parent-test/lena/mmr/index')
})

router.get('/lena/mmr/dose-1', (request, response) => {
  response.render('parent-test/lena/mmr/dose-1')
})

router.get('/harriet', (request, response) => {
  response.render('parent-test/harriet')
})

router.get('/nadia', (request, response) => {
  response.render('parent-test/nadia')
})

router.get('/real/freya/chronological', (request, response) => {
  response.render('parent-test/real/freya/chronological')
})

router.get('/real/samuel/chronological', (request, response) => {
  response.render('parent-test/real/samuel/chronological')
})

router.get('/real/isla/chronological', (request, response) => {
  response.render('parent-test/real/isla/chronological')
})

router.get('/real/jacob/chronological', (request, response) => {
  response.render('parent-test/real/jacob/chronological')
})

router.get('/real/zara/chronological', (request, response) => {
  response.render('parent-test/real/zara/chronological')
})

router.get('/understanding-records', (request, response) => {
  response.render('parent-test/understanding-records')
})

export const parentTestRoutes = router
