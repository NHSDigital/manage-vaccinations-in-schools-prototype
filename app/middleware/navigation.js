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
    referrer: request.originalUrl,
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
      'adolescent programmes': getClinicInviteUrlForPresets([
        SessionPresetName.HPV,
        SessionPresetName.Doubles
      ]),
      'all but flu': getClinicInviteUrlForPresets([
        SessionPresetName.HPV,
        SessionPresetName.Doubles,
        SessionPresetName.MMR
      ])
    }
  }

  // Show environment date in footer
  response.locals.today = formatDate(today(), { dateStyle: 'long' })

  next()
}
