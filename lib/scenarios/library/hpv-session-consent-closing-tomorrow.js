import { SessionPresetName, SessionPresets } from '../../../app/enums.js'
import { generateChild } from '../../../app/generators/child.js'
import { generateContact } from '../../../app/generators/contact.js'
import { generatePatient } from '../../../app/generators/patient.js'
import { generateSession } from '../../../app/generators/session.js'
import {
  Contact,
  Patient,
  PatientSession,
  Session
} from '../../../app/models.js'
import {
  addDays,
  getCurrentAcademicYear,
  removeDays,
  today
} from '../../../app/utils/date.js'
import { defineScenario } from '../define-scenario.js'

export default defineScenario({
  name: 'Chasing for flu consent as the window’s about to close',
  description:
    'A school flu session whose consent window is about to close, with a child who hasn’t responded yet.',
  run(context, shared) {
    const { fluPrimarySchool, nurse } = shared

    // Create an impending flu session
    const fluPreset = SessionPresets.find(
      (preset) => preset.name === SessionPresetName.Flu
    )
    let session = generateSession(fluPreset, nurse, {
      school_id: fluPrimarySchool.id
    })

    // Consent closes the day before the session, so this closes tomorrow
    session.academicYear = getCurrentAcademicYear()
    session.date = addDays(today(), 2)
    session.consentOpenAt = removeDays(today(), 14)
    session = Session.create(session, context)
    const programme_id = session.programme_ids[0]

    // Create a new child to set up for flu
    const schoolsToPickFrom = {
      [fluPrimarySchool.id]: fluPrimarySchool
    }
    const child = generateChild(schoolsToPickFrom)
    child.firstName = 'Nova'
    child.lastName = 'Reston'
    let patient = generatePatient(child)
    const contact = generateContact(patient, true)
    Contact.create(contact, context)
    patient.contact_uuids.push(contact.uuid)
    Patient.create(patient, context)

    // Add them to the flu session and record that their parents have been
    // asked for consent
    patient = Patient.findOne(patient.uuid, context)
    const patientSession = new PatientSession(
      {
        createdAt: session.consentOpenAt,
        patient_uuid: patient.uuid,
        programme_id,
        session_id: session.id
      },
      context
    )
    patient.addToSession(patientSession)
    patient.requestConsent(patientSession)
    PatientSession.create(patientSession, context)

    // Return links to useful places for UR related to this scenario
    return {
      startUrl: session.uri,
      links: [
        { label: session.shortName, href: session.uri },
        {
          label: `${patient.fullFriendlyName}: no consent response`,
          href: patient.uri
        }
      ]
    }
  }
})
