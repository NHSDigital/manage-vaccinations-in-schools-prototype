import { healthQuestions } from '../datasets/health-questions.js'
import {
  AcademicYear,
  DownloadType,
  RegistrationStatus,
  ReplyDecision,
  ReplyRefusal,
  ScreenStatus,
  SessionPresetName,
  UploadStatus
} from '../enums.js'

const thisAcademicYear = Object.values(AcademicYear).at(-1)

/**
 * @returns {LocaleCatalog}
 */
export const en = {
  actions: {
    label: 'Actions',
    change: 'Change',
    delete: 'Delete',
    edit: 'Edit',
    review: 'Review',
    update: 'Update',
    archive: 'Archive'
  },
  count: {
    updates:
      '{count, plural, =0 {No fields updated} one {1 field updated} other {# fields updated}}'
  },
  location: {
    name: {
      label: 'Name',
      hint: 'The site name must be unique. It is shown to parents on the consent form and related emails. Existing sites for this school are: %s.'
    },
    addressLine1: {
      label: 'Address line 1'
    },
    addressLine2: {
      label: 'Address line 2'
    },
    addressLevel1: {
      label: 'Town or city'
    },
    postalCode: {
      label: 'Postcode'
    },
    venueInformation: {
      label: 'Clinic information',
      hint: 'How to access the clinic — for example, parking or entrance information (this displays in the parent’s booking confirmation)'
    }
  },
  defaultBatch: {
    label: 'Default batch',
    visuallyHiddenText:
      'Change<span class="nhsuk-u-visually-hidden"> default batch for %s</span> ',
    title: '{count, plural, one{Default batch} other{Default batches}}',
    edit: {
      title: 'Select a default batch for this session',
      success: 'Default batch updated'
    },
    id: {
      label: 'Default batch number',
      title: 'Default to this batch for this session'
    }
  },
  form: {
    confirm: 'Save changes',
    continue: 'Continue'
  },
  error: {
    title: 'There is a problem'
  },
  account: {
    'change-role': {
      title: 'Select a role',
      label: 'Change role'
    },
    'sign-in': {
      title: 'Log in',
      confirm: 'Log in'
    },
    'sign-out': {
      title: 'Log out'
    },
    cis2: {
      title: 'Log in with my Care Identity',
      unlock: 'I need to unlock my smartcard',
      method: {
        label: 'Select your login method',
        smartcard: 'Smartcard',
        hello: 'Windows Hello',
        key: 'Security key',
        ipad: 'iPad app',
        authenticator: 'Authenticator app',
        nhsMail: 'NHS.net Connect (formerly NHSmail)',
        passkey: 'Passkey (including Windows Hello and Security key)'
      },
      terms: {
        title: 'Agree to our terms of use',
        description:
          'By continuing, you agree to our [terms and conditions](https://digital.nhs.uk/services/care-identity-service/registration-authority-users/registration-authority-help/privacy-notice#terms-and-conditions)'
      },
      remember: {
        label: 'Remember my selection',
        hint: 'Do not check this box if you are on a shared computer'
      }
    },
    dfeSignIn: {
      label: 'DfE Sign-in',
      title: 'Sign in with DfE Sign-in',
      login: {
        title: 'Access the DfE Sign-in service',
        email: {
          title: 'Log into your account',
          hint: 'Enter your email address to sign in.',
          confirm: 'Next'
        }
      },
      terms: {
        description:
          'By signing in, you accept [DfE Sign-in terms and conditions](https://interactions.signin.education.gov.uk/terms).'
      },
      new: {
        title: 'New users of DfE Sign-in',
        confirm: 'Create an account'
      },
      services: {
        title: 'Services using DfE Sign-in',
        description:
          'These DfE services are now accessed using your DfE Sign-in account.'
      }
    },
    permissions: {
      org: {
        title: 'Your team is not using this service yet',
        description: '{{ra}} is not currently set up to use Mavis.'
      },
      user: {
        title: 'You do not have permission to use this service'
      }
    }
  },
  batch: {
    new: {
      label: 'Add a new batch',
      ariaLabel: 'Add a new %s batch',
      title: 'Add batch',
      confirm: 'Add batch',
      success: 'Batch {{batch.id}} added'
    },
    action: {
      title: 'Are you sure you want to %s this batch?',
      description: 'This cannot be undone.',
      cancel: 'No, return to vaccines',
      confirm: 'Yes, %s this batch'
    },
    archive: {
      success: 'Batch {{batch.id}} archived'
    },
    createdAt: {
      label: 'Entered date'
    },
    updatedAt: {
      label: 'Updated date'
    },
    expiry: {
      label: 'Expiry date',
      hint: 'For example, 27 10 2025'
    },
    id: {
      label: 'Batch number'
    }
  },
  clinic: {
    new: {
      title: 'Add a new clinic',
      confirm: 'Add clinic',
      success: '{{clinic.name}} created'
    },
    edit: {
      label: 'Edit',
      title: 'Edit clinic',
      confirm: 'Save changes',
      success: '{{clinic.name}} updated'
    },
    action: {
      title: 'Are you sure you want to %s this clinic?',
      description: 'This cannot be undone.',
      confirm: 'Yes, %s this clinic',
      cancel: 'No, return to clinics'
    },
    delete: {
      label: 'Delete',
      success: 'Clinic deleted'
    },
    name: {
      label: 'Name'
    },
    address: {
      label: 'Address'
    },
    count: '{count, plural, =0 {No clinics} one {1 clinic} other {# clinics}}'
  },
  child: {
    label: 'Child',
    nhsn: {
      label: 'NHS number'
    },
    fullName: {
      label: 'Full name'
    },
    fullFriendlyName: {
      label: 'Full name'
    },
    preferredFirstName: {
      label: 'Preferred first name'
    },
    preferredLastName: {
      label: 'Preferred last name'
    },
    preferredName: {
      label: 'Preferred name'
    },
    fullAndPreferredNames: {
      label: 'Name'
    },
    dob: {
      label: 'Date of birth'
    },
    dobWithAge: {
      label: 'Date of birth'
    },
    gender: {
      label: 'Gender'
    },
    ethnicity: {
      label: 'Ethnicity'
    },
    adjustments: {
      label: 'Reasonable adjustments'
    },
    impairments: {
      label: 'Impairments'
    },
    address: {
      label: 'Home address'
    },
    postalCode: {
      label: 'Postcode'
    },
    school: {
      label: 'School'
    },
    schoolName: {
      label: 'School'
    },
    gpSurgery: {
      label: 'GP surgery'
    },
    contact: {
      label: 'Parent'
    }
  },
  appointments: {
    label: 'Clinic appointment',
    list: {
      label: 'Clinic appointments',
      title: 'Unmatched clinic appointments'
    },
    show: {
      title: 'Clinic appointment made by %s'
    },
    count: {
      total:
        '{count, plural, =0 {No unmatched clinic appointments} one {1 unmatched clinic appointment} other {{count} unmatched clinic appointments}}',
      activity:
        '{count, plural, =0 {No unmatched clinic appointments} one {1 unmatched clinic appointment} other {{count} unmatched clinic appointments}}',
      session:
        '{count, plural, =0 {No unmatched clinic appointments at {location}} one {1 unmatched clinic appointment at {location}} other {{count} unmatched clinic appointments at {location}}}'
    },
    add: {
      label: 'Create new record',
      title: 'Create a new child record from this clinic appointment?',
      caption: 'Clinic appointment made by {{contact.fullName}}',
      confirm: 'Create a new child record',
      success:
        '[{{patient.fullName}}]({{patient.uri}})’s record created from a clinic appointment made by {{appointment.contact.fullName}}'
    },
    results:
      '{count, plural, =0 {No unmatched appointments matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> unmatched appointment} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> unmatched appointments}}',
    summary: {
      label: 'Appointment'
    },
    location: {
      label: 'Clinic location'
    },
    date: {
      label: 'Clinic date'
    },
    time: {
      label: 'Appointment time'
    },
    vaccinations: {
      label: 'Programmes'
    },
    link: {
      title: 'Link clinic appointment with child record?',
      caption: 'Clinic appointment made by {{contact.fullName}}',
      summary: 'Compare child details',
      confirm: 'Link appointment with record',
      success:
        'Clinic appointment made by {{appointment.contact.fullName}} linked to [{{patient.fullName}}]({{patient.uri}})’s record'
    },
    match: {
      label: 'Match',
      title: 'Search for a child record to match with {{child.fullName}}',
      caption: 'Consent response from {{contact.formatted.fullName}}',
      child: {
        fullAndPreferredNames: {
          label: 'Child’s name'
        }
      },
      contact: {
        label: 'Parent'
      }
    },
    note: {
      label: 'Notes'
    },
    archive: {
      label: 'Archive',
      caption: 'Clinic appointment made by {{appointment.contact.fullName}}',
      title: 'Archive response',
      description:
        'The unmatched clinic appointment will be hidden. This cannot be undone.',
      confirm: 'Archive this appointment',
      success:
        'Clinic appointment made by {{appointment.contact.fullName}} archived'
    }
  },
  clinicAppointment: {
    label: 'Appointment details',
    show: {
      title: 'Clinic appointment for %s'
    },
    nameAndAge: {
      label: 'Child'
    },
    fullName: {
      label: 'Full name'
    },
    child: {
      label: 'Child'
    },
    dob: {
      label: 'Date of birth'
    },
    location: {
      label: 'Clinic location'
    },
    date: {
      label: 'Date'
    },
    dateAndTime: {
      label: 'Date and time'
    },
    timeSlot: {
      label: 'Time'
    },
    vaccinations: {
      label: 'Vaccinations'
    },
    fluVaccineType: {
      label: 'Flu vaccine'
    },
    mmrVaccineType: {
      label: 'MMR vaccine'
    },
    homeAddress: {
      label: 'Home address'
    },
    parentalRelationship: {
      label: 'Your relationship'
    },
    programmeTags: {
      label: 'Programmes'
    },
    offerRebooking: {
      label: 'Offer rebooking?'
    },
    impairments: {
      label: 'Impairments'
    },
    adjustments: {
      label: 'Reasonable adjustments'
    },
    contactDetails: {
      label: 'Contact'
    },
    arrivalTime: {
      label: 'Arrival time'
    },
    preferredPostcode: {
      label: 'Preferred clinic location'
    },
    abandonmentReasons: {
      label: 'Reasons for not booking'
    },
    primaryAbandonmentReason: {
      label: 'Most important reason'
    },
    convenientDistance: {
      label: 'Furthest you can travel'
    },
    convenientDays: {
      label: 'Convenient days'
    },
    convenientTimes: {
      label: 'Convenient times'
    },
    bookingReference: {
      label: 'Booking reference'
    }
  },
  clinicBooking: {
    start: {
      title: 'Book a clinic vaccination',
      intro:
        'If your child has not been vaccinated at school, or is not up to date with their vaccinations for any other reason, you can book into a clinic.\n\nAt their appointment, your child can also have other vaccinations that they previously missed.',
      programme: {
        flu: 'This vaccine protects against flu, which can cause serious health problems such as bronchitis and pneumonia.\n\nWhen you book an appointment, you can choose either:\n\n- a quick and painless nasal spray - this contains gelatine, derived from pigs (porcine gelatine)\n- an injection - this does not contain gelatine, so is suitable for people who cannot have gelatine for religious, dietary or other reasons\n\nYou can [find out more about the children’s flu vaccine](https://www.nhs.uk/vaccinations/child-flu-vaccine/).\n\nYou can also find:\n\n- [information resources about the vaccine on GOV.UK](https://www.gov.uk/government/publications/flu-vaccination-leaflets-and-posters), including in other languages\n- [information about the use of gelatine in the flu vaccine on GOV.UK](https://www.gov.uk/government/publications/vaccines-and-porcine-gelatine), including the views of faith communities',
        hpv: 'This vaccine helps protect boys and girls against:\n\n- cancers caused by HPV\n- genital warts\n\nYou can:\n\n- [find out more about the HPV vaccine](https://www.nhs.uk/vaccinations/hpv-vaccine/)\n- find a range of [information resources about the vaccine on GOV.UK](https://www.gov.uk/government/publications/hpv-vaccine-vaccination-guide-leaflet), including in other languages',
        menacwy:
          'The MenACWY vaccine helps protect against life-threatening illnesses including meningitis, sepsis and septicaemia (blood poisoning).\n\nYou can:\n\n- [find out more about the MenACWY vaccine](https://www.nhs.uk/vaccinations/menacwy-vaccine/)\n- find a range of [information resources about the vaccine on GOV.UK](https://www.gov.uk/government/publications/menacwy-vaccine-information-for-young-people), including in other languages',
        mmr: 'This vaccine protects against measles, mumps and rubella.\n\nResearch has shown there is no link between this vaccine and autism.\n\nIf you’re sure your child has already had the full 2 doses of the vaccine, [tell us you do not consent to this vaccination](#).\n\nYou can:\n\n- [find out more about the MMR vaccine](https://www.nhs.uk/vaccinations/mmr-vaccine/)\n- find a range of [information resources about the vaccine on GOV.UK](https://www.gov.uk/government/publications/mmr-for-all-general-leaflet), including in other languages',
        mmrv: 'This vaccine protects against measles, mumps, rubella, and chickenpox (varicella).\n\nResearch has shown there is no link between this vaccine and autism.\n\nIf you’re sure your child has already had the full 2 doses of the vaccine, [tell us you do not consent to this vaccination](#).\n\nYou can:\n\n- [find out more about the MMRV vaccine](https://www.nhs.uk/vaccinations/mmrv-vaccine/)\n- find a range of [information about the vaccine on GOV.​UK](https://www.gov.uk/government/publications/mmrv-vaccination), including in other languages',
        'td-ipv':
          'The Td/IPV vaccine (3-in-1 teenage booster) helps protect against tetanus, diphtheria and polio. It boosts the protection provided by the [6-in-1 vaccine](https://www.nhs.uk/vaccinations/6-in-1-vaccine/) and [4-in-1 pre-school booster](https://www.nhs.uk/vaccinations/4-in-1-preschool-booster-vaccine/) vaccine.\n\nYou can:\n\n- [find out more about the Td/IPV vaccine](https://www.nhs.uk/vaccinations/td-ipv-vaccine-3-in-1-teenage-booster)\n- you can also find a range of [information resources about the vaccine on GOV.UK](https://www.gov.uk/government/publications/a-guide-to-the-3-in-1-teenage-booster-tdipv), including in other languages'
      },
      online: {
        title: 'Book online',
        description:
          'The quickest way to book an appointment is online, using this form. It will take less than 5 minutes.',
        confirm: 'Start now'
      },
      otherMethods: {
        title: 'Other ways to book an appointment',
        description:
          'If you cannot use this form, you can book an appointment by phoning {{team.tel}}.'
      }
    },
    availability: {
      title: {
        invited: 'Book an appointment for your child’s vaccination',
        selected:
          '{count, plural, one {There are no clinics scheduled for your preferred vaccination} other {There are no clinics scheduled for your preferred vaccinations}}'
      },
      problem:
        'There are no clinics scheduled for {{ programmes }} vaccinations at this time.',
      guidance:
        'Contact your local vaccinations team, who may be able to arrange an appointment at another clinic, by phoning {{ team.tel }} or emailing {{ team.email }}.'
    },
    fullyBooked: {
      title: 'All clinics are now fully booked',
      problem:
        'All clinics scheduled for {{ programmes }} vaccinations are now fully booked.',
      guidance:
        'Contact your local vaccinations team, who may be able to arrange an appointment at another clinic, by phoning {{ team.tel }} or emailing {{ team.email }}.'
    },
    childCount: {
      title: 'How many children do you need to book appointments for?',
      description:
        'If you have more than one child invited to a clinic, you can book appointments for all of them.',
      children: {
        label: 'Number of children',
        hint: 'For example, if you have twins needing vaccination, enter 2'
      }
    },
    nextChildButtonText: 'Continue to next child',
    appointment: {
      caption: 'Appointment for %s'
    },
    findChild: {
      title: 'Search for the child to add'
    },
    notEligible: {
      title: '%s cannot be vaccinated at clinic',
      description:
        'The selected child cannot be vaccinated at clinic for any programme, or already has vaccinations scheduled.',
      return: 'Return to the session'
    },
    child: {
      title: {
        first: 'What is your child’s name?',
        next: 'What is your next child’s name?'
      },
      caption: 'Appointment for your %s child',
      summary: 'About your child',
      description:
        'Give the name on your child’s birth certificate. If it’s changed, give the name held by your child’s GP.',
      firstName: {
        label: 'First name',
        hint: 'Or given name'
      },
      lastName: {
        label: 'Last name',
        hint: 'Or family name'
      },
      hasPreferredName: {
        label: 'Do they prefer to be known by a different name?',
        yes: 'Yes',
        no: 'No'
      },
      preferredFirstName: {
        label: 'Preferred first name'
      },
      preferredLastName: {
        label: 'Preferred last name'
      }
    },
    dob: {
      title: 'What is %s’s date of birth?',
      hint: 'For example, 27 3 2012'
    },
    address: {
      title: 'What is %s’s home address?',
      hint: 'Give the child’s primary address. We use this to confirm their identity.'
    },
    addressSelection: {
      title: 'What is %s’s home address?',
      hint: 'Select the child’s primary address. We use this to confirm their identity.'
    },
    impairments: {
      title: 'Does %s have any of the following impairments?',
      none: {
        label: 'No, %s has no impairments'
      }
    },
    adjustments: {
      title:
        'Will %s need any of the following adjustments during their vaccination?',
      none: {
        label: 'No, %s does not need any adjustments'
      }
    },
    parentalRelationship: {
      title: 'What is your relationship to %s?',
      hasParentalResponsibility: {
        label: 'Do you have parental responsibility?',
        delegatedLabel:
          'Do you have delegated authority to consent to immunisations?',
        hint: 'This means you have legal rights and duties relating to the child'
      },
      relationshipOther: {
        label: 'Relationship to the child'
      },
      relationship: {
        label: 'Relationship to child'
      }
    },
    parentalResponsibility: {
      title: 'You will be unable to give consent',
      description:
        'To give or refuse consent for a child’s vaccination, you need to have parental responsibility.\n\nIf you have any questions, please contact the local health organisation by calling {{team.tel}}, or email {{team.email}}.'
    },
    programmes: {
      title: {
        parent:
          '{count, plural, one {Do you consent to {firstName} having the following vaccination?} other {Do you consent to {firstName} having the following vaccinations?}}',
        team: 'Select the {count, plural, one {vaccination} other {vaccinations}} to book'
      },
      eligibility:
        '{ firstName } is eligible for the following {count, plural, one {vaccination} other {vaccinations}} and is not scheduled to be vaccinated at an upcoming school session.',
      hint: 'Each vaccine is given separately'
    },
    fluChoice: {
      title: {
        parent: 'Which flu vaccine do you agree to %s having?',
        team: 'Which flu vaccine will the child have?'
      },
      nasal: {
        label: {
          parent: 'I agree to the nasal spray vaccine',
          team: 'The nasal spray vaccine'
        },
        hint: 'This is the recommended option and gives the best protection against flu'
      },
      injection: {
        label: {
          parent: 'I agree to the alternative flu injection',
          team: 'The alternative flu injection'
        },
        hint: 'This is suitable for children who do not use gelatine products, or if they cannot have the nasal spray vaccine for medical reasons'
      }
    },
    fluAlternative: {
      title: {
        parent:
          'If %s cannot have the nasal spray, do you agree to them having the injected vaccine instead?',
        team: 'If the child cannot have the nasal spray, can they have the injected vaccine instead?'
      },
      hint: 'We may decide the nasal spray vaccine is not suitable. In this case, we may offer the injected vaccine instead.',
      yes: {
        label: {
          parent: 'Yes',
          team: 'Yes, we can give an injection, if required'
        }
      },
      no: {
        label: {
          parent: 'No',
          team: 'No, use only the nasal spray'
        }
      }
    },
    mmrAlternative: {
      title: {
        parent: 'Do you want %s to have an MMR vaccine without gelatine?',
        team: 'Which type of MMR vaccine can the child have?'
      },
      hint: 'One type of MMR vaccine contains gelatine from pigs. An alternative MMR vaccine is available that does not contain gelatine.',
      yes: {
        label: {
          parent:
            'I want my child to have the vaccine that does not contain gelatine',
          team: 'Use only the vaccine that does not contain gelatine'
        }
      },
      no: {
        label: {
          parent: 'My child can have either type of vaccine',
          team: 'Either type of vaccine can be given'
        }
      }
    },
    preferredLocation: {
      title: {
        parent: 'Find a clinic near where you’d like %s’s appointment',
        team: 'What is the parent or guardian’s preferred clinic location?'
      },
      location: {
        label: 'Preferred clinic location',
        hint: 'Enter a town, city, or postcode'
      }
    },
    preferredLocationMatches: {
      title: 'We found 3 places that match “%s”',
      hits: {
        label: 'Choose one of the following:'
      },
      tryAgain: 'None of these — try another town, city, or postcode'
    },
    sessionSelection: {
      title: 'Choose a clinic for %s’s appointment',
      hint: 'Select the same location and date as an earlier child, or find a different clinic.'
    },
    clinicDistance: {
      title: 'All available clinics are more than 100 miles away',
      description: {
        parent:
          'All available clinics are more than 100 miles from your preferred location of {{postcode}}.\n\nYou can:\n\n- continue if you are sure you have entered the correct location\n- try another location\n\nIf you need more help finding a clinic, call the vaccinations team on {{team.tel}} or email {{team.email}}.',
        team: 'All available clinics are more than 100 miles from the preferred location of {{postcode}}.\n\nYou can:\n\n- continue if you are sure you have entered the correct location\n- try another location'
      },
      confirm: 'Continue anyway',
      cancel: 'Try another location'
    },
    clinicLocation: {
      title: 'Choose a clinic for %s’s appointment',
      hint: 'The following clinics are ordered by distance from %s'
    },
    clinicDate: {
      title: 'Choose a clinic date for %s’s appointment',
      date: {
        label: 'Clinic date'
      },
      clinicSummary: {
        location: {
          label: 'Location'
        }
      },
      hint: {
        morning: 'Morning available',
        afternoon: 'Afternoon available',
        both: 'Morning and afternoon available'
      }
    },
    timeRange: {
      title: 'Choose a time range for %s’s appointment',
      clinicSummary: {
        location: {
          label: 'Location'
        },
        date: {
          label: 'Date'
        }
      },
      ranges: {
        label: 'Available time ranges'
      },
      range: {
        appointmentsAvailable:
          '{count, plural, =0 {No appointments available} one {1 appointment available} other {{count} appointments available}}'
      }
    },
    time: {
      title: 'Choose an appointment time for %s',
      clinicSummary: {
        title: 'Clinic'
      },
      times: {
        label: 'Available appointment times'
      },
      appointmentsAvailable:
        '{count, plural, =0 {No appointments available} one {1 appointment available} other {{count} appointments available}}'
    },
    abandon: {
      label: 'I cannot find a convenient appointment'
    },
    notConvenient: {
      title: 'We’re sorry you’ve not been able to find a convenient clinic',
      intro:
        'Tell us the reasons you were unable to find a convenient appointment so that we can improve the clinics we offer.',
      label: 'Reasons for not booking',
      hint: 'Select all that apply',
      otherDetails: 'Give details'
    },
    leastConvenient: {
      title: 'Which was the most important reason?'
    },
    convenientDistance: {
      title: 'How far, in miles, would you consider travelling to a clinic?',
      input: {
        suffix: 'miles'
      }
    },
    convenientDays: {
      title: 'Which days of the week are convenient for you?',
      hint: 'Select all that apply'
    },
    convenientTimes: {
      title: 'Which times of day are convenient for you?',
      hint: 'Select all that apply'
    },
    'check-feedback': {
      title: 'Check and send your feedback',
      summary: 'Your answers',
      remove: 'Remove',
      confirm: 'Send feedback'
    },
    removeLocation: {
      title: 'Are you sure you want to remove the preferred location?',
      intro:
        'Knowing your preferred location helps the vaccinations team plan clinics that are more convenient for you and others. The information will not be used for any other purpose.',
      confirm: 'Remove my preferred location',
      cancel: 'Return to my feedback'
    },
    thankYou: {
      title: 'Thank you for your feedback',
      advice:
        'You can continue to use the link in your invitation to check for suitable clinics at a later date.\n\nAlternatively, contact your local vaccinations team, who may be able to arrange an appointment at another clinic, by phoning {{ team.tel }} or emailing {{ team.email }}.'
    },
    'check-answers': {
      title: 'Check and confirm %s’s appointment details',
      summary: {
        child: 'Child details',
        appointment: 'Appointment details',
        contact: 'Contact details'
      },
      confirm: {
        parent: 'Confirm',
        team: 'Add this appointment'
      }
    },
    addAnother: {
      title:
        '{count, plural, one {Add or change an appointment} other {Add, change or delete appointments}}',
      summary: {
        title: 'Appointments',
        child: {
          label: 'Child'
        }
      },
      question: 'Do you want to add an appointment for another child?'
    },
    deleteAppointment: {
      title: 'Are you sure you want to delete %s’s appointment?',
      confirm: 'Yes, delete this appointment',
      cancel: 'No, return to the previous page'
    },
    contactSelection: {
      title: 'Who is the contact for this appointment?',
      hint: 'The contact you choose will get booking confirmation and reminder messages.',
      itemHint: {
        email: 'Email: %s',
        tel: 'Phone: %s'
      },
      new: 'Enter a new contact'
    },
    contact: {
      title: {
        parent: 'About you',
        team: {
          existing: 'Confirm the contact details for this appointment',
          new: 'Enter contact details for this appointment'
        }
      },
      fullName: {
        label: 'Full name'
      },
      canNotify: {
        label: 'Send notifications'
      },
      email: {
        label: 'Email address',
        hint: 'We will use this to send you confirmation messages'
      },
      tel: {
        label: 'Phone number',
        hint: 'Someone from the vaccinations team might call you if they have questions'
      },
      canSms: {
        label: 'Confirm if %s want appointment updates by text message'
      },
      hasCommunicationNeeds: {
        title: {
          parent: 'Do you have any communication or language needs?',
          team: 'Does the parent or guardian have any communication or language needs?'
        },
        hint: {
          parent:
            'For example, if you have any hearing or sight needs, or if English is not your first language.',
          team: 'For example, if they have any hearing or sight needs, or if English is not their first language.'
        },
        yes: 'Yes',
        no: 'No'
      },
      communicationNeeds: {
        label: 'Communication or language needs',
        title: 'Give details'
      },
      relationshipOther: {
        label: 'Relationship to the child'
      },
      hasParentalResponsibility: {
        label: 'Do you have parental responsibility?',
        delegatedLabel:
          'Do you have delegated authority to consent to immunisations?',
        hint: 'This means you have legal rights and duties relating to the child'
      }
    },
    appointmentLost: {
      title: 'Your appointment time is no longer available',
      instruction:
        'To continue with your booking, you must choose another appointment time.',
      confirm: 'Choose another appointment'
    },
    offerHealthQuestions: {
      title: 'We’ve got your vaccination booking request',
      bookingReference: 'Your booking reference number is: %s',
      beforeYouGo:
        'Before you finish using the service, we’d like to ask some questions about your child’s health.\n\nThese questions help us make sure it’s safe to vaccinate. You can answer these questions at the clinic, but responding now will save time on the day.',
      label: 'Answer the health questions?',
      yes: 'Yes, answer the health questions now',
      no: 'No, I’ll do it later'
    },
    healthAnswers: {
      label: 'Answers to health questions',
      yes: 'Yes',
      no: 'No',
      details: 'Give details'
    },
    confirmation: {
      title: 'Booking complete',
      subtitle: '<p>Your reference number:<br><strong>%s</strong></p>',
      makeANote:
        'Make a note of your booking reference number. You will need it if you change or cancel your appointment.',
      whatNext: {
        title: 'What happens next',
        description: 'You’ll get a booking confirmation email or text message.'
      }
    },
    success: 'Added {{fullName}} to the {{sessionName}}',
    show: {
      title: 'Manage your booking',
      introduction:
        'Check your appointment details and make changes where needed.',
      appointment: {
        title: 'Appointment %s',
        change: {
          label: 'Change appointment'
        },
        cancel: {
          label: 'Cancel appointment'
        }
      },
      contact: {
        title: 'Your details',
        change: {
          label: 'Change my details'
        }
      },
      referenceNumber: 'Your booking reference number is: %s'
    }
  },
  clinicVaccinationPeriod: {
    startAndEndTimes: {
      label: 'Start and end times'
    },
    vaccinators: {
      label: 'Vaccinators'
    }
  },
  consent: {
    label: 'Consent response',
    title: 'Review consent responses',
    count:
      '{count, plural, =0 {No unmatched consent responses} one {1 unmatched consent response} other {# unmatched consent responses}}',
    results:
      '{count, plural, =0 {No responses matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> response} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> responses}}',
    list: {
      label: 'Consent responses',
      title: 'Unmatched consent responses',
      description:
        'Review incoming consent responses that can’t be automatically matched'
    },
    show: {
      title: 'Consent response from %s'
    },
    match: {
      label: 'Match',
      title: 'Search for a child record to match with {{child.fullName}}',
      caption: 'Consent response from {{contact.formatted.fullName}}'
    },
    link: {
      title: 'Link consent response with child record?',
      caption: 'Consent response from {{contact.fullName}}',
      summary: 'Compare child details',
      confirm: 'Link response with record',
      success:
        'Consent response from {{consent.contact.fullName}} linked to [{{patient.fullName}}]({{patient.uri}})’s record'
    },
    add: {
      label: 'Create new record',
      title: 'Create a new child record from this consent response?',
      caption: 'Consent response from {{contact.fullName}}',
      confirm: 'Create a new record from response',
      success:
        '[{{patient.fullName}}]({{patient.uri}})’s record created from a consent response from {{consent.contact.fullName}}'
    },
    invalidate: {
      label: 'Archive',
      caption: 'Consent response from {{consent.fullName}}',
      title: 'Archive response',
      description:
        'The unmatched response will be hidden. This cannot be undone.',
      confirm: 'Archive response',
      success: 'Consent response from {{consent.fullName}} archived'
    },
    start: {
      title: {
        [SessionPresetName.Flu]:
          'Give or refuse consent for your child’s flu vaccination',
        [SessionPresetName.Doubles]:
          'Give or refuse consent for the MenACWY and Td/IPV vaccinations',
        [SessionPresetName.HPV]:
          'Give or refuse consent for the HPV vaccination',
        [SessionPresetName.MMR]:
          'Give or refuse consent for an MMR catch-up vaccination'
      },
      more: `Find out more about the {{programme.vaccineName.sentenceCase}}`,
      confirm: {
        title: 'Give or refuse consent',
        buttonText: 'Start now'
      },
      otherMethods: {
        title: 'Other ways to give consent',
        description:
          'The quickest way to give or refuse consent is online, using this service. This will take less than 5 minutes.\n\nIf you cannot use the service, you can respond over the phone using the number given in the consent request you got by email.'
      }
    },
    closed: {
      title: 'You can no longer submit a consent response',
      description:
        'The deadline for responding has passed.\n\n## You can still book a clinic appointment\n\nContact {{team.email}} to book a clinic appointment.'
    },
    'parental-responsibility': {
      title: 'You cannot give or refuse consent through this service',
      description:
        'To give or refuse consent for a child’s vaccination, you need to have parental responsibility or delegated authority to consent to immunisations.\n\nIf you have any questions, please contact the local health organisation by calling {{team.tel}}, or email {{team.email}}.'
    },
    new: {
      'check-answers': {
        confirm: 'Confirm',
        title: 'Check and confirm'
      }
    },
    createdAt: {
      label: 'Response date'
    },
    child: {
      title: 'What is your child’s name?',
      label: 'Child',
      summary: 'About your child',
      description:
        'Give the name on your child’s birth certificate. If it’s changed, give the name held by your child’s GP.',
      firstName: {
        label: 'First name',
        hint: 'Or given name'
      },
      lastName: {
        label: 'Last name',
        hint: 'Or family name'
      },
      hasPreferredName: {
        label: 'Do they use a different name in school?',
        yes: 'Yes',
        no: 'No'
      },
      preferredFirstName: {
        label: 'Preferred first name'
      },
      preferredLastName: {
        label: 'Preferred last name'
      },
      fullAndPreferredNames: {
        label: 'Child’s name'
      },
      gpSurgery: {
        label: 'Name of GP surgery'
      },
      dob: {
        title: 'What is your child’s date of birth?',
        label: 'Child’s date of birth',
        hint: 'For example, 27 3 2012'
      },
      ethnicGroup: {
        label: 'Ethnic group',
        title: 'What is your child’s ethnic group?'
      },
      ethnicBackground: {
        label: 'Ethnic group',
        title:
          'Which of the following best describes your child’s %s background?',
        other: 'Any other %s background',
        preferNotToSay: 'Prefer not to say'
      },
      ethnicBackgroundOther: {
        label: 'How would you describe your child’s background? (optional)'
      },
      adjustments: {
        label: 'Reasonable adjustments',
        title:
          'Will your child need any of the following adjustments during their vaccination?',
        assistanceAnimal: {
          label: 'Their assistance animal, for example a guide dog'
        },
        distraction: {
          label: 'A distraction while having the vaccination'
        },
        extendedAppointment: {
          label: 'An extended appointment'
        },
        firstAppointment: {
          label: 'The first appointment'
        },
        lastAppointment: {
          label: 'The last appointment'
        },
        privacy: {
          label: 'A private space',
          hint: 'Most vaccinations are held in large, open spaces'
        },
        homeVisit: {
          label: 'A home visit'
        },
        other: {
          label: 'Other'
        }
      },
      adjustmentsOther: {
        label: 'Other reasonable adjustment',
        title: 'Give details'
      },
      impairments: {
        label: 'Impairments',
        title: 'Does your child have any of the following impairments?',
        vision: {
          hint: 'For example, blindness or partial sight'
        },
        hearing: {
          hint: 'For example, deafness or partial hearing'
        },
        mobility: {
          hint: 'For example, difficulty walking or climbing stairs'
        },
        memory: {
          hint: 'For example, difficulty remembering or understanding information'
        },
        mentalHealth: {
          hint: 'For example, anxiety'
        },
        communicative: {
          hint: 'For example, related to autism or ADHD (attention deficit hyperactivity disorder)'
        }
      },
      impairmentsOther: {
        label: 'Other impairment',
        title: 'Give details'
      },
      'confirm-school': {
        title: 'Confirm your child’s school',
        label: 'Is this their school?',
        yes: 'Yes, they go to this school',
        no: 'No, they go to a different school'
      },
      'home-educated': {
        title: 'Is your child home-educated?',
        yes: 'Yes',
        no: 'No, they go to a school'
      },
      school: {
        title: 'What school does your child go to?',
        label: 'Select a school',
        description:
          'You can only use this service if your child’s school is listed here. If it’s not, contact {{team.email}}. If you’ve moved recently, it’s important to mention this.'
      },
      address: {
        title: 'Home address',
        label: 'Child’s home address',
        hint: 'Give the child’s primary address. We use this to confirm their identity.'
      }
    },
    hasEthnicityAnswers: {
      label: 'Do you want to answer the ethnicity questions?',
      hint: 'These questions are optional. Your answers will not affect your consent response.',
      title: 'We have received your consent response',
      description:
        'Before you finish using the service, we’d like to ask some questions about your child’s ethnicity.\n\nWe ask about ethnicity so that when we look at the number of vaccinations received, we can better understand the challenges faced by specific groups. We can then target the support we offer.',
      yes: {
        label: 'Yes, answer the ethnicity questions (takes less than a minute)'
      },
      no: {
        label: 'No, skip the ethnicity questions'
      }
    },
    contact: {
      summary: 'About you',
      title: 'About you',
      label: 'Parent',
      fullName: {
        label: 'Full name'
      },
      relationship: {
        label: 'Relationship to child'
      },
      canNotify: {
        label: 'Send notifications'
      },
      email: {
        label: 'Email address',
        hint: 'We will use this to send you confirmation messages'
      },
      tel: {
        label: 'Phone number',
        hint: 'Someone from the vaccinations team might call you if they have questions'
      },
      canSms: {
        label: "Tick this box if you'd like to get updates by text message"
      },
      hasCommunicationNeeds: {
        title: 'Do you have any communication or language needs?',
        hint: 'For example, if you have any hearing or sight needs, or if English is not your first language.',
        yes: 'Yes',
        no: 'No'
      },
      communicationNeeds: {
        label: 'Communication or language needs',
        title: 'Give details'
      },
      relationshipOther: {
        label: 'Relationship to the child'
      },
      hasParentalResponsibility: {
        label: 'Do you have parental responsibility?',
        delegatedLabel:
          'Do you have delegated authority to consent to immunisations?',
        hint: 'This means you have legal rights and duties relating to the child'
      }
    },
    programme: {
      label: 'Programme'
    },
    decision: {
      summary: 'Consent for the {{session.vaccinationNames.sentenceCase}}',
      title:
        'Do you agree to your child having the {{session.vaccinationNames.sentenceCase}} in school?',
      label: 'Decision',
      yes: {
        label: 'Yes, I agree'
      },
      both: {
        label: 'Yes, I agree to them having both vaccinations'
      },
      one: {
        label: 'I agree to them having one of the vaccinations'
      },
      nasal: {
        label: 'Yes, I agree to them having the nasal spray vaccine',
        hint: 'This is the recommended option and gives the best protection against flu'
      },
      injection: {
        label: 'Yes, I agree to the alternative flu injection',
        hint: 'This is suitable for children who do not use gelatine products, or if they cannot have the nasal spray vaccine for medical reasons'
      },
      alreadyVaccinated: {
        label: 'My child has already had both doses of the MMR vaccine',
        hint: 'Children need 2 doses of the MMR vaccine to be fully protected'
      },
      no: {
        label: 'No',
        hint: 'If you do not agree to the vaccination, you’ll get a chance to tell us why'
      }
    },
    decisionStatus: {
      label: 'Response'
    },
    hasConsentForAlternativeVaccine: {
      flu: {
        label: 'Consent also given for injected vaccine?',
        title:
          'If your child cannot have the nasal spray, do you agree to them having the injected vaccine instead?',
        hint: 'We may decide the nasal spray vaccine is not suitable. In this case, we may offer the injected vaccine instead.',
        yes: {
          label: 'Yes'
        },
        no: {
          label: 'No'
        }
      },
      mmr: {
        label: 'Consent given for gelatine-free vaccine only?',
        title: 'Do you want your child to have a vaccine without gelatine?',
        hint: 'One type of MMR vaccine contains gelatine from pigs. An alternative MMR vaccine is available that does not contain gelatine.',
        yes: {
          label:
            'I want my child to have the vaccine that does not contain gelatine'
        },
        no: {
          label: 'My child can have either type of vaccine'
        }
      }
    },
    hasRequestedConsultation: {
      title:
        'Would you like a member of the team to contact you to discuss alternative options?',
      hint: {
        [ReplyRefusal.AlreadyVaccinated]: false,
        [ReplyRefusal.AlreadyVaccinatedMMR]: false,
        [ReplyRefusal.Gelatine]:
          'For example, it may be possible to use a vaccine that does not contain gelatine.',
        [ReplyRefusal.GelatineMMR]:
          'For example, it may be possible to use a vaccine that does not contain gelatine.',
        [ReplyRefusal.GettingElsewhere]: false,
        [ReplyRefusal.Medical]:
          'We understand alternatives might not be suitable in some cases.',
        [ReplyRefusal.Other]: false,
        [ReplyRefusal.OutsideSchool]:
          'For example, it may be possible to vaccinate your child in a community clinic.',
        [ReplyRefusal.Personal]: false
      },
      label: 'Discuss options',
      yes: 'Yes, I would like someone to contact me',
      no: 'No'
    },
    refusalReason: {
      title:
        'Please tell us why you do not agree to your child having the {{session.vaccinationNames.sentenceCase}} in school',
      label: 'Refusal reason',
      alreadyVaccinated: {
        one: ReplyRefusal.AlreadyVaccinated,
        other: ReplyRefusal.AlreadyVaccinated.replace('Vaccine', 'Vaccines')
      },
      alreadyVaccinatedMMR:
        'My child has already had both doses of the MMR vaccine',
      gettingElsewhere: {
        one: ReplyRefusal.GettingElsewhere,
        other: ReplyRefusal.GettingElsewhere.replace('Vaccine', 'Vaccines')
      }
    },
    refusalReasonDetails: {
      label: 'Refusal details',
      title: {
        [ReplyRefusal.AlreadyVaccinated]:
          'When and where did your child get their vaccination?',
        [ReplyRefusal.GettingElsewhere]:
          'When and where will your child get their vaccination?',
        [ReplyRefusal.Medical]:
          'What medical reasons prevent your child from being vaccinated?'
      }
    },
    firstDose: {
      label: 'Details of 1st MMR dose',
      title: 'When and where did your child get their 1st MMR dose?',
      description: 'The 1st dose is usually offered at 12 months',
      country: {
        title: 'Which country was the 1st dose of the MMR vaccine given in?',
        label: 'Country'
      },
      createdAt: {
        title: 'When was the 1st dose given?',
        label: 'Date of vaccination'
      },
      isScheduled: {
        title: 'Was the 1st dose given when your child was 12 months old?',
        hint: 'This is usually the child’s age when the 1st dose is offered'
      }
    },
    secondDose: {
      label: 'Details of 2nd MMR dose',
      title: 'When and where did your child get their 2nd MMR dose?',
      description:
        'The 2nd dose is usually offered when children are 3 years and 4 months old',
      country: {
        title: 'Which country was the 2nd dose of the MMR vaccine given in?',
        label: 'Country'
      },
      createdAt: {
        title: 'When was the 2nd dose given?',
        label: 'Date of vaccination'
      },
      isScheduled: {
        title:
          'Was the 2nd dose given when your child was 3 years and 4 months old?',
        hint: 'This is usually the child’s age when the 2nd dose is offered'
      }
    },
    previousDose: {
      label: 'Details of %s vaccination',
      title: 'When and where did your child get their %s vaccination?',
      country: {
        label: 'Country',
        title: 'Which country was the vaccination given in?',
        england: 'England',
        scotland: 'Scotland',
        wales: 'Wales',
        ni: 'Northern Ireland',
        other: 'Another country outside the UK'
      },
      countryOther: {
        title: 'Which country was the vaccination given in?'
      },
      createdAt: {
        label: 'Date',
        title: 'When was the vaccination given?',
        hint: 'If you do not know the exact date of the vaccination, leave the day field empty and enter your best guess for the month'
      },
      isScheduled: {
        yes: 'Yes',
        no: 'No'
      }
    },
    healthAnswers: {
      label: 'Answers to health questions',
      yes: 'Yes',
      no: 'No',
      details: 'Give details'
    },
    note: {
      label: 'Notes'
    },
    summary: {
      label: 'Response'
    },
    confirmation: {
      title: {
        [ReplyDecision.AlreadyVaccinated]: 'Thank you',
        [ReplyDecision.Given]: 'Consent confirmed',
        [ReplyDecision.OnlyAlternativeInjection]:
          'Consent for the flu injection vaccination confirmed',
        [ReplyDecision.OnlyMenACWY]:
          'Consent for the MenACWY vaccination confirmed',
        [ReplyDecision.OnlyTdIPV]:
          'Consent for the Td/IPV vaccination confirmed',
        [ReplyDecision.Declined]: 'Follow up requested',
        [ReplyDecision.Refused]: 'Refusal confirmed'
      },
      text: {
        [ReplyDecision.AlreadyVaccinated]:
          'You’ve told us that {{consent.child.fullName}} has had both doses of the MMR vaccine.\n\nWe’ll update our records so you no longer get consent requests for MMR catch-up vaccinations.',
        [ReplyDecision.Given]:
          '{{consent.child.fullName}} is due to get the {{session.vaccinationNames.sentenceCase}} at school on {{session.formatted.nextDate}}',
        [ReplyDecision.OnlyAlternativeInjection]:
          '{{consent.child.fullName}} is due to get the flu injection at school on {{session.formatted.nextDate}}',
        [ReplyDecision.OnlyMenACWY]:
          '{{consent.child.fullName}} is due to get the MenACWY vaccination at school on {{session.formatted.nextDate}}',
        [ReplyDecision.OnlyTdIPV]:
          '{{consent.child.fullName}} is due to get the Td/IPV vaccination at school on {{session.formatted.nextDate}}',
        [ReplyDecision.Declined]:
          'A member of the team will contact you soon to discuss your options.',
        [ReplyDecision.Refused]:
          'You’ve told us that you do not want {{consent.child.fullName}} to get the {{session.vaccinationNames.sentenceCase}} at school'
      },
      triage: {
        // TODO: Contact may have given consent for two vaccinations for doubles
        // so text should say either ‘vaccination is’ or ‘vaccinations are’
        [ReplyDecision.Given]:
          'As you answered ‘yes’ to one or more of the health questions, we need to check the {{session.vaccinationNames.sentenceCase}} is suitable for {{consent.child.fullName}}. We’ll review your answers and get in touch again soon.',
        [ReplyDecision.OnlyAlternativeInjection]:
          'As you answered ‘yes’ to one or more of the health questions, we need to check the {{session.vaccinationNames.sentenceCase}} is suitable for {{consent.child.fullName}}. We’ll review your answers and get in touch again soon.',
        [ReplyDecision.OnlyMenACWY]:
          'As you answered ‘yes’ to one or more of the health questions, we need to check the MenACWY vaccination is suitable for {{consent.child.fullName}}. We’ll review your answers and get in touch again soon.',
        [ReplyDecision.OnlyTdIPV]:
          'As you answered ‘yes’ to one or more of the health questions, we need to check the Td/IPV vaccination is suitable for {{consent.child.fullName}}. We’ll review your answers and get in touch again soon.'
      },
      description: 'We’ve sent a confirmation to <{{consent.contact.email}}>.'
    },
    actions: {
      label: 'Actions'
    }
  },
  download: {
    label: 'Downloads',
    list: {
      label: 'Downloads',
      title: 'Downloads',
      results: 'All downloads',
      description: 'See the status of downloads you’ve requested'
    },
    search: {
      label: 'Find download'
    },
    results:
      '{count, plural, =0 {No downloads matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> download} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> downloads}}',
    new: {
      label: 'Download data',
      message:
        'It may take some time to prepare the records. You’ll be able to download them soon.'
    },
    create: {
      title: 'Download %s',
      confirm: 'Download %s',
      description: {
        [DownloadType.Cohort]: `Download vaccination data for the ${thisAcademicYear} academic year so far.\n\nThis data was last updated on %s.`,
        [DownloadType.Moves]:
          'Download a record of school moves as a CSV file. Only school moves that have been reviewed and confirmed will be included.',
        [DownloadType.Report]:
          'Full vaccination details for individual children. Only includes vaccinations given by your team.',
        [DownloadType.Session]:
          'Download a record of all children in this session as an XLSX file.\n\nYou can include extra columns to record vaccinations offline. You can then upload a completed spreadsheet as Vaccination records in the Uploads area.'
      }
    },
    createdAt: {
      label: 'Requested at'
    },
    createdBy: {
      label: 'Requested by'
    },
    startAt: {
      label: 'From',
      title: 'Get data from',
      hint: 'For example, 27 3 2017'
    },
    endAt: {
      label: 'Until',
      title: 'Get data until',
      hint: 'For example, 27 3 2017'
    },
    startEndAt: {
      label: 'Date range'
    },
    format: {
      title: 'File format',
      label: 'File format'
    },
    academicYear: {
      label: 'Academic year',
      title: 'Academic year'
    },
    programmeType: {
      label: 'Programme',
      title: 'Which programme do you want data for?'
    },
    clinic: {
      label: 'Clinic'
    },
    school: {
      label: 'School'
    },
    status: {
      label: 'Status'
    },
    teams: {
      title: 'Select providers',
      label: 'Providers'
    },
    type: {
      title: 'What data do you want to download?',
      label: 'Type',
      hint: {
        [DownloadType.Cohort]:
          'Total figures for all children in your cohort. Includes vaccinations given by any provider.',
        [DownloadType.Moves]:
          'A record of school moves. Only includes school moves that have been reviewed and confirmed.',
        [DownloadType.Report]:
          'Full vaccination details for individual children. Only includes vaccinations given by your team.'
      }
    },
    canRecordOffline: {
      label: 'Record offline?',
      title: 'Do you want to use this spreadsheet for offline recording?',
      yes: {
        label: 'Yes'
      },
      no: {
        label: 'No'
      }
    },
    variables: {
      label: 'Variables',
      title: 'What variables do you want to use to break down the data?'
    }
  },
  emails: {
    consent: {
      invite: {
        label: 'Invitation',
        name: '{{session.vaccinationInviteNames}} on {{session.formatted.nextDate}}'
      },
      'invite-catch-up': {
        label: 'Invitation (catch-up)',
        name: '{{session.vaccinationNames.titleCase}} on {{session.formatted.nextDate}}'
      },
      'invite-reminder': {
        label: 'Reminder',
        name: 'Please respond to our request for consent by {{session.formatted.nextDate}}'
      },
      'invite-subsequent-reminder': {
        label: 'Subsequent reminder',
        name: 'There’s still time for your child to get their {{session.vaccinationNames.sentenceCase}}'
      },
      'invite-clinic': {
        label: 'Clinic booking',
        name: '{{child.firstName}} has still not had their {{session.vaccinationNames.sentenceCase}}'
      },
      'invite-clinic-reminder': {
        label: 'Clinic booking reminder',
        name: 'Your child can still get their {{session.vaccinationNames.sentenceCase}} at a clinic'
      },
      'invite-clinic-consent': {
        label: 'Clinic invitation',
        name: 'We still need consent for your child’s {{session.vaccinationNames.sentenceCase}}'
      },
      'consent-already-vaccinated': {
        label: 'Already vaccinated',
        name: 'You’ve told us that {{child.firstName}} is fully vaccinated against MMR'
      },
      'consent-given': {
        label: 'Consent given',
        name: '{{session.vaccinationNames.titleCase}} on {{session.formatted.nextDate}} for {{child.firstName}}'
      },
      'consent-given-changed-school': {
        label: 'Consent given (changed school)',
        name: 'Your child’s {{session.vaccinationNames.sentenceCase}}'
      },
      'consent-refused': {
        label: 'Consent refused',
        name: '{{session.vaccinationNames.titleCase}} on {{session.formatted.nextDate}} for {{child.firstName}}'
      },
      'consent-followed-up': {
        // Reuses same confirmation as that for consent refused (or given)
        label: 'Consent refusal confirmed',
        name: '{{session.vaccinationNames.titleCase}} on {{session.formatted.nextDate}} for {{child.firstName}}'
      },
      'consent-needs-triage': {
        label: 'Consent needs triage',
        name: '{{session.vaccinationNames.titleCase}} on {{session.formatted.nextDate}} for {{child.firstName}}'
      },
      'consent-unknown-contact': {
        label: 'Consent response from unknown contact',
        name: 'Different contact details in {{session.vaccinationNames.sentenceCase}} consent response'
      },
      'triage-vaccinate': {
        label: 'Vaccinate',
        name: 'Your child can have their {{session.vaccinationNames.sentenceCase}} on {{session.formatted.nextDate}}'
      },
      'triage-vaccinate-second-dose': {
        label: 'Vaccinate (second dose)',
        name: '{{child.firstName}} needs another dose of the MMR vaccination'
      },
      'triage-delay-vaccination': {
        label: 'Delay vaccination',
        name: 'We are delaying your child’s {{session.vaccinationNames.sentenceCase}}'
      },
      'triage-invite-to-clinic': {
        label: 'Invite to clinic',
        name: 'Please book a clinic appointment for your child’s vaccination'
      },
      'triage-do-not-vaccinate': {
        label: 'Do not vaccinate',
        name: 'Your child will not have the {{session.vaccinationNames.sentenceCase}} in school'
      },
      'vaccination-reminder': {
        label: 'Session reminder',
        name: '{{child.fullName}} may get their {{session.vaccinationNames.sentenceCase}} on {{session.formatted.nextDate}}'
      },
      'vaccination-already-had': {
        label: 'Vaccination already had',
        name: 'Cancelled {{session.vaccinationNames.sentenceCase}} appointment for {{child.firstName}}'
      },
      'vaccination-deleted': {
        label: 'Vaccination message sent in error',
        name: 'Our last email to you was inaccurate'
      },
      'vaccination-given': {
        label: 'Vaccinated',
        name: 'Your child had their {{session.vaccinationNames.sentenceCase}} today'
      },
      'vaccination-not-given-absent': {
        label: 'Could not vaccinate (child absent)',
        name: 'Your child did not have their {{session.vaccinationNames.sentenceCase}} today'
      },
      'vaccination-not-given-refused': {
        label: 'Could not vaccinate (child refused)',
        name: 'Your child did not have their {{session.vaccinationNames.sentenceCase}} today'
      },
      'vaccination-not-given-unwell': {
        label: 'Could not vaccinate (child unwell)',
        name: 'Your child did not have their {{session.vaccinationNames.sentenceCase}} today'
      },
      'vaccination-not-given-contraindicated-delay-vaccination': {
        label: 'Could not vaccinate (delay vaccination)',
        name: 'Your child did not have their {{session.vaccinationNames.sentenceCase}} today'
      },
      'vaccination-not-given-contraindicated-invite-to-clinic': {
        label: 'Could not vaccinate (invite-to-clinic)',
        name: 'Your child did not have their {{session.vaccinationNames.sentenceCase}} today'
      },
      'vaccination-not-given-contraindicated-do-not-vaccinate': {
        label: 'Could not vaccinate (do not vaccinate)',
        name: 'Your child did not have their {{session.vaccinationNames.sentenceCase}} today'
      },
      'information-child': {
        label: 'Information for students',
        name: 'You can get an {{session.vaccinationNames.sentenceCase}} on {{session.formatted.nextDate}}'
      }
    }
  },
  event: {
    createdAt: {
      label: 'Date'
    },
    note: {
      label: 'Note',
      hint: 'Notes are visible to all users, and cannot be edited or deleted'
    },
    status: {
      label: 'Outcome'
    }
  },
  healthAnswers: {
    label: 'Answers to health questions',
    count:
      'Answers to health questions{count, plural, =0 {} one {, including 1 Yes response} other {, including # Yes responses}}'
  },
  healthQuestions,
  home: {
    show: {
      title: 'Home'
    }
  },
  interchange: {
    label: 'Manage data',
    list: {
      label: 'Manage data',
      title: 'Manage data',
      description:
        'Upload records to Mavis and keep track of requested downloads'
    }
  },
  notice: {
    label: 'Important notice',
    list: {
      label: 'Important notices',
      title: 'Important notices'
    },
    archive: {
      success: 'Notice archived'
    },
    count: '{count, plural, =0 {No notices} one {1 notice} other {# notices}}',
    warning:
      '{count, plural, =0 {No important notices need} one {1 important notice needs} other {# important notices need}} attention',
    createdAt: {
      label: 'Date'
    },
    action: {
      title: 'Are you sure you want to %s the notice on this patient?',
      description: 'This cannot be undone.',
      confirm: 'Yes, %s this notice',
      cancel: 'No, return to notices'
    }
  },
  contact: {
    label: 'Parent or guardian',
    new: {
      label: 'Add a new contact',
      title: 'Add a new contact',
      confirm: 'Add contact',
      success: 'Contact added'
    },
    edit: {
      title: 'Edit contact',
      confirm: 'Save changes',
      success: 'Contact updated'
    },
    delete: {
      success: 'Contact deleted'
    },
    action: {
      title: 'Are you sure you want to {{type}} {{contact.fullName}}?',
      description:
        'Deleting this contact will remove them from {{patient.firstName}}, but not from any other children.\n\nThis cannot be undone.',
      confirm: 'Yes, %s this contact',
      cancel: 'No, return to contacts'
    },
    fullName: {
      label: 'Name'
    },
    canSms: {
      label: 'Get updates by text message',
      true: 'Yes',
      false: 'No'
    },
    relationship: {
      label: 'Relationship'
    },
    hasParentalResponsibility: {
      label: 'Has parental responsibility?',
      delegatedLabel: 'Has delegated authority to consent to immunisations?',
      hint: 'They have legal rights and duties relating to the child'
    },
    email: {
      label: 'Email address'
    },
    tel: {
      label: 'Phone number'
    },
    hasCommunicationNeeds: {
      title: 'Do they have any communication or language needs?',
      yes: 'Yes',
      no: 'No'
    },
    communicationNeeds: {
      label: 'Communication or language needs',
      title: 'Give details'
    },
    relationshipOther: {
      label: 'Give details'
    },
    canNotify: {
      title:
        'Does the child want their parent or guardian to get confirmation of the vaccination?',
      label: 'Notify parent'
    }
  },
  patient: {
    label: 'Child record',
    list: {
      label: 'Children',
      title: 'Children',
      description: 'Find children and view their vaccination history'
    },
    show: {
      title: 'Child record'
    },
    edit: {
      label: 'Edit record',
      title: 'Edit child record',
      summary: 'Child’s details',
      success: 'Child record updated'
    },
    archive: {
      label: 'Archive record',
      title: 'Why do you want to archive this record?',
      cancel: 'Return to child record',
      confirm: 'Archive record',
      success: 'This record has been archived',
      duplicate: {
        label: 'Enter the NHS number for the duplicate record',
        hint: 'This will merge the duplicate records into a single record'
      }
    },
    inviteToClinic: {
      title: {
        multiple:
          'Which programmes do you want to send a clinic booking invitation for?',
        single: {
          clinicsScheduled:
            'Send a clinic booking invitation for {{firstName}} {{lastName}}',
          noClinicsScheduled:
            'Are you sure you want to send a clinic booking invitation for {{firstName}} {{lastName}}?'
        }
      },
      clinicCount: {
        hint: '{count, plural, =0 {No clinics are scheduled for {programmeName}} one {1 clinic is scheduled for {programmeName}} other {# clinics are scheduled for {programmeName}}}',
        someParagraph:
          '{count, plural, one {There is 1 clinic scheduled for the {programmeName} programme.} other {There are # clinics scheduled for the {programmeName} programme.}}',
        noneParagraph:
          'No clinics are scheduled for the {{programmeName}} programme. Only send an invitation if you can offer {{programmeName}} alongside other vaccinations.'
      },
      scheduledClinicWarning: {
        title: 'Programmes without clinics',
        description:
          '{count, plural, one {No clinics are scheduled for the <b>{programmeNames}</b> programme. Only select this option if you can offer it alongside other vaccinations.} other {No clinics are scheduled for the <b>{programmeNames}</b> programmes. Only select these options if you can offer them alongside other vaccinations.}}'
      },
      confirm: 'Send clinic invitation',
      cancel: 'Go back to child record',
      success:
        '{{patientName}} has been invited to attend a clinic for {{selectedProgrammes}} vaccination'
    },
    bulkInviteToClinic: {
      title: 'Invite parents to book a clinic appointment',
      caption:
        '{count, plural, one {1 child selected} other {{count} children selected}}',
      childrenFragment:
        '{count, plural, =0 {No children} one {1 child} other {{count} children}}',
      programmesFragment:
        '{count, plural, one {the {programmeNames} programme} other {the {programmeNames} programmes}}',
      anyProgrammesFragment: 'at least one programme',
      cohortSummary:
        '{{children}} can be invited to clinic for {{programmes}}.',
      programme: {
        label: 'Which programmes do you want to send invitations for?',
        hint: {
          children:
            '{count, plural, one {1 child can be invited for {programmeName}} other {{count} children can be invited for {programmeName}}}',
          clinics:
            '{count, plural, =0 {No clinics are scheduled for {programmeName}} one {1 clinic is scheduled for {programmeName}} other {{count} clinics are scheduled for {programmeName}}}',
          combined: '{{childrenHint}}<br>{{clinicsHint}}'
        }
      },
      clinicCount: {
        hint: '{count, plural, =0 {No clinics are scheduled for {programmeName}} one {1 clinic is scheduled for {programmeName}} other {# clinics are scheduled for {programmeName}}}',
        someParagraph:
          '{count, plural, one {There is 1 clinic scheduled for the {programmeName} programme.} other {There are # clinics scheduled for the {programmeName} programme.}}',
        noneParagraph:
          'No clinics are scheduled for the {{programmeName}} programme. Only send an invitation if you can offer {{programmeName}} alongside other vaccinations.'
      },
      scheduledClinicWarning: {
        title: 'Programmes without clinics',
        description:
          '{count, plural, one {No clinics are scheduled for the <b>{programmeNames}</b> programme. Only select this option if you can offer it alongside other vaccinations.} other {No clinics are scheduled for the <b>{programmeNames}</b> programmes. Only select these options if you can offer them alongside other vaccinations.}}'
      },
      confirm: 'Send clinic invitations',
      cancel: 'Go back to children list',
      success: {
        invited:
          '{count, plural, one {1 child invited to clinic} other {{count} children invited to clinic}}',
        notInvited:
          '{count, plural, one {1 child could not be invited because of missing contact details} other {{count} children could not be invited because of missing contact details}}'
      }
    },
    auditEvents: {
      label: 'Activity log'
    },
    pds: {
      title: 'NHS number lookup history',
      description:
        'The following timeline shows how this child’s NHS number was found by searching the NHS Patient Demographics Service (PDS)',
      details:
        'A fuzzy search finds text that matches a term closely as well as exactly. For example, a fuzzy search can identify Jon Smith even if the term entered was John Smith.\n\nA wildcard searches for unknown parts of text. For example, if you only have part of a postcode: CV1, you can use a wildcard to search all records with a postcode that includes CV1.\n\nHistory refers to the child’s history, for example if they have changed their name or address.'
    },
    lastReminderDate: {
      label: 'Last reminder sent'
    },
    count: '{count, plural, =0 {No children} one {1 child} other {# children}}',
    results: {
      summary:
        '{count, plural, =0 {No children matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> record} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> children}}',
      inviteToClinic: {
        title:
          '{count, plural, one {Invite this child to a clinic?} other {Invite these children to a clinic?}}',
        hint: 'You’ll be able to check for scheduled clinic sessions before sending the invites.',
        link: '{count, plural, one {Invite 1 child to a clinic} other {Invite {count} children to a clinic}}'
      }
    },
    search: {
      label: 'Find children',
      dob: 'Child’s date of birth',
      showOnly: 'Show only',
      hasAdjustment: 'Children needing reasonable adjustments',
      hasImpairment: 'Children with impairments',
      hasMissingNhsNumber: 'Children missing an NHS&nbsp;number',
      isArchived: 'Archived records'
    },
    archiveReason: {
      label: 'Reason archived'
    },
    archiveReasonOther: {
      label: 'Give details'
    },
    isArchived: {
      label: 'Archived'
    },
    notes: {
      label: 'Notes',
      new: {
        title: 'Add a note to this record',
        confirm: 'Save note',
        success: 'Note added'
      }
    },
    nhsn: {
      label: 'NHS number',
      title: 'What is the child’s NHS number?'
    },
    hasAgedOutOfProgrammes: {
      label: 'Aged out of programmes?',
      status:
        '{{patient.fullName}} is no longer eligible for school age immunisations'
    },
    hasMissingNhsNumber: {
      label: 'Missing NHS number'
    },
    fullNameAndNhsn: {
      label: 'Name and NHS number'
    },
    fullName: {
      label: 'Full name',
      title: 'What is the child’s name?'
    },
    preferredName: {
      label: 'Preferred name'
    },
    firstName: {
      label: 'First name'
    },
    lastName: {
      label: 'Last name'
    },
    preferredNames: {
      label: 'Known as'
    },
    dob: {
      label: 'Date of birth',
      title: 'What is the child’s date of birth?',
      hint: 'For example, 27 3 2017'
    },
    dobWithAge: {
      label: 'Date of birth'
    },
    dod: {
      label: 'Date of death'
    },
    gender: {
      label: 'Gender',
      title: 'What is the child’s gender?'
    },
    adjustments: {
      label: 'Reasonable adjustments'
    },
    impairments: {
      label: 'Impairments'
    },
    address: {
      label: 'Address',
      title: 'What is the child’s home address?'
    },
    postalCode: {
      label: 'Postcode'
    },
    gpSurgery: {
      label: 'GP surgery',
      title: 'Who is the child’s GP?'
    },
    school: {
      label: 'School',
      title: 'What school does the child go to?'
    },
    schoolName: {
      label: 'School'
    },
    yearGroup: {
      label: 'Year group',
      title: 'What year group is the child in?'
    },
    registrationGroup: {
      label: 'Registration group',
      title: 'What registration group is the child in?'
    },
    academicYearGroup: {
      label: 'Year group'
    },
    yearGroupWithRegistration: {
      label: 'Year group'
    },
    contacts: {
      label: 'Contacts',
      title: 'Contacts'
    },
    vaccinations: {
      label: 'Vaccinations'
    },
    contact: {
      label: 'Parent or guardian',
      fullName: {
        label: 'Name'
      },
      canNotify: {
        label: 'Send notifications'
      },
      email: {
        label: 'Email address'
      },
      tel: {
        label: 'Phone number'
      },
      relationship: {
        label: 'Relationship to child'
      },
      relationshipOther: {
        label: 'Relationship to the child'
      },
      hasCommunicationNeeds: {
        title: 'Do they have any communication or language needs?',
        yes: 'Yes',
        no: 'No'
      },
      communicationNeeds: {
        label: 'Communication or language needs',
        title: 'Give details'
      }
    },
    programmes: {
      label: 'Vaccination programmes'
    },
    clinicProgramme_ids: {
      label: 'Clinic invitations'
    },
    status: {
      label: 'Status'
    },
    upcomingAppointments: {
      label: 'Clinic appointments'
    },
    upcomingSchoolSessions: {
      label: 'School sessions'
    }
  },
  patientProgramme: {
    label: 'Vaccination programme',
    addToSession: {
      success:
        '{{patient.fullName}}’s added to today’s clinic at {{session.location.name}}'
    },
    name: {
      label: 'Programme'
    },
    auditEvents: {
      label: 'Programme activity'
    },
    patientSessions: {
      label: 'Sessions'
    },
    vaccinationsGiven: {
      count:
        '{count, plural, =0 {No vaccination record} one {Vaccination record} other {# vaccination records}}'
    },
    consent: {
      label: 'Consent status'
    },
    status: {
      label: 'Status'
    },
    statusNotes: {
      label: 'Notes'
    },
    otherSeasons: {
      label: 'Other vaccinations for %s'
    },
    tetanus: {
      label: 'Previous vaccinations for tetanus, diptheria and polio'
    },
    activeClinics: {
      label: 'Add to current clinic session',
      title:
        '{count, plural, =0 {There are no {programme} clinics running today} one {Are you sure you want to add this child to the following {programme} clinic?} other {Which {programme} clinic do you want to add the child to?}}',
      hint: '{{count}} clinics are available today'
    },
    newClinicSession: {
      label: 'Create a new clinic session',
      description:
        'You can create a new clinic session and then add children to it.'
    },
    inviteToClinic: {
      label: 'Invite to upcoming clinic session'
    }
  },
  patientSession: {
    show: {
      title: 'Child record',
      childRecordLink: {
        label: 'View full child record'
      }
    },
    appointment: {
      title: 'Appointment'
    },
    events: {
      title: 'Activity and notes'
    },
    notes: {
      label: 'Notes',
      new: {
        title: 'Add a note',
        confirm: 'Save note',
        success: 'Note added'
      }
    },
    sessionNotes: {
      label: 'Session notes'
    },
    sessionNote: {
      label: 'Session note',
      hint: 'The most recent session note is shown at the top of session pages and in search results'
    },
    patientProgramme: {
      label: 'View child’s %s record'
    },
    consent: {
      label: 'Consent status',
      title: 'Consent for %s vaccination'
    },
    screen: {
      label: 'Triage status',
      title: 'Triage for %s vaccination'
    },
    instructionStatus: {
      label: 'PSD status',
      title: 'Patient specific direction (PSD)'
    },
    register: {
      label: 'Registration status',
      title: 'Register attendance'
    },
    outcome: {
      label: 'Session outcome'
    },
    status: {
      label: 'Programme status'
    },
    information: {
      label: 'Notes'
    },
    session: {
      label: 'Session'
    },
    clinicAppointment: {
      title: 'Appointment details',
      label: 'Appointment time',
      edit: {
        label: 'Edit appointment'
      },
      cancel: {
        label: 'Cancel appointment',
        rebooking: {
          title: 'Do you want to offer rebooking?',
          hint: '{count, plural, =0 {No appointments are available at other clinics targeting the same programmes.} one {1 appointment is available at another clinic targeting the same programmes.} other {{count} appointments are available at other clinics targeting the same programmes.}}',
          yes: 'Yes, include a link to rebook in the cancellation message',
          no: 'No, tell the parent they’ll be invited again later'
        },
        confirm: {
          title: 'Are you sure you want to cancel this appointment?',
          details: 'Summary',
          confirm: 'Yes, cancel this appointment',
          cancel: 'No, return to the child in session page',
          success:
            'Clinic appointment cancelled for {{ patientName }} at {{ clinicName }}'
        }
      }
    },
    walkIn: {
      title: 'Walk-in details'
    },
    yearGroup: {
      label: 'Year group'
    },
    vaccineCriteria: {
      label: 'Vaccine type'
    },
    vaccinationOutcomes: {
      label: 'Vaccination outcomes'
    },
    outstandingVaccinations: {
      label:
        '{count, plural, one{Outstanding vaccination} other{Outstanding vaccinations}}',
      message:
        '{count, plural, one{You still need to record an outcome for {names}} other{You still need to record outcomes for {names}}}'
    },
    gillick: {
      label: 'Gillick assessment',
      title: 'Gillick assessment',
      text: 'Before you make your assessment, you should give {{patient.firstName}} a chance to ask questions.',
      new: {
        title: 'Assess Gillick competence',
        confirm: 'Complete your assessment',
        success: 'Gillick assessment added'
      },
      edit: {
        title: 'Update Gillick assessment',
        confirm: 'Update your assessment',
        success: 'Gillick assessment updated'
      },
      q1: {
        label: 'The child knows which vaccination they will have'
      },
      q2: {
        label: 'The child knows which disease the vaccination protects against'
      },
      q3: {
        label: 'The child knows what could happen if they got the disease'
      },
      q4: {
        label: 'The child knows how the injection will be given'
      },
      q5: {
        label: 'The child knows which side effects they might experience'
      },
      note: {
        label: 'Assessment notes'
      }
    },
    invite: {
      label: 'Send consent request',
      success: 'Consent request sent to {{contact.fullNameAndRelationship}}'
    },
    consentRequests: {
      label: 'Consent requests'
    },
    replies: {
      label: 'Consent responses'
    },
    record: {
      title: 'Record a new {{programme.nameSentenceCase}} vaccination',
      titleWithMethod:
        'Record a new {{programme.nameSentenceCase}} vaccination with {{method}}'
    },
    recordPrevious: {
      title: 'Record a previous {{programme.nameSentenceCase}} vaccination'
    },
    registration: {
      label: 'Is {{patient.fullName}} attending today’s session?',
      title: 'Update attendance',
      present: 'Yes, they are attending today’s session',
      absent: 'No, they are absent from today’s session',
      pending: 'They have not been registered yet',
      confirm: 'Update attendance',
      actions: {
        label: 'Attending?',
        present: {
          label: 'Attending',
          title: 'Register {{patient.fullName}} as attending'
        },
        absent: {
          label: 'Absent',
          title: 'Register {{patient.fullName}} as absent'
        }
      },
      success: {
        [RegistrationStatus.Present]:
          '{{patientSession.patient.fullName}} is attending today’s session.',
        [RegistrationStatus.Absent]:
          '{{patientSession.patient.fullName}} has been recorded as absent from today’s session.',
        [RegistrationStatus.Pending]:
          '{{patientSession.patient.fullName}} has not been registered yet.'
      }
    },
    catchUps: {
      title: 'Additional vaccinations that can be offered',
      none: 'There are no additional vaccinations that can be offered to %s.'
    },
    clinicAttendanceType: {
      label: 'Attendance type'
    },
    additionalProgrammes: {
      label: 'Can also offer'
    }
  },
  pdsRecord: {
    label: 'Child record',
    new: {
      success:
        '{{patient.fullName}} has been added to your list of children in Mavis'
    },
    start: {
      label: 'Add a new child',
      title: 'Do you have the child’s NHS number?'
    },
    search: {
      title: 'Search for a child'
    },
    results:
      '{count, plural, =0 {No children matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> record} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> children}}',
    result: {
      title: 'Check and confirm %s’s details'
    },
    school: {
      title: 'Do you know which school %s goes to?',
      yes: {
        label: 'Yes'
      },
      unknown: {
        label: 'No'
      },
      'home-educated': {
        label: 'They are home-educated'
      }
    },
    school_id: {
      label: 'School URN',
      title: 'Select a school'
    },
    nhsn: {
      label: 'NHS number',
      title: 'Enter the child’s NHS number',
      hint: 'For example, 485 777 3456'
    },
    fullName: {
      label: 'Full name'
    },
    firstName: {
      label: 'First name'
    },
    lastName: {
      label: 'Last name'
    },
    dob: {
      label: 'Date of birth',
      hint: 'For example, 27 3 2012'
    },
    dobWithAge: {
      label: 'Date of birth'
    },
    dod: {
      label: 'Date of death'
    },
    gender: {
      label: 'Gender'
    },
    adjustments: {
      label: 'Reasonable adjustments'
    },
    impairments: {
      label: 'Impairments'
    },
    address: {
      label: 'Address',
      title: 'What is the child’s home address?'
    },
    postalCode: {
      label: 'Postcode'
    },
    gpSurgery: {
      label: 'GP surgery',
      title: 'Who is the child’s GP?'
    },
    contacts: {
      label: 'Parents or guardians'
    },
    add: {
      label: 'Do you want to add this child?',
      yes: {
        label: 'Yes'
      },
      no: {
        label: 'No – search for another child'
      }
    }
  },
  preScreen: {
    label: 'Pre-screening checks',
    description: '{{ prefix }} checked that {{patient.firstName}}:',
    hasSelfIdentified: {
      label: 'Has {{patient.firstName}} confirmed their identity?',
      true: 'Yes',
      false: 'No, it was confirmed by somebody else'
    },
    identifiedBy: {
      label: 'Identified by',
      name: {
        label: 'Name',
        title: 'What is the person’s name?'
      },
      relationship: {
        label: 'Relationship to child',
        title: 'What is their relationship to the child?',
        hint: 'For example, parent, teacher or teaching assistant'
      }
    },
    assessedBy: {
      label: 'Assessed by',
      title: 'Which nurse identified and pre-screened the child'
    },
    administeredBy: {
      label: 'Vaccinated by',
      title: 'Who will vaccinate the child?'
    },
    check: {
      error:
        'Select if the child has confirmed all pre-screening statements are true',
      label: 'I have checked that the above statements are true'
    },
    ready: {
      error:
        'Select if the child is ready for their {{programme.nameSentenceCase}} {{method}}',
      label:
        'Is {{patient.firstName}} ready for their {{programme.nameSentenceCase}} {{method}}?',
      hint: 'Pre-screening checks must be completed for vaccination to go ahead',
      yes: 'Yes',
      no: 'No',
      alternative: 'No – but they can have the injected flu vaccine instead'
    },
    injectionSite: {
      error: 'Select an injection site',
      label: 'Where will the injection be given?'
    },
    confirm: 'Continue',
    note: {
      label: 'Pre-screening notes'
    }
  },
  programme: {
    label: 'Programme'
  },
  report: {
    label: 'Report',
    list: {
      label: 'Reports',
      title: 'Reports',
      description: 'View the progress of vaccination programmes',
      summary: `For the ${thisAcademicYear} academic year so far`,
      updated: 'This data was last updated on **%s at 10pm**.'
    },
    vaccinations: {
      label: 'Vaccinations',
      title: 'Vaccinations',
      total: 'Total vaccinations for this cohort',
      team: 'Monthly vaccinations by %s'
    },
    consent: {
      label: 'Consent',
      title: 'Consent'
    },
    schools: {
      label: 'Schools',
      title: 'Schools'
    },
    'local-authorities': {
      label: 'Local authorities',
      title: 'Local authorities'
    },
    search: {
      label: 'Filter data'
    },
    patients: {
      label: 'Children'
    },
    programme: {
      label: 'Programme'
    },
    gender: {
      label: 'Gender'
    },
    name: {
      label: 'Programme'
    },
    type: {
      label: 'Programme type'
    },
    yearGroup: {
      label: 'Year group'
    }
  },
  remind: {
    new: {
      title: 'Re-send consent request'
    }
  },
  reply: {
    label: 'Response',
    show: {
      title: 'Consent response from %s'
    },
    new: {
      title: 'Record a new consent response',
      'check-answers': {
        title: 'Check and confirm'
      },
      success: 'Consent response from {{reply.fullName}} added'
    },
    edit: {
      success: 'Consent response from {{reply.fullName}} updated'
    },
    'follow-up': {
      label: 'Follow up',
      caption: 'Consent response from {{reply.fullName}}',
      title: 'Follow up refusal',
      decision: {
        label: 'Has their decision changed after follow-up?',
        consent: {
          label: 'Yes – they now consent to the vaccination'
        },
        refuse: {
          label: 'No – they still refuse the vaccination'
        }
      }
    },
    invalidate: {
      label: 'Mark as invalid',
      caption: 'Consent response from {{reply.fullName}}',
      title: 'Mark response as invalid',
      description: 'This cannot be undone.',
      confirm: 'Mark response as invalid',
      success: 'Consent response from {{reply.fullName}} marked as invalid'
    },
    withdraw: {
      label: 'Withdraw consent',
      caption: 'Consent response from {{reply.fullName}}',
      title: 'Withdraw consent',
      confirm: 'Withdraw consent',
      success: 'Consent response from {{reply.fullName}} withdrawn'
    },
    createdAt: {
      label: 'Date'
    },
    createdBy: {
      label: 'Recorded by'
    },
    respondent: {
      title: 'Who are you trying to get consent from?',
      label: 'Parent or guardian',
      new: 'Add a new parental contact'
    },
    child: {
      label: 'Child'
    },
    contact: {
      label: 'Parent',
      title: {
        new: 'Details for parent or guardian',
        edit: 'Details for {{contact.fullNameAndRelationship}}'
      },
      canNotify: {
        title:
          'Do you want to send {{contact.formatted.fullName}} an email and text message confirming their decision?',
        label: 'Notify parent'
      }
    },
    programme: {
      label: 'Programme',
      title: {
        Child: 'Which vaccination is the child giving consent for?',
        Contact: 'Which vaccination are they giving consent for?'
      }
    },
    method: {
      title: 'How was the response given?',
      label: 'Method'
    },
    decision: {
      label: 'Response',
      title: {
        Child:
          'Does the child agree to having the {{programme.vaccineName.sentenceCase}}?',
        Contact:
          'Do they agree to {{patient.firstName}} having the {{programme.vaccineName.sentenceCase}}?'
      },
      yes: {
        label: 'Yes'
      },
      nasal: {
        label: 'Yes, for the nasal spray'
      },
      injection: {
        label: 'Yes, for the injected vaccine only'
      },
      no: {
        label: 'No'
      },
      noResponse: {
        label: 'No response'
      }
    },
    decisionStatus: {
      label: 'Response'
    },
    vaccineCriteria: {
      label: 'Chosen vaccine'
    },
    email: {
      label: 'Email address'
    },
    tel: {
      label: 'Phone number'
    },
    hasConsentForAlternativeVaccine: {
      label: 'Consent also given for injected vaccine?',
      title:
        'Do they also agree to the injected vaccine if the nasal spray is not suitable?'
    },
    isInvalidated: {
      label: 'Invalid response'
    },
    healthAnswers: {
      label: 'Answers to health questions',
      title: 'Answers to health questions',
      yes: 'Yes',
      no: 'No',
      details: 'Give details'
    },
    refusalReason: {
      label: 'Reason for refusal',
      title: 'Why do they not agree?'
    },
    refusalReasonOther: {
      label: 'Give details'
    },
    refusalReasonDetails: {
      label: 'Refusal details',
      title: {
        [ReplyRefusal.GettingElsewhere]:
          'Where will the child get their vaccination?',
        [ReplyRefusal.Medical]:
          'What medical reasons prevent the child from being vaccinated?'
      }
    },
    alreadyVaccinated: {
      title: 'When and where did the child get their vaccination?'
    },
    note: {
      title: 'Notes',
      label: 'Notes'
    },
    outcome: {
      title: 'Update consent response'
    },
    hasConfirmedRefusal: {
      label: 'Confirm consent refusal?'
    }
  },
  review: {
    list: {
      label: 'Review',
      title: 'Review',
      description:
        'Review unmatched consent responses, school moves and important notices'
    }
  },
  school: {
    list: {
      label: 'Schools',
      title: 'Schools',
      description:
        'Browse schools and view their pupils and vaccination sessions'
    },
    show: {
      label: 'Children',
      title: 'Children',
      summary: 'School details',
      delete: 'Delete school'
    },
    action: {
      title: 'Are you sure you want to %s this school?',
      description: 'This cannot be undone.',
      confirm: 'Yes, %s this school',
      cancel: 'No, return to school'
    },
    new: {
      label: 'Add a new school',
      'check-answers': {
        confirm: 'Add school',
        title: 'Check and confirm'
      },
      summary: 'School details',
      success: '{{school.name}} has been added to your team'
    },
    'new-site': {
      label: 'Add a new school site'
    },
    edit: {
      label: 'Edit',
      title: 'Edit school',
      summary: 'School details',
      confirm: 'Save changes',
      success: '{{school.name}} updated'
    },
    delete: {
      label: 'Delete',
      success: 'School deleted'
    },
    'confirm-school': {
      title: 'Confirm school',
      label: 'Is this the correct school?',
      yes: 'Yes, I want to add this school',
      no: 'No, I want to add a different school'
    },
    download: {
      label: 'Download session spreadsheet'
    },
    inviteToClinic: {
      title: 'Invite parents to book a clinic appointment',
      label: 'Send clinic invitations',
      count:
        '{count, plural, =0 {No children} one {1 child} other {# children}} are due a vaccination for at least 1 programme.',
      description:
        'You can now send clinic booking invitations to their parents.',
      programme: 'Which programmes do you want to send invitations for?',
      flu: '{count, plural, =0 {No children have} one {1 child has} other {# children have}} not been invited to a clinic yet',
      hpv: '{count, plural, =0 {No children have} one {1 child has} other {# children have}} not been invited to a clinic yet',
      menacwy:
        '{count, plural, =0 {No children have} one {1 child has} other {# children have}} not been invited to a clinic yet',
      mmr: '{count, plural, =0 {No children have} one {1 child has} other {# children have}} not been invited to a clinic yet',
      'td-ipv':
        '{count, plural, =0 {No children have} one {1 child has} other {# children have}} not been invited to a clinic yet',
      confirm: 'Send clinic invitations',
      success:
        '{count, plural, =0 {No children} one {1 child} other {# children}} invited to the clinic'
    },
    patients: {
      label: 'Children',
      title: 'Children',
      count:
        '{count, plural, =0 {No children} one {1 child} other {# children}}'
    },
    sessions: {
      label: 'Sessions',
      title: 'Sessions',
      isActive: 'Session in progress',
      isPlanned: 'Scheduled sessions',
      isCompleted: 'Completed sessions'
    },
    unplannedProgrammes: {
      label: 'Missing sessions',
      hint: 'Show schools with no sessions scheduled for:'
    },
    results:
      '{count, plural, =0 {No schools matching your search criteria were found} one{Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> record} other{Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> schools}}',
    count:
      '{count, plural, =0 {no {phase} school} one {# no {phase} schools} other{# {phase} schools}}',
    search: {
      label: 'Find school',
      showOnly: 'Show only',
      isClosed: 'Closed schools'
    },
    name: {
      label: 'Name',
      title: 'School name'
    },
    phase: {
      label: 'Phase',
      title: 'Phase of education'
    },
    isSen: {
      label: 'SEN school',
      title: 'Is this a special educational needs (SEN) school?'
    },
    status: {
      label: 'Status'
    },
    yearGroups: {
      label: 'Year groups',
      title: 'Year groups'
    },
    programmes: {
      label: 'Programmes',
      title: 'Which programmes will you run at this school?'
    },
    id: {
      label: 'URN'
    },
    urn: {
      label: 'School URN',
      title: 'Find a school to add to your team',
      hint: 'If the school does not have a URN, contact the Mavis team',
      error:
        'URN must be for a school that is not already assigned to another team'
    },
    'site-urn': {
      title: 'Which school do you want to add a site to?',
      label: 'Select a school'
    },
    site: {
      title: 'Site details',
      label: 'Site code'
    },
    address: {
      label: 'Address',
      title: 'School address'
    },
    nextSessionDate: {
      label: 'Next session'
    },
    patientsMissingNhsNumber: {
      title: 'Missing NHS numbers',
      count:
        '{count, plural, =0 {No children} one {# child} other {# children}} have no NHS number'
    }
  },
  search: {
    label: 'Search',
    hint: {
      patient: 'Search by name, NHS number or postcode',
      session: 'Search by location name or postcode'
    },
    advanced: 'Advanced filters',
    initial: {
      default:
        'Search for a child or use filters to see children matching your selection',
      clinicBooking: 'Search for a child to book into this clinic session'
    },
    results: 'Search results',
    confirm: 'Update results',
    clear: 'Clear filters'
  },
  session: {
    label: 'Sessions',
    results:
      '{count, plural, =0 {No sessions matching your search criteria were found} one{Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> record} other{Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> sessions}}',
    count:
      '{count, plural, =0 {No sessions} one {1 session} other {# sessions}}',
    summary: 'Session details',
    action: {
      cancel: 'Cancel session'
    },
    search: {
      label: 'Find session'
    },
    show: {
      label: 'Overview'
    },
    new: {
      label: 'Add a new session',
      'check-answers': {
        confirm: 'Add this session',
        title: 'Check and confirm'
      },
      success: '{{session.name}} created'
    },
    edit: {
      title: 'Edit session',
      success: '{{session.name}} updated',
      appointments: {
        cancellation: {
          title: 'Appointments will be cancelled',
          description:
            '{count, plural, one {Changes made to this session will result in the cancellation of **1 appointment**.\n\nA notification will be sent to the parent or guardian of the affected child, inviting them to book a new appointment.} other {Changes made to this session will result in the cancellation of **{count} appointments**.\n\nNotifications will be sent to the parents or guardians of affected children, inviting them to book a new appointment.}}',
          detailsTitle: 'Affected appointments'
        }
      },
      cancel: 'Return to the session page'
    },
    cancel: {
      bookings: {
        title:
          '{count, plural, one {There is 1 appointment already booked for this session} other {There are {count} appointments already booked for this session}}',
        notification:
          '{count, plural, one {The parent will receive a message about the cancellation.} other {Parents will receive a message about the cancellation.}}',
        choice:
          'If you continue, you will be given the choice to offer rebooking immediately or at a later date.',
        confirm: 'Continue',
        cancel: 'Return to the session page'
      },
      rebooking: {
        title: 'Do you want to offer rebooking?',
        hint: '{count, plural, =0 {No appointments are available at other clinics targeting the same programmes.} one {1 appointment is available at another clinic targeting the same programmes.} other {{count} appointments are available at other clinics targeting the same programmes.}}',
        yes: 'Yes, include a link to rebook in the cancellation message',
        no: 'No, tell the parent they’ll be invited again later'
      },
      confirmation: {
        title: 'Are you sure you want to cancel this session?',
        details: 'Summary',
        confirm: 'Yes, cancel this session',
        cancel: 'No, return to the session page',
        appointmentsAffected: '{count, plural, =0 {None} other {{count}}}'
      },
      success: '{{session.name}} cancelled'
    },
    offerRebooking: {
      label: 'Offer rebooking?'
    },
    appointmentsAffected: {
      label: 'Appointments affected'
    },
    makeActive: {
      success: 'Session is now in progress'
    },
    academicYear: {
      label: 'Academic year'
    },
    consent: {
      label: 'Consent',
      title: 'Review consent responses'
    },
    screen: {
      label: 'Triage',
      title: 'Review triage statuses'
    },
    instructions: {
      label: 'PSDs',
      title: 'Review PSDs',
      count:
        '{count, plural, =0 {There are no children with consent for the nasal flu vaccine who do not require triage and do not yet have a PSD in place.} one {There is # child with consent for the nasal flu vaccine who does not require triage and does not yet have a PSD in place.} other {There are # children with consent for the nasal flu vaccine who do not require triage and do not yet have a PSD in place.}}'
    },
    register: {
      label: 'Register attendance',
      title: 'Register attendance',
      information: 'You can register attendance when a session is in progress.'
    },
    record: {
      label: 'Record vaccinations',
      title: 'Record vaccinations',
      information: 'You can record vaccinations when a session is in progress.',
      count:
        '{count, plural, =0 {no children for {programme}} one {# child for {programme}} other {# children for {programme}}}'
    },
    protocol: {
      label: 'Protocol',
      title: 'Vaccination protocol'
    },
    protocolNurse: {
      label: 'Protocol',
      title: 'Which protocol will registered nurses use to vaccinate children?',
      pgd: {
        label: 'A patient group direction (PGD)'
      },
      vgd: {
        label: 'A vaccine group direction (VGD)'
      }
    },
    protocolHCA: {
      label: 'Protocol for healthcare assistants',
      title:
        'Will healthcare assistants give vaccinations under a vaccine group direction (VGD)?',
      no: {
        label: 'No'
      },
      yes: {
        label: 'Yes'
      }
    },
    hasPsdProtocol: {
      label: 'Can use PSDs',
      title:
        'Can the flu nasal spray vaccine be given under a patient specific direction (PSD)?',
      hint: 'If a PSD is added to a child, they will be vaccinated under a PSD instead of a PGD or VGD',
      no: {
        label: 'No'
      },
      yes: {
        label: 'Yes'
      }
    },
    'upload-class-list': {
      title: 'Upload class list'
    },
    list: {
      label: 'Sessions',
      title: 'Sessions',
      description:
        'Review consent responses, triage health questions and record vaccinations'
    },
    giveInstructions: {
      label: 'Add new PSDs',
      title:
        'Are you sure you want to add {count, plural, =0 {no new PSDs} one {a new PSD} other {# new PSDs}}?',
      description: 'This cannot be undone.',
      confirm: 'Yes, add PSDs',
      cancel: 'No, return to session',
      success: 'PSDs added'
    },
    reminders: {
      label: 'Send reminders',
      title: 'Manage consent reminders',
      description:
        'Mavis automatically sends email and text reminders to parents who have not responded to the initial consent request.\n\nAutomatic reminders are sent 14, 7 and 3 days before a session.\n\nYou can also send reminders manually. Mavis will then skip the next automatic reminder if it’s due to be sent within 3 days.',
      activity:
        '{{contacts}} parents out of {{patients}} have not responded yet',
      preConfirm:
        'Mavis will skip the next automatic reminder if it’s scheduled to be sent within 3 days.',
      confirm: 'Send manual consent reminders',
      success: 'Manual consent reminders sent'
    },
    address: {
      label: 'Address'
    },
    consentForms: {
      label: 'Consent forms'
    },
    consentWindow: {
      label: 'Consent period'
    },
    mmrConsent: {
      title:
        'What type of MMR(V) consent request do you want to send to parents?',
      label: 'Type of MMR(V) consent request',
      standard: {
        label: 'Standard request',
        hint: 'This is for standard catch-up sessions'
      },
      outbreak: {
        label: 'Outbreak request ',
        hint: 'This is urgent in tone, and should be used in an outbreak scenario'
      }
    },
    schedule: {
      title: 'Schedule sessions',
      description: 'Add dates for this school.'
    },
    patients: {
      label: 'Children in session',
      title: 'Children in session',
      count:
        '{count, plural, =0 {No children} one {# child} other {# children}}'
    },
    eligible: {
      label: 'Eligible for vaccination',
      count:
        '{count, plural, =0 {No children are} one {# child is} other {# children are}} eligible for vaccination in this session'
    },
    activity: {
      label: 'Action required',
      getConsent: {
        label: 'No consent response',
        count:
          '{count, plural, =0 {No children} one {# child} other {# children}} with no response'
      },
      followUp: {
        label: 'Follow-up requested',
        count:
          '{count, plural, =0 {No children with a follow-up request} one {# child with a follow-up request} other {# children with follow-up requests}}'
      },
      resolveConsent: {
        label: 'Conflicting consent',
        count:
          '{count, plural, =0 {No children} one {# child} other {# children}} with conflicting consent'
      },
      offerCatchUps: {
        label: 'Offer additional vaccinations',
        count:
          '{count, plural, =0 {No children} one {# child} other {# children}} can be offered additional vaccinations'
      },
      giveInstructions: {
        label: 'PSD review needed',
        count:
          '{count, plural, =0 {No children} one {# child} other {# children}} need PSD review'
      },
      register: {
        label: 'Registration needed',
        count:
          '{count, plural, =0 {No children} one {# child} other {# children}} to register'
      },
      unmatchedConsent: {
        label: 'Unmatched children'
      },
      unmatchedAppointments: {
        label: 'Unmatched children'
      },
      // Registered and ready for vaccinator
      record: {
        label: 'Ready for vaccinator',
        count:
          '{count, plural, =0 {No children} one {# child} other {# children}} ready for vaccinator',
        programmeCount:
          '{count, plural, =0 {No children} one {# child} other {# children}} ready for {nameSentenceCase} vaccinator'
      }
    },
    tally: {
      vaccinated: {
        label: 'Vaccinations given in this session'
      },
      dueForVaccineCriteria: {
        label: 'Due {{vaccineCriteria}}'
      },
      vaccinatedWithVaccineCriteria: {
        label: '{{programme.name}} ({{vaccineCriteria}})'
      },
      appointments: {
        label: 'Clinic details',
        total: {
          label: 'Total slots'
        },
        available: {
          label: 'Available slots'
        },
        programmeRequests: {
          label: '%s appointments'
        },
        daysLeft: {
          label: 'Days left to book'
        },
        unmatched: {
          label: 'Unmatched children'
        }
      },
      vaccinators: {
        consistent: {
          label: 'Vaccinators'
        },
        maximum: {
          label: 'Vaccinators (max.)'
        }
      }
    },
    date: {
      label: 'Session date',
      title: 'When will this session be held?',
      hint: 'For example, 27 3 2026',
      check: {
        title: 'Have you uploaded historical vaccination records for %s?',
        description:
          '1% of children in {{yearGroups}} in this session have vaccination records. This is unusually low coverage for catch-up year groups.\n\nCheck and confirm that vaccination records have been uploaded for all children in this school before you continue.\n\nScheduling this session now will send consent requests to 40 parents of children in {{yearGroups}} on {{date}}. Many of them may be parents of already vaccinated children.',
        confirm: 'Keep session dates',
        cancel: 'Remove session dates'
      }
    },
    school: {
      label: 'School',
      title: 'Where will this session be held?'
    },
    school_id: {
      label: 'School URN',
      title: 'Enter the school'
    },
    yearGroups: {
      label: 'Year groups',
      title: 'Which year groups do you want to invite to this session?'
    },
    clinic: {
      label: 'Clinic location',
      title: 'Where will this session be held?',
      search: {
        label: 'Enter the clinic location'
      }
    },
    venueInformation: {
      label: 'Clinic information',
      title: 'Edit clinic information',
      hint: 'How to access the clinic — for example, parking or entrance information (this displays in the parent’s booking confirmation)'
    },
    vaccinationPeriods: {
      title: 'When will the session start and end?',
      hint: 'Parents will be able to book appointments between these times.',
      label: 'Vaccination periods',
      period: {
        title: 'Vaccination period %d',
        startTime: {
          label: 'Start time',
          hint: 'For example, 13 00'
        },
        endTime: {
          label: 'End time',
          hint: 'For example, 17 00'
        },
        removePeriod: {
          label: 'Remove'
        }
      },
      addPeriod: {
        description:
          'Adding more than one time period allows you to schedule breaks and vary staffing levels across the session.',
        label: 'Add another period'
      }
    },
    vaccinators: {
      title: 'How many vaccinators do you have for this session?',
      label: 'Vaccinators',
      input: {
        allPeriodsLabel: 'All periods',
        singlePeriodLabel:
          '{{startAt_.hour}}:{{startAt_.minute}} to {{endAt_.hour}}:{{endAt_.minute}}',
        suffix: 'vaccinators'
      },
      varies: {
        label: 'The number will vary by vaccination period'
      },
      consistent: {
        label: 'The number will not vary'
      }
    },
    vaccinationDuration: {
      nasal: {
        title: 'How long will a nasal spray appointment take, in minutes?',
        hint: 'This will be used in appointments that have flu as an additional vaccination.',
        label: 'Time for nasal spray'
      },
      injections: {
        title: 'How long will an injection appointment take, in minutes?',
        hint: 'It’s best if the time for one injection uses a multiple of the time allowed for the nasal spray. For example, if the time for the nasal spray is 3 minutes, use 9 minutes for the time for one injection.',
        label: {
          first: 'Time for one injection',
          additional: 'Time for each additional injection'
        }
      },
      suffix: 'minutes'
    },
    timeForNasalSpray: {
      label: 'Time for nasal spray'
    },
    timeForInjections: {
      label: 'Time for injections'
    },
    totalSlots: {
      label: 'Number of slots'
    },
    totalAppointments: {
      label: 'Number of appointments'
    },
    appointments: {
      label: 'Appointments'
    },
    location: {
      label: 'Location',
      title: 'About this location'
    },
    programmes: {
      label: 'Programmes',
      title: 'Which programmes will you run in this session?'
    },
    status: {
      label: 'Status'
    },
    type: {
      label: 'Type',
      title: 'What type of session is this?'
    },
    consentUrl: {
      label: 'Online consent form'
    },
    consentOpenAt: {
      title: 'When should parents get a request to give consent?',
      label: 'Consent requests',
      hint: 'For example, 27 3 2026'
    },
    reminderDate: {
      label: 'Automatic consent reminder schedule',
      description: 'Reminders will be sent automatically on this date:'
    },
    nextReminderDate: {
      label: 'Next reminder',
      text: 'The next automatic consent reminder will be sent on %s'
    },
    reminderWeeks: {
      title: 'When should parents get a reminder to give consent?',
      label: 'Consent reminders',
      hint: 'Enter the number of weeks before a session takes place'
    },
    hasRegistration: {
      title:
        'Do you want to register children’s attendance before recording vaccinations?',
      label: 'Register attendance'
    },
    download: {
      label: 'Download session spreadsheet'
    },
    inviteToClinic: {
      title: 'Invite parents to book a clinic appointment',
      label: 'Send clinic invitations',
      count:
        '{count, plural, =0 {No children} one {1 child} other {# children}} were not vaccinated at this school and have not already been invited to a clinic.',
      description:
        'You can send invitations to their parents to book an appointment to have their children vaccinated at a clinic.\n\nThe next clinic is on %s.',
      confirm: 'Send clinic invitations',
      success:
        '{count, plural, =0 {No children} one {1 child} other {# children}} invited to the clinic'
    },
    advertise: {
      label: 'Share a booking link for clinics',
      programmes: {
        title: 'Select the clinic programmes for your link',
        hint: 'The selected programmes will be combined into a single link that parents can use to book appointments.',
        programme: {
          hint: '{count, plural, =0 {No clinics are scheduled} one {1 clinic is scheduled} other {{count} clinics are scheduled}}'
        }
      },
      link: {
        title: 'Copy this link',
        copy: {
          label: 'Copy link'
        },
        copied: {
          label: 'Copied link'
        },
        description:
          'The link takes parents to a form where they can book their {{programmeNames}} vaccinations. It can be pasted anywhere you need to promote clinic vaccinations.',
        confirm: 'Return to the sessions page'
      }
    }
  },
  texts: {
    consent: {
      invite: {
        label: 'Invitation',
        name: 'Inviting parent to give or refuse consent',
        text: 'Give or refuse consent for {{child.firstName}} to have their {{session.vaccinationNames.sentenceCase}}:\n\n[https://give-or-refuse-consent.nhs.uk/{{session.id}}]({{session.consentUrl}}/start)\n\nYou need to do this by {{session.formatted.consentOpenAt}}.\n\nResponding will take less than 5 minutes.'
      },
      'invite-clinic': {
        label: 'Clinic booking',
        name: 'Inviting parent to book a clinic appointment',
        text: 'Our records show that {{child.firstName}} has not been vaccinated against {{session.programmeNames.sentenceCase}}.\n\nTo book this vaccination in a clinic, go to https://www.swiftqueue.co.uk/userlogin.php\n\nYou’ll need to register for a Swiftqueue account first.'
      },
      'invite-clinic-reminder': {
        label: 'Clinic booking reminder',
        name: 'Reminding parent to book a clinic appointment',
        text: "It’s not too late for {{child.firstName}} to get their {{session.vaccinationNames.sentenceCase}}.\n\nBook a clinic slot by going to https://www.swiftqueue.co.uk/userlogin.php\n\nYou'll need to register for a Swiftqueue account first."
      },
      'invite-clinic-consent': {
        label: 'Clinic invitation',
        name: 'Inviting parent to give consent for a clinic appointment',
        text: 'You recently booked a clinic appointment for {{child.firstName}}.\n\nPlease give consent for them to get the {{session.vaccinationNames.sentenceCase}} by going to https://give-or-refuse-consent.nhs.uk/{{session.id}}.'
      },
      'invite-reminder': {
        label: 'Reminder',
        name: 'Reminding parent to give or refuse consent',
        text: 'We recently asked for your consent to vaccinate your child against {{session.programmeNames.sentenceCase}}.\n\nGo to [https://give-or-refuse-consent.nhs.uk/{{session.id}}]({{session.consentUrl}}/start) to submit a response. This will take less than 5 minutes.'
      },
      'consent-already-vaccinated': {
        label: 'Already vaccinated',
        name: 'Confirmation that vaccination has already been given',
        text: 'You’ve told us that {{child.firstName}} has had both doses of the MMR vaccine.\n\nWe’ll update our records so you no longer get consent requests for MMR catch-up vaccinations.'
      },
      'consent-given': {
        label: 'Consent given',
        name: 'Confirmation that consent has been given',
        text: 'You’ve given consent for {{child.firstName}} to get their {{session.vaccinationNames.sentenceCase}} at school on {{session.formatted.nextDate}}. Please let them know what to expect.\n\nIf anything changes, phone {{team.tel}}.'
      },
      'consent-given-child': {
        label: 'Consent given (child)',
        name: 'Confirmation that consent has been given',
        text: 'Your parent or guardian has agreed for you to have the {{session.vaccinationNames.sentenceCase}} at school on {{session.formatted.nextDate}}.'
      },
      'consent-refused': {
        label: 'Consent refused',
        name: 'Confirmation that consent has been refused',
        text: 'You’ve refused to give consent for {{child.firstName}} to have their {{session.vaccinationNames.sentenceCase}}.\n\nYou can give feedback about the ‘Give or refuse consent’ service by completing our short survey:\n\n<https://feedback.digital.nhs.uk/jfe/form/SV_3fICo6frMvUZX1k>\n\nYour feedback will help us improve the service.'
      },
      'consent-followed-up': {
        // Reuses same confirmation as that for consent refused (or given)
        label: 'Consent refusal confirmed',
        name: 'Confirmation that consent has been refused',
        text: 'You’ve refused to give consent for {{child.firstName}} to have their {{session.vaccinationNames.sentenceCase}}.\n\nYou can give feedback about the ‘Give or refuse consent’ service by completing our short survey:\n\n<https://feedback.digital.nhs.uk/jfe/form/SV_3fICo6frMvUZX1k>\n\nYour feedback will help us improve the service.'
      },
      'vaccination-reminder': {
        label: 'Session reminder',
        name: 'Reminder (to go out the day before the vaccination)',
        text: '{{child.firstName}} may get their {{session.vaccinationNames.sentenceCase}} at school on {{session.formatted.nextDate}}.\n\nPlease make sure they have breakfast and encourage them to wear a short-sleeved shirt.\n\nIf {{child.firstName}} is absent or unwell on the day of the vaccination session, contact us to ask about alternative sessions.\n\n{{team.name}}, [{{team.tel}}](#)'
      },
      'vaccination-reminder-child': {
        label: 'Session reminder (child)',
        name: 'Reminder (to go out the day before the vaccination)',
        text: 'You’re due to get your {{session.vaccinationNames.sentenceCase}} at school tomorrow ({{session.formatted.nextDate}}). Please wear a short-sleeved shirt and make sure you eat something before the session.'
      },
      'vaccination-already-had': {
        label: 'Vaccination already had',
        name: 'Cancelled vaccination appointment',
        text: 'We are cancelling {{child.fullAndPreferredNames}}’s {{session.vaccinationNames.sentenceCase}} at school as our records show {{child.firstName}} was vaccinated at another location today. If this is wrong, contact us. [{{team.tel}}](#)'
      },
      'vaccination-given': {
        label: 'Vaccinated',
        name: 'Child has been vaccinated',
        text: '{{child.fullAndPreferredNames}} had their {{session.vaccinationNames.sentenceCase}} today. They might have some of the following side effects: bruising or itching at the injection site, a high temperature, nausea, or pain in the arms, hands, or fingers.\n\nIf you’re concerned, contact your GP in the usual way.'
      },
      'vaccination-not-given-absent': {
        label: 'Could not vaccinate (child absent)',
        name: 'Child did not get their vaccination despite having consent',
        text: '{{child.fullAndPreferredNames}} did not have their {{session.vaccinationNames.sentenceCase}} at school today. This was because they were absent from the session.\n\nIf you’d still like them to be vaccinated on a different date, contact the local health team by calling [{{team.tel}}](#), or email [{{team.email}}](#).'
      },
      'vaccination-not-given-refused': {
        label: 'Could not vaccinate (child refused)',
        name: 'Child did not get their vaccination despite having consent',
        text: '{{child.fullAndPreferredNames}} did not have their {{session.vaccinationNames.sentenceCase}} at school today. This was because they refused the vaccine.\n\nIf you’d still like them to be vaccinated on a different date, contact the local health team by calling [{{team.tel}}](#), or email [{{team.email}}](#).'
      },
      'vaccination-not-given-unwell': {
        label: 'Could not vaccinate (child unwell)',
        name: 'Child did not get their vaccination despite having consent',
        text: '{{child.fullAndPreferredNames}} did not have their {{session.vaccinationNames.sentenceCase}} at school today. This was because they were unwell.\n\nIf you’d still like them to be vaccinated on a different date, contact the local health team by calling [{{team.tel}}](#), or email [{{team.email}}](#).'
      },
      'vaccination-not-given-contraindicated-delay-vaccination': {
        label: 'Could not vaccinate (delay vaccination)',
        name: 'Child did not get their vaccination despite having consent',
        text: '{{child.fullAndPreferredNames}} did not have their {{session.vaccinationNames.sentenceCase}} today. Our nursing team decided it would be better for {{child.firstName}} to be vaccinated at a later date.\n\nIf {{child.firstName}}’s health changes, or you arrange for them to be vaccinated somewhere else, contact us by calling [{{team.tel}}](#), or email [{{team.email}}](#).'
      },
      'vaccination-not-given-contraindicated-do-not-vaccinate': {
        label: 'Could not vaccinate (do not vaccinate)',
        name: 'Child did not get their vaccination despite having consent',
        text: '{{child.fullAndPreferredNames}} did not have their {{session.vaccinationNames.sentenceCase}} today. Our nursing team decided that {{child.firstName}} cannot have their {{session.vaccinationNames.sentenceCase}} vaccination.\n\nTo discuss what {{child.firstName}} might be able to have instead, contact us by calling [{{team.tel}}](#), or email [{{team.email}}](#).'
      },
      'vaccination-not-given-contraindicated-invite-to-clinic': {
        label: 'Could not vaccinate (invite to clinic)',
        name: 'Child did not get their vaccination despite having consent',
        text: '{{child.fullAndPreferredNames}} did not have their {{session.vaccinationNames.sentenceCase}} today. Our nursing team decided that the vaccination should take place at a clinic.\n\nTo book a clinic appointment, call [{{team.tel}}](#), or email [{{team.email}}](#).'
      }
    }
  },
  team: {
    show: {
      label: 'Your team',
      title: 'Your team',
      description: 'Manage your team’s settings'
    },
    edit: {
      success: 'Team settings updated'
    },
    contact: {
      title: 'Contact details',
      summary: 'Contact details'
    },
    clinics: {
      title: 'Clinics',
      summary: 'Clinics',
      new: {
        title: 'Add a new clinic'
      }
    },
    schools: {
      title: 'Schools',
      summary: 'Schools'
    },
    sessions: {
      title: 'Sessions',
      school: {
        title: 'School sessions',
        text: 'You can change these values when scheduling new school sessions.',
        defaults: 'School session defaults'
      },
      clinic: {
        title: 'Clinic sessions',
        text: 'You can change these values when scheduling new clinics.',
        defaults: 'Clinic session defaults'
      }
    },
    sessionOpenWeeks: {
      title: 'When should parents get a request to give consent?',
      label: 'Consent request',
      hint: 'Enter the number of weeks before the first session takes place'
    },
    sessionReminderWeeks: {
      title: 'When should parents get a reminder to give consent?',
      label: 'Consent reminders',
      hint: 'Enter the number of weeks before a session takes place'
    },
    hasSchoolSessionRegistration: {
      title:
        'Register children’s attendance before recording vaccinations in school?',
      label: 'Register attendance'
    },
    hasClinicSessionRegistration: {
      title:
        'Register children’s attendance before recording vaccinations at a clinic?',
      label: 'Register attendance'
    },
    nasalSprayDuration: {
      title:
        'How much time should be given for a nasal spray at clinic sessions?',
      label: 'Nasal spray appointment length',
      hint: 'Enter the number of minutes to give each nasal spray'
    },
    injectionDuration: {
      title:
        'How much time should be given for an injection at clinic sessions?',
      label: 'Injection appointment length',
      hint: 'Enter the number of minutes to give each injection'
    },
    reminders: {
      title: 'Consent reminders'
    },
    name: {
      label: 'Name'
    },
    code: {
      label: 'ODC code'
    },
    tel: {
      label: 'Phone number'
    },
    email: {
      label: 'Email address'
    },
    privacyPolicyUrl: {
      label: 'Privacy policy',
      hint: 'Linked to from consent forms and consent request emails'
    }
  },
  triage: {
    title: 'Triage',
    label: 'Triage',
    confirm: 'Save triage',
    new: {
      title: 'Update triage outcome',
      success: 'Triage outcome updated'
    },
    statusInvalidAt: {
      label: 'Delayed until',
      title:
        'What is the earliest date {{patient.firstName}} can be vaccinated?',
      hint: 'For example, {{date}}'
    },
    note: {
      label: 'Triage notes'
    },
    status: {
      label: 'Is it safe to vaccinate {{patient.firstName}}?',
      [ScreenStatus.Vaccinate]: 'Yes, it’s safe to vaccinate',
      [ScreenStatus.VaccinateAlternativeFluInjectionOnly]:
        'Yes, it’s safe to vaccinate with injected vaccine',
      [ScreenStatus.VaccinateAlternativeMMRInjectionOnly]:
        'Yes, it’s safe to vaccinate with gelatine-free vaccine',
      [ScreenStatus.VaccinateIntranasalOnly]:
        'Yes, it’s safe to vaccinate with nasal spray',
      [ScreenStatus.DoNotVaccinate]: 'No, do not vaccinate',
      [ScreenStatus.InvitedToClinic]: 'No, invite to clinic',
      [ScreenStatus.DelayVaccination]: 'No, delay vaccination',
      [ScreenStatus.NeedsTriage]: 'No, keep in triage'
    },
    psd: {
      label: 'Do you want to add a PSD?'
    }
  },
  upload: {
    label: 'Upload',
    action: {
      title: 'Are you sure you want to %s?',
      description: 'This cannot be undone.',
      cancel: 'No, return to upload',
      confirm: 'Yes, %s'
    },
    delete: {
      label: 'Delete upload',
      confirm: 'Cancel and delete upload',
      success: 'Upload deleted'
    },
    approve: {
      confirm: 'Approve and upload records',
      success: 'Upload approved'
    },
    list: {
      label: 'Uploads',
      title: 'Uploads',
      results: 'All uploads',
      description: 'Upload cohort, class list and vaccination records'
    },
    search: {
      label: 'Find upload'
    },
    results:
      '{count, plural, =0 {No uploads matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> upload} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> uploads}}',
    show: {
      title: 'Upload (%s)',
      requiresReviewTitle: 'Review and approve upload (%s)',
      summary: 'Details',
      new: {
        title: 'New records',
        count:
          '{count, plural, =0 {No new records} one {1 new record} other {# new records}}',
        summary:
          'This upload includes {count, plural, =0 {no new records that are} one {1 new record this is} other {# new records  that are}} not currently in Mavis. If you approve the upload, these records will be added to Mavis.'
      },
      partial: {
        label: {
          [UploadStatus.Review]: 'Changes to review',
          [UploadStatus.Approved]: 'Changes reviewed'
        },
        title: {
          [UploadStatus.Review]:
            'Close matches to existing records – need review',
          [UploadStatus.Approved]: 'Issues resolved for this upload'
        },
        count: {
          [UploadStatus.Review]:
            '{count, plural, =0 {No close matches} one {1 close match} other {# close matches}} to existing records',
          [UploadStatus.Approved]:
            '{count, plural, =0 {No upload issues} one {1 upload issue} other {# upload issues}}'
        },
        decision: {
          label: 'Decision',
          title: 'Which changes do you want to keep for {{patient.fullName}}?',
          duplicate: {
            label: 'Use uploaded'
          },
          archived: {
            label: 'This record was previously archived.\n%s.'
          },
          original: {
            label: 'Keep existing'
          },
          both: {
            label: 'Keep both'
          },
          restore: {
            label: 'Restore record'
          },
          ignore: {
            label: 'Keep archived'
          }
        },
        summary: {
          [UploadStatus.Review]:
            'This upload includes {count, plural, =0 {no records} one {1 record} other {# records}} that are close matches to existing records in Mavis. You need to review these records before you can approve this upload.',
          [UploadStatus.Approved]:
            '{count, plural, =0 {No records} one {1 upload issue} other {# upload issues}} reviewed'
        }
      },
      matched: {
        title: 'Records already in Mavis',
        count:
          '{count, plural, =0 {No records} one {1 record} other {# records}} already in Mavis',
        summary:
          'This upload includes {count, plural, =0 {no records that already exist} one {1 record that already exists} other {# records that already exist}} in Mavis. You do not need to remove these from your CSV file. If you approve the upload, any additional information will be added to the existing records.'
      },
      imported: {
        title: 'Uploaded records',
        count:
          '{count, plural, =0 {No uploaded records} one {1 uploaded record} other {# uploaded records}}'
      },
      moves: {
        title: {
          [UploadStatus.Review]: 'School moves – need review',
          [UploadStatus.Approved]: 'School moves resolved for this upload'
        },
        count:
          '{count, plural, =0 {No school moves} one {1 school move} other {# school moves}}',
        decision: {
          label: 'Decision',
          title: 'Accept school move for {{patient.fullName}}?',
          accept: {
            label: 'Accept move'
          },
          ignore: {
            label: 'Ignore move'
          }
        },
        summary: {
          [UploadStatus.Review]:
            'This upload includes {count, plural, =0 {No children} one {1 child} other {# children}} with a different school to the one in their Mavis record. You need to review these records before you can approve this upload.',
          [UploadStatus.Approved]:
            '{count, plural, =0 {No school moves} one {1 school move} other {# school moves}} reviewed'
        }
      }
    },
    new: {
      label: 'Upload records',
      success: 'Records uploaded for processing'
    },
    edit: {
      label: 'Upload corrected %s',
      success: 'Corrected records uploaded for processing'
    },
    file: {
      title: 'Upload {{type}}',
      label: 'Upload file',
      description: {
        report:
          'You can add vaccination records by uploading:\n\n- a Mavis CSV file\n- a SystmOne file',
        other:
          'The file you upload should use the Mavis CSV format for {{type}}'
      },
      format: 'How to format your Mavis CSV file for {{type}}',
      errors: {
        invalid: 'The selected file must be a CSV'
      }
    },
    removeRelationships: {
      title: 'Bulk remove relationships',
      label: 'Bulk remove relationships',
      description:
        'If there is a problem in the class list upload, you can bulk remove relationships between parents and children.',
      nonConsenting:
        'Remove relationships where parents haven’t given consent yet',
      all: 'Remove relationships for all parents and children',
      confirm: 'Continue',
      cancel: 'Cancel',
      success: 'Relationships removed'
    },
    school: {
      label: 'School',
      title: 'Which school is this class list for?'
    },
    yearGroups: {
      label: 'Year groups',
      title: 'Which year groups do you want to upload class list records for?'
    },
    invalid: {
      title: 'Records could not be uploaded'
    },
    devoid: {
      title: 'No new records',
      description: 'All records in this file have already been uploaded'
    },
    failed: {
      title: 'Too many records could not be matched',
      description:
        'The records could not be uploaded as an unusually low number of records were matched to PDS (spine). PDS successfully matched only 60 records, a 10% match rate.\n\nReview your file and try uploading it again.',
      count:
        '{count, plural, =0 {No unmatched records} one {1 unmatched record} other {# unmatched records}}'
    },
    id: {
      label: 'ID'
    },
    created: {
      label: 'Uploaded'
    },
    createdBy: {
      label: 'Uploaded by'
    },
    updated: {
      label: 'Approved'
    },
    updatedBy: {
      label: 'Approved by'
    },
    fileName: {
      label: 'File'
    },
    summary: {
      label: 'Date and uploaded file'
    },
    programme: {
      label: 'Programme'
    },
    type: {
      label: 'Type',
      title: 'What type of records are you uploading?',
      hint: {
        Cohort:
          'Records of children from a CHIS, local authority or school, used to create cohorts',
        Report:
          'Records of previous vaccinations to be reported to GPs and/or NHS England',
        School: 'Records of children from a school, used to update cohorts'
      }
    },
    status: {
      label: 'Status'
    },
    vaccinations: {
      label: 'Vaccination records'
    },
    patients: {
      label: 'Records'
    }
  },
  manual: {
    show: {
      title: 'Service guidance',
      description: 'How to use this service'
    }
  },
  move: {
    label: 'School move',
    list: {
      label: 'School moves',
      title: 'School moves',
      description: 'Review children who have moved schools'
    },
    show: {
      title: 'Review school move',
      confirm: 'Update child record',
      decision: {
        label: 'Update the child’s record with this new information?',
        ignore: 'Ignore new information',
        switch: 'Update record with new school'
      },
      session: {
        label: 'Move {{firstName}} to the upcoming school session?',
        hint: 'There are upcoming sessions at {{school}} on {{dates}}',
        clinic: 'No, keep them in the community clinic',
        school: 'Yes, move them to the upcoming school session'
      }
    },
    download: {
      label: 'Download school moves'
    },
    ignore: {
      success: '{{move.patient.fullName}}’s school move ignored'
    },
    switch: {
      success: '{{move.patient.fullName}}’s record updated with new school'
    },
    count:
      '{count, plural, =0 {No school moves} one {1 school move} other {# school moves}}',
    results:
      '{count, plural, =0 {No school moves matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> school move} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> school moves}}',
    createdAt: {
      label: 'Updated'
    },
    source: {
      label: 'Updated in'
    },
    team_id: {
      label: 'This child is moving in from another SAIS team’s area',
      description:
        'Confirming this school move will bring {{move.patient.firstName}} into your area from {{move.formatted.team_id}}'
    },
    from_urn: {
      label: 'School joined from'
    },
    to_urn: {
      label: 'School moved to'
    }
  },
  user: {
    list: {
      title: 'Users',
      caption: 'Care Identity Service'
    },
    show: {
      summary: 'User details'
    },
    uid: {
      label: 'User ID'
    },
    fullName: {
      label: 'Name'
    },
    email: {
      label: 'Email address'
    },
    firstName: {
      label: 'First name'
    },
    lastName: {
      label: 'Last name'
    },
    role: {
      label: 'Role'
    },
    vaccinations: {
      label: 'Administered'
    }
  },
  vaccination: {
    label: 'Vaccination record',
    show: {
      summary: 'Vaccination record'
    },
    count:
      '{count, plural, =0 {No vaccination records} one {1 vaccination record} other {# vaccination records}}',
    administer: {
      title: 'How was the {{programme.nameSentenceCase}} vaccination given?'
    },
    decline: {
      title: 'Why was the {{programme.nameSentenceCase}} vaccination not given?'
    },
    new: {
      'check-answers': {
        title: 'Check your answers before saving this vaccination outcome',
        summary: 'Vaccination details',
        notGiven: 'Vaccination was not given'
      },
      mismatchedMethods: {
        title: 'Incorrect vaccine given',
        description:
          'The vaccine selected does not match the consent or triage outcome.'
      },
      alreadyVaccinated: {
        title: 'Record as already vaccinated',
        tetanus: 'Record a previous vaccination'
      },
      notGiven: {
        title: 'Vaccination was not given'
      },
      confirm: 'Save',
      success:
        'Vaccination outcome recorded for {{vaccination.programme.nameSentenceCase}}'
    },
    edit: {
      title: 'Edit vaccination record',
      summary: 'Vaccination details',
      success: 'Vaccination record updated'
    },
    assessedBy: {
      label: 'Assessed by',
      title: 'Which nurse identified and pre-screened the child?'
    },
    administeredAt: {
      label: 'Vaccination date',
      title:
        'When was the {{session.programmeNames.sentenceCase}} vaccination given?'
    },
    administeredAt_date: {
      label: 'Date',
      hint: 'For example, 27 10 2025'
    },
    administeredAt_time: {
      label: 'Time',
      hint: 'For example, 13 15'
    },
    administeredBy: {
      label: 'Vaccinated by',
      title: 'Who was the vaccinator?'
    },
    createdAt: {
      label: 'Reported on'
    },
    createdBy: {
      label: 'Reported by'
    },
    updatedAt: {
      label: 'Record updated'
    },
    age: {
      label: 'Age'
    },
    isVariant: {
      label: 'Programme variant',
      title: 'Was {{patient.firstName}} vaccinated with the MMRV vaccine?',
      hint: '{{patient.firstName}} is eligible for the new MMRV vaccine, but may have got the  MMR vaccine instead.'
    },
    syncStatus: {
      label: 'Synced with NHS England?'
    },
    location: {
      label: 'Location'
    },
    locationOther: {
      hint: 'For example, a GP surgery, hospital or somewhere in another country'
    },
    locationType: {
      label: 'Location',
      title:
        'Where was the {{session.programmeNames.sentenceCase}} vaccination given?'
    },
    clinic_id: {
      label: 'Community clinic',
      title: 'Select a community clinic'
    },
    school_id: {
      label: 'School',
      title: 'Select a school'
    },
    address: {
      label: 'Location',
      title: 'Location name and address'
    },
    country: {
      label: 'Country',
      title: 'Country',
      england: 'England',
      scotland: 'Scotland',
      wales: 'Wales',
      ni: 'Northern Ireland',
      other: 'Another country outside the UK'
    },
    countryOther: {
      title: 'Which country was the vaccination given in?'
    },
    outcome: {
      label: 'Outcome',
      title: 'Vaccination outcome',
      absent: 'They were absent from the session',
      delayVaccination: 'They had contraindications, delay vaccination',
      doNotVaccinate: 'They had contraindications, do not vaccinate',
      inviteToClinic: 'They had contraindications, invite to clinic',
      refused: 'They refused it',
      unwell: 'They were not well enough'
    },
    hasSelfIdentified: {
      true: 'Yes',
      false: 'No, it was confirmed by somebody else'
    },
    identifiedBy: {
      title: 'Did {{patient.firstName}} confirm their identity?',
      label: 'Child identified by',
      name: {
        label: 'Name',
        title: 'What is the person’s name?'
      },
      relationship: {
        label: 'Relationship to child',
        title: 'What is their relationship to the child?',
        hint: 'For example, parent, teacher or teaching assistant'
      }
    },
    injection: {
      title:
        'How was the {{session.programmeNames.sentenceCase}} vaccination given?'
    },
    method: {
      label: 'Method',
      title:
        'How was the {{session.programmeNames.sentenceCase}} vaccination given?'
    },
    site: {
      label: 'Site',
      title: 'Which injection site was used?'
    },
    source: {
      label: 'Source'
    },
    tetanus: {
      label: 'Dose'
    },
    programme: {
      label: 'Programme',
      title: 'Which programme was this vaccination given for?'
    },
    protocol: {
      label: 'Protocol'
    },
    batch: {
      label: 'Batch number',
      title: 'Batch number'
    },
    batch_id: {
      title:
        'Which batch did you use for the {{vaccination.programme.name}} vaccination?',
      label: 'Batch number'
    },
    note: {
      label: 'Notes',
      hint: 'For example, if the child had a reaction to the vaccine',
      hintAlreadyVaccinated:
        'For example, details given by the parent about the vaccination',
      title: 'Notes'
    },
    dose: {
      label: 'Dose volume',
      title: 'What was the dose amount for the %s vaccination?'
    },
    dosage: {
      title: 'Did they get the full dose?',
      full: 'Yes, they got the full dose',
      half: 'No, they got half a dose'
    },
    sequence: {
      label: 'Dose sequence',
      title: 'Which dose of the %s vaccination was this?'
    },
    vaccine: {
      title: 'Which vaccine was given?',
      label: 'Vaccine'
    },
    review: {
      title: 'Review duplicate vaccination record',
      duplicate: {
        label: 'Duplicate record',
        record: 'Duplicate child record',
        vaccination: 'Duplicate vaccination record'
      },
      original: {
        label: 'Previously uploaded record',
        record: 'Previously uploaded child record',
        vaccination: 'Previously uploaded vaccination record'
      },
      decision: {
        label: 'Which record do you want to keep?',
        duplicate: {
          label: 'Use duplicate record',
          hint: 'The duplicate record will replace the previously uploaded record.'
        },
        original: {
          label: 'Keep previously uploaded record',
          hint: 'The previously uploaded record will be kept and the duplicate record will be discarded.'
        }
      },
      confirm: 'Resolve duplicate'
    }
  },
  vaccine: {
    label: 'Vaccine',
    list: {
      label: 'Vaccines',
      title: 'Vaccines',
      description: 'Add and edit vaccine batches'
    },
    show: {
      summary: 'Vaccine details',
      delete: 'Delete vaccine'
    },
    new: {
      title: 'Add a new vaccine'
    },
    action: {
      title: 'Are you sure you want to %s this vaccine?',
      description: 'This cannot be undone.',
      confirm: 'Yes, %s this vaccine',
      cancel: 'No, return to vaccine'
    },
    delete: {
      success: 'Vaccine deleted'
    },
    id: {
      label: 'Batch number'
    },
    createdAt: {
      label: 'Entered date'
    },
    snomed: {
      label: 'SNOMED code'
    },
    brand: {
      label: 'Brand'
    },
    manufacturer: {
      label: 'Manufacturer'
    },
    type: {
      label: 'Vaccine'
    },
    method: {
      label: 'Method'
    },
    dose: {
      label: 'Dose'
    },
    healthQuestions: {
      label: 'Health questions'
    },
    preScreenQuestions: {
      label: 'Pre-screening questions'
    },
    sideEffects: {
      label: 'Side effects'
    }
  }
}

/**
 * @import { LocaleCatalog } from 'i18n'
 */
