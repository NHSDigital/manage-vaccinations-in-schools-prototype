import { SessionPresetName } from '../enums.js'
import { Session } from '../models.js'
import { getClinicInviteUrlForPresets } from '../utils/clinic-booking.js'
import { formatDate, today } from '../utils/date.js'
import { getSessionConsentUrl } from '../utils/session.js'

export const navigation = (request, response, next) => {
  const { data } = request.session

  // Get currently active section
  let activeSection = request.path.split('/')[1]
  if (activeSection === 'programmes' && request.query.activity) {
    activeSection = 'sessions'
  }
  if (['moves', 'notices', 'consents'].includes(activeSection)) {
    activeSection = 'reviews'
  }

  // Get programme sessions
  const sessions = Session.findAll(data)

  response.locals.navigation = {
    activeSection,
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
