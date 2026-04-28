import { Router } from 'express'
import { passport, SCOPES } from './passport.js'
import { env } from '../env.js'

const router = Router()

router.get('/facebook', passport.authenticate('facebook', { scope: SCOPES, authType: 'rerequest' }))

router.get(
  '/facebook/callback',
  passport.authenticate('facebook', {
    failureRedirect: `${env.FRONTEND_URL}/?auth=failed`,
    session: true,
  }),
  (_req, res) => res.redirect(`${env.FRONTEND_URL}/dashboard`),
)

router.post('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err)
    req.session.destroy(() => {
      res.clearCookie('aim.sid')
      res.json({ ok: true })
    })
  })
})

export default router
