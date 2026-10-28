import { SessionPresetName } from '../enums.js'
import { Session } from '../models.js'
import { getClinicInviteUrlForPresets } from '../utils/clinic-booking.js'
import { formatDate, today } from '../utils/date.js'
import { getSessionConsentUrl } from '../utils/session.js'

export const navigation = (request, response, next) => {
  const { data } = request.session
  const { __, account } = response.locals

  const primaryNavigation = new Map([
    ['school', '/schools'],
    ['patient', '/patients'],
    ['session', '/sessions'],
    ['review', '/reviews'],
    ['report', '/reports'],
    ['upload', '/uploads'],
    ['download', '/downloads'],
    ['vaccine', '/vaccines'],
    ['team', account.team.uri]
  ])

  const sectionAliases = {
    consents: 'reviews',
    moves: 'reviews',
    notices: 'reviews',
    'unmatched-appointments': 'reviews'
  }

  // Get currently active section
  let activeSection = request.path.split('/')[1]
  activeSection = sectionAliases[activeSection] ?? activeSection

  // Construct primary navigation
  const primary = []
  for (const view of account.views) {
    const href = primaryNavigation.get(view)
    const label = account.isSchoolUser
      ? __(`${view}.listSchoolUser.label`)
      : __(`${view}.list.label`)

    primary.push({
      href,
      text: view === 'team' ? __(`team.show.label`) : label,
      active: activeSection === href.split('/')[1]
    })
  }

  // Get programme sessions
  const sessions = Session.findAll(data)

  response.locals.navigation = {
    primary,
    consentUrl: {
      Flu: getSessionConsentUrl(sessions, SessionPresetName.Flu),
      HPV: getSessionConsentUrl(sessions, SessionPresetName.HPV),
      Doubles: getSessionConsentUrl(sessions, SessionPresetName.Doubles),
      'MMR(V)': getSessionConsentUrl(sessions, SessionPresetName.MMR)
    },
    clinicInviteUrl: {
      Flu: getClinicInviteUrlForPresets([SessionPresetName.Flu]),
      HPV: getClinicInviteUrlForPresets([SessionPresetName.HPV]),
      Doubles: getClinicInviteUrlForPresets([SessionPresetName.Doubles]),
      'MMR(V)': getClinicInviteUrlForPresets([SessionPresetName.MMR]),
      'Flu and MMR(V)': getClinicInviteUrlForPresets([
        SessionPresetName.AutumnCatchup
      ]),
      'HPV and MMR(V)': getClinicInviteUrlForPresets([
        SessionPresetName.SpringCatchup
      ]),
      'HPV, MenACWY, Td/IPV and MMR(V)': getClinicInviteUrlForPresets([
        SessionPresetName.SummerCatchup
      ])
    },
    meta: [
      {
        text: 'Homepage',
        href: '/'
      },
      {
        text: 'Activity log items',
        href: '/activity'
      },
      {
        text: 'CIS2 users',
        href: '/users'
      },
      {
        text: 'Reset data',
        href: '/reset'
      },
      {
        text: 'Design history',
        href: 'https://design-history.prevention-services.nhs.uk/manage-vaccinations-in-schools/'
      }
    ],
    referrer: request.originalUrl
  }

  // Show environment date in footer
  response.locals.today = formatDate(today(), { dateStyle: 'long' })

  next()
}
