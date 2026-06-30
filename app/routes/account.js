import express from 'express'

import { accountController as account } from '../controllers/account.js'

const router = express.Router({ strict: true })

router.get('/sign-in', account.login)

router.post('/cis2', account.cis2)

router.post('/dfe-sign-in', account.dfeSignIn)

router.post('/change-role', account.changeRole)

router.get('/sign-out', account.logout)

export const accountRoutes = router
