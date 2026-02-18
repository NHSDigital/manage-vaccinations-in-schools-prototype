import { healthQuestions } from '../datasets/health-questions.js'
import {
  RegistrationOutcome,
  ReplyDecision,
  ReplyRefusal,
  ScreenOutcome,
  SessionPresetName,
  UploadStatus
} from '../enums.js'

/**
 * @returns {import("i18n").LocaleCatalog}
 */
export const en = {
  actions: {
    label: 'Actions',
    change: 'Change',
    remove: 'Remove',
    review: 'Review',
    update: 'Update',
    archive: 'Archive'
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
        heading: 'Agree to our terms of use',
        description:
          'By continuing, you agree to our [terms and conditions](https://digital.nhs.uk/services/care-identity-service/registration-authority-users/registration-authority-help/privacy-notice#terms-and-conditions)'
      },
      remember: {
        label: 'Remember my selection',
        hint: 'Do not check this box if you are on a shared computer'
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
      title: 'Add batch',
      confirm: 'Add batch',
      success: 'Batch {{batch.id}} added'
    },
    edit: {
      title: 'Edit batch {{batch.id}}',
      confirm: 'Save changes',
      success: 'Batch {{batch.id}} updated'
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
    gpSurgery: {
      label: 'GP surgery'
    },
    parent: {
      label: 'Parent'
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
      label: 'Unmatched responses',
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
      caption: 'Consent response from {{parent.formatted.fullName}}'
    },
    link: {
      title: 'Link consent response with child record?',
      caption: 'Consent response from {{parent.fullName}}',
      summary: 'Compare child details',
      confirm: 'Link response with record',
      success:
        'Consent response from {{consent.parent.fullName}} linked to [{{patient.fullName}}]({{patient.uri}})’s record'
    },
    add: {
      label: 'Create new record',
      title: 'Create a new child record from this consent response?',
      caption: 'Consent response from {{parent.fullName}}',
      confirm: 'Create a new record from response',
      success:
        '[{{patient.fullName}}]({{patient.uri}})’s record created from a consent response from {{consent.parent.fullName}}'
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
        'To give or refuse consent for a child’s vaccination, you need to have parental responsibility.\n\nIf you have any questions, please contact the local health organisation by calling {{team.tel}}, or email {{team.email}}.'
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
        guideDog: {
          label: 'A guide dog'
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
      'home-schooled': {
        title: 'Is your child home-schooled?',
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
    ethnicity: {
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
    parent: {
      summary: 'About you',
      title: 'About you',
      label: 'Parent',
      fullName: {
        label: 'Full name'
      },
      relationship: {
        label: 'Relationship to child'
      },
      notify: {
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
      sms: {
        label: "Tick this box if you'd like to get updates by text message"
      },
      contactPreference: {
        title: 'If we need to contact you',
        label: 'Do you have any communication needs?',
        yes: 'Yes',
        no: 'No',
        description:
          'Let us know if you have any communication needs you’d like us to be aware of – for example, a hearing or visual impairment.'
      },
      contactPreferenceDetails: {
        label: 'Give details'
      },
      relationshipOther: {
        label: 'Relationship to the child'
      },
      hasParentalResponsibility: {
        label: 'Do you have parental responsibility?',
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
    alternative: {
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
    consultation: {
      title:
        'Would you like a member of the team to contact you to discuss alternative options?',
      hint: 'For example, it may be possible to vaccinate your child in a community clinic.',
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
      scheduled: {
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
      scheduled: {
        title:
          'Was the 2nd dose given when your child was 3 years and 4 months old?',
        hint: 'This is usually the child’s age when the 2nd dose is offered'
      }
    },
    previousDose: {
      country: {
        label: 'Country',
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
        hint: 'If you do not know the exact date of the vaccination, leave the day field empty and enter your best guess for the month'
      },
      scheduled: {
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
        // TODO: Parent may have given consent for two vaccinations for doubles
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
      description: 'We’ve sent a confirmation to <{{consent.parent.email}}>.'
    },
    actions: {
      label: 'Actions'
    }
  },
  download: {
    new: {
      label: 'Download vaccination report',
      confirm: 'Download vaccination data'
    },
    startAt: {
      label: 'Get vaccination data from'
    },
    endAt: {
      label: 'Get vaccination data until'
    },
    format: {
      title: 'Select file format',
      label: 'File format'
    },
    teams: {
      title: 'Select providers',
      label: 'Providers'
    },
    vaccinations: {
      label: 'Records'
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
        name: 'Booking a clinic appointment for your child’s {{session.vaccinationNames.sentenceCase}}'
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
        name: 'You’ve told us that {{consent.child.firstName}} is fully vaccinated against MMR'
      },
      'consent-given': {
        label: 'Consent given',
        name: '{{session.vaccinationNames.titleCase}} on {{session.formatted.nextDate}}'
      },
      'consent-given-changed-school': {
        label: 'Consent given (changed school)',
        name: 'Your child’s {{session.vaccinationNames.sentenceCase}}'
      },
      'consent-conflicts': {
        label: 'Consent conflicts',
        name: 'Your child will not have their {{session.vaccinationNames.sentenceCase}}'
      },
      'consent-refused': {
        label: 'Consent refused',
        name: '{{session.vaccinationNames.titleCase}} on {{session.formatted.nextDate}}'
      },
      'consent-needs-triage': {
        label: 'Consent needs triage',
        name: '{{session.vaccinationNames.titleCase}} on {{session.formatted.nextDate}}'
      },
      'triage-vaccinate': {
        label: 'Vaccinate',
        name: 'Your child can have the {{session.vaccinationNames.sentenceCase}} on {{session.formatted.nextDate}}'
      },
      'triage-delay-vaccination': {
        label: 'Delay vaccination',
        name: 'Please book a clinic appointment for your child’s {{session.vaccinationNames.sentenceCase}}'
      },
      'triage-do-not-vaccinate': {
        label: 'Do not vaccinate',
        name: 'Your child will not have the {{session.vaccinationNames.sentenceCase}} in school'
      },
      'record-reminder': {
        label: 'Reminder',
        name: '{{consent.child.fullName}} will get their {{session.vaccinationNames.sentenceCase}} on {{session.formatted.nextDate}}'
      },
      'record-vaccinated': {
        label: 'Vaccinated',
        name: 'Your child had their {{session.vaccinationNames.sentenceCase}} today'
      },
      'record-vaccinated-many': {
        label: 'Vaccinated (many)',
        name: 'Your child had their {{session.vaccinationNames.sentenceCase}} today'
      },
      'record-could-not-vaccinate': {
        label: 'Could not vaccinate',
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
    pinned: {
      label: 'Pinned',
      title: 'Do you want to pin this note?',
      hint: 'Pinned notes show at the top of session pages and on search results within a session'
    },
    outcome: {
      label: 'Outcome'
    }
  },
  healthAnswers: {
    label: 'All answers to health questions'
  },
  healthQuestions,
  home: {
    show: {
      title: 'Home'
    }
  },
  notice: {
    label: 'Notice',
    list: {
      label: 'Notices',
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
  parent: {
    label: 'Parent or guardian',
    fullName: {
      label: 'Name'
    },
    sms: {
      label: 'Get updates by text message',
      true: 'Yes',
      false: 'No'
    },
    relationship: {
      label: 'Relationship'
    },
    hasParentalResponsibility: {
      label: 'Parental responsibility',
      hint: 'They have the legal rights and duties relating to the child'
    },
    email: {
      label: 'Email address'
    },
    tel: {
      label: 'Phone number'
    },
    contactPreference: {
      label: 'Communication needs'
    },
    relationshipOther: {
      label: 'Give details'
    },
    notify: {
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
    results:
      '{count, plural, =0 {No children matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> record} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> children}}',
    search: {
      label: 'Find children',
      dob: 'Child’s date of birth',
      showOnly: 'Show only',
      archived: 'Archived records',
      hasAdjustment: 'Children needing reasonable adjustments',
      hasImpairment: 'Children with impairments',
      hasMissingNhsNumber: 'Children missing an NHS&nbsp;number',
      post16: 'Children aged out of programmes'
    },
    archiveReason: {
      label: 'Reason archived'
    },
    archiveReasonOther: {
      label: 'Give details'
    },
    archived: {
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
    hasMissingNhsNumber: {
      label: 'Missing NHS number'
    },
    post16: {
      label: 'Over 16 years old?',
      status:
        '{{patient.fullName}} is no longer eligible for school age immunisations'
    },
    fullNameAndNhsn: {
      label: 'Name and NHS number'
    },
    fullName: {
      label: 'Full name',
      title: 'What is the child’s name?'
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
    yearGroup: {
      label: 'Year group'
    },
    yearGroupWithRegistration: {
      label: 'Year group'
    },
    parents: {
      label: 'Parents or guardians'
    },
    vaccinations: {
      label: 'Vaccinations'
    },
    parent: {
      label: 'Parent or guardian',
      fullName: {
        label: 'Name'
      },
      relationship: {
        label: 'Relationship to child'
      },
      notify: {
        label: 'Send notifications'
      },
      email: {
        label: 'Email address'
      },
      tel: {
        label: 'Phone number'
      },
      relationshipOther: {
        label: 'Relationship to the child'
      }
    },
    parent1: {
      label: 'First parent or guardian',
      title: 'Details for first parent or guardian'
    },
    parent2: {
      label: 'Second parent or guardian',
      title: 'Details for second parent or guardian'
    },
    programmes: {
      label: 'Vaccination programmes'
    },
    status: {
      label: 'Status'
    }
  },
  patientProgramme: {
    label: 'Vaccination programme',
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
    status: {
      label: 'Status'
    },
    statusNotes: {
      label: 'Notes'
    },
    ttcv: {
      label: 'Previous vaccinations for Tetanus, Diptheria and Polio'
    }
  },
  patientSession: {
    show: {
      title: 'Child record'
    },
    events: {
      title: 'Session notes and activity'
    },
    notes: {
      label: 'Notes',
      new: {
        title: 'Add a session note',
        confirm: 'Save session note',
        success: 'Session note added'
      }
    },
    pinnedNotes: {
      label: 'Session notes'
    },
    pinnedNote: {
      label: 'Session note'
    },
    patientProgramme: {
      label: 'View %s record'
    },
    consent: {
      label: 'Consent status',
      title: 'Consent for %s vaccination'
    },
    screen: {
      label: 'Triage status',
      title: 'Triage for %s vaccination'
    },
    instruct: {
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
    report: {
      label: 'Programme status'
    },
    information: {
      label: 'Notes'
    },
    session: {
      label: 'Session'
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
      success:
        'Consent request sent to {{parent.formatted.fullNameAndRelationship}}'
    },
    replies: {
      pending: 'Consent requests',
      requests: 'Consent requests',
      responses: 'Consent responses'
    },
    preScreen: {
      label: 'Pre-screening checks',
      description: 'Have you checked that {{patient.firstName}}:',
      selfId: {
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
      suppliedBy: {
        label: 'Supplier',
        title:
          'Which nurse identified and pre-screened the child and supplied the vaccine?'
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
        [RegistrationOutcome.Present]:
          '{{patientSession.patient.fullName}} is attending today’s session.',
        [RegistrationOutcome.Absent]:
          '{{patientSession.patient.fullName}} has been recorded as absent from today’s session.'
      }
    }
  },
  programme: {
    label: 'Programme',
    list: {
      label: 'Reports',
      title: 'Reports',
      description:
        'View the progress of vaccination programmes and download vaccination data'
    },
    show: {
      responses: 'Consent responses'
    },
    patients: {
      label: 'Children'
    },
    name: {
      label: 'Programme'
    },
    type: {
      label: 'Programme type'
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
        label: 'Does their original decision still stand?'
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
    parent: {
      label: 'Parent',
      title: {
        new: 'Details for parent or guardian',
        edit: 'Details for {{parent.formatted.fullNameAndRelationship}}'
      },
      notify: {
        title:
          'Do you want to send {{parent.formatted.fullName}} an email and text message confirming their decision?',
        label: 'Notify parent'
      }
    },
    programme: {
      label: 'Programme',
      title: {
        Child: 'Which vaccination is the child giving consent for?',
        Parent: 'Which vaccination are they giving consent for?'
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
        Parent:
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
    alternative: {
      label: 'Consent also given for injected vaccine?',
      title:
        'Do they also agree to the injected vaccine if the nasal spray is not suitable?',
      hint: 'For example, if the child is heavily congested on the day of the vaccination'
    },
    invalid: {
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
        [ReplyRefusal.AlreadyVaccinated]:
          'Where did the child get their vaccination?',
        [ReplyRefusal.GettingElsewhere]:
          'Where will the child get their vaccination?',
        [ReplyRefusal.Medical]:
          'What medical reasons prevent the child from being vaccinated?'
      }
    },
    note: {
      title: 'Notes',
      label: 'Notes'
    },
    outcome: {
      title: 'Update consent response'
    },
    confirmed: {
      label: 'Confirm consent refusal?'
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
    patients: {
      label: 'Children',
      title: 'Children'
    },
    sessions: {
      label: 'Sessions',
      title: 'Sessions',
      isActive: 'Session in progress',
      isPlanned: 'Scheduled sessions',
      isCompleted: 'Completed sessions'
    },
    results:
      '{count, plural, =0 {No schools matching your search criteria were found} one{Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> record} other{Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> schools}}',
    count:
      '{count, plural, =0 {no {phase} school} one {# no {phase} schools} other{# {phase} schools}}',
    search: {
      label: 'Find school'
    },
    name: {
      label: 'Name',
      title: 'School name'
    },
    phase: {
      label: 'Phase',
      title: 'Phase of education'
    },
    sen: {
      label: 'SEN school',
      title: 'Is this a special educational needs (SEN) school?'
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
    advanced: 'Advanced filters',
    initial:
      'Search for a child or use filters to see children matching your selection',
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
    search: {
      label: 'Find session'
    },
    show: {
      label: 'Overview'
    },
    new: {
      label: 'Add a new session',
      'check-answers': {
        confirm: 'Add session',
        title: 'Check and confirm'
      },
      success: '{{session.name}} created'
    },
    edit: {
      title: 'Edit session',
      success: '{{session.name}} updated'
    },
    academicYear: {
      label: 'Academic year'
    },
    report: {
      label: 'Children in session',
      title: 'Children in session'
    },
    consent: {
      label: 'Consent',
      title: 'Review consent responses'
    },
    screen: {
      label: 'Triage',
      title: 'Review triage statuses'
    },
    instruct: {
      label: 'PSDs',
      title: 'Review PSDs',
      description:
        'There are %s children with consent for the nasal flu vaccine who do not require triage and do not yet have a PSD in place.'
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
    delegation: {
      title: 'Delegation'
    },
    nationalProtocol: {
      label: 'Use national protocol',
      title:
        'Can healthcare assistants administer the injected flu vaccine using the national protocol?',
      yes: {
        label: 'Yes',
        hint: 'Healthcare assistants can administer an injected flu vaccine when supplied by a nurse'
      },
      no: {
        label: 'No',
        hint: 'Only nurses can administer the injected flu vaccine'
      }
    },
    psdProtocol: {
      label: 'Use patient specific direction (PSD)',
      title:
        'Can healthcare assistants administer the flu nasal spray vaccine using a patient specific direction (PSD)?',
      yes: {
        label: 'Yes',
        hint: 'Healthcare assistants can administer the nasal spray vaccine to children who are covered by a PSD'
      },
      no: {
        label: 'No',
        hint: 'Healthcare assistants can only administer a nasal spray when supplied by a nurse'
      }
    },
    'upload-class-list': {
      title: 'Import class lists'
    },
    list: {
      label: 'Sessions',
      title: 'Sessions',
      description:
        'Review consent responses, triage health questions and record vaccinations'
    },
    instructions: {
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
        '{{parents}} parents out of {{patients}} have not responded yet',
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
      label: 'Children',
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
      instruct: {
        label: 'PSD review needed',
        count:
          '{count, plural, =0 {No children} one {# child} other {# children}} need PSD review'
      },
      register: {
        label: 'Registration needed',
        count:
          '{count, plural, =0 {No children} one {# child} other {# children}} to register'
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
      }
    },
    date: {
      label: 'Session date',
      title: 'When will this session be held?',
      hint: 'For example, 27 3 2026',
      check: {
        title: 'Have you imported historical vaccination records for %s?',
        description:
          '1% of children in {{yearGroups}} in this session have vaccination records. This is unusually low coverage for catch-up year groups.\n\nCheck and confirm that vaccination records have been imported for all children in this school before you continue.\n\nScheduling this session now will send consent requests to 40 parents of children in {{yearGroups}} on {{date}}. Many of them may be parents of already vaccinated children.',
        confirm: 'Keep session dates',
        cancel: 'Remove session dates'
      }
    },
    school: {
      label: 'School',
      title: 'Where is this school session taking place?'
    },
    school_id: {
      label: 'School URN',
      title: 'Select a school'
    },
    yearGroups: {
      label: 'Year groups',
      title: 'Which year groups do you want to invite to this session?'
    },
    clinic: {
      label: 'Clinic',
      title: 'Where is this community clinic taking place?'
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
    openAt: {
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
    registration: {
      title:
        'Do you want to register children’s attendance before recording vaccinations?',
      label: 'Register attendance'
    },
    offline: {
      title: 'Record offline',
      description:
        'If the internet connection at the vaccination session is unreliable, you can record offline using a spreadsheet.\n\nYou need to download the blank spreadsheet ahead of the session while you still have internet access.\n\nTo upload a completed spreadsheet, go to the ‘Vaccinations’ area. You also need an internet connection to upload the spreadsheet.',
      confirm: 'Download spreadsheet',
      vaccinator: {
        label: 'Vaccinator',
        firstName: 'First name',
        lastName: 'Last name'
      }
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
    }
  },
  texts: {
    consent: {
      invite: {
        label: 'Invitation',
        name: 'Inviting parent to give or refuse consent',
        text: 'Give or refuse consent for {{consent.child.fullName}} to have their {{session.vaccinationNames.sentenceCase}}:\n\n[https://give-or-refuse-consent.nhs.uk/{{session.id}}]({{session.consentUrl}}/start)\n\nYou need to do this by {{session.formatted.openAt}}.\n\nResponding will take less than 5 minutes.'
      },
      'invite-clinic': {
        label: 'Clinic booking',
        name: 'Inviting parent to book a clinic appointment',
        text: 'Our records show that {{consent.child.fullAndPreferredNames}} has not been vaccinated against {{session.programmeNames.sentenceCase}}.\n\nTo book this vaccination in a clinic, go to https://www.swiftqueue.co.uk/userlogin.php\n\nYou’ll need to register for a Swiftqueue account first.'
      },
      'invite-clinic-reminder': {
        label: 'Clinic booking reminder',
        name: 'Reminding parent to book a clinic appointment',
        text: "It’s not too late for {{consent.child.fullAndPreferredNames}} to get their {{session.vaccinationNames.sentenceCase}}.\n\nBook a clinic slot by going to https://www.swiftqueue.co.uk/userlogin.php\n\nYou'll need to register for a Swiftqueue account first."
      },
      'invite-clinic-consent': {
        label: 'Clinic invitation',
        name: 'Inviting parent to give consent for a clinic appointment',
        text: 'You recently booked a clinic appointment for {{consent.child.fullAndPreferredNames}}.\n\nPlease give consent for them to get the {{session.vaccinationNames.sentenceCase}} by going to https://give-or-refuse-consent.nhs.uk/{{session.id}}.'
      },
      'invite-reminder': {
        label: 'Reminder',
        name: 'Reminding parent to give or refuse consent',
        text: 'We recently asked for your consent to vaccinate your child against {{session.programmeNames.sentenceCase}}.\n\nGo to [https://give-or-refuse-consent.nhs.uk/{{session.id}}]({{session.consentUrl}}/start) to submit a response. This will take less than 5 minutes.'
      },
      'consent-already-vaccinated': {
        label: 'Already vaccinated',
        name: 'Confirmation that vaccination has already been given',
        text: 'You’ve told us that {{consent.child.firstName}} has had both doses of the MMR vaccine.\n\nWe’ll update our records so you no longer get consent requests for MMR catch-up vaccinations.'
      },
      'consent-given': {
        label: 'Consent given',
        name: 'Confirmation that consent has been given',
        text: 'You’ve given consent for {{consent.child.firstName}} to get their {{session.vaccinationNames.sentenceCase}} at school on {{session.formatted.nextDate}}. Please let them know what to expect.\n\nIf anything changes, phone {{team.tel}}.'
      },
      'consent-given-child': {
        label: 'Consent given (child)',
        name: 'Confirmation that consent has been given',
        text: 'Your parent or guardian has agreed for you to have the {{session.vaccinationNames.sentenceCase}} at school on {{session.formatted.nextDate}}.'
      },
      'consent-refused': {
        label: 'Consent refused',
        name: 'Confirmation that consent has been refused',
        text: 'You’ve refused to give consent for {{consent.child.fullName}} to have their {{session.vaccinationNames.sentenceCase}}.\n\nYou can give feedback about the ‘Give or refuse consent’ service by completing our short survey:\n\n<https://feedback.digital.nhs.uk/jfe/form/SV_3fICo6frMvUZX1k>\n\nYour feedback will help us improve the service.'
      },
      'record-reminder': {
        label: 'Reminder',
        name: 'Reminder (to go out the day before the vaccination)',
        text: '{{consent.child.firstName}} will get their {{session.vaccinationNames.sentenceCase}} at school tomorrow ({{session.formatted.nextDate}}). Please make sure they have breakfast and encourage them to wear a short-sleeved shirt.'
      },
      'record-reminder-child': {
        label: 'Reminder (child)',
        name: 'Reminder (to go out the day before the vaccination)',
        text: 'You’re due to get your {{session.vaccinationNames.sentenceCase}} at school tomorrow ({{session.formatted.nextDate}}). Please wear a short-sleeved shirt and make sure you eat something before the session.'
      },
      'record-vaccinated': {
        label: 'Vaccinated',
        name: 'Child has been vaccinated',
        text: '{{consent.child.firstName}} had their {{session.vaccinationNames.sentenceCase}} at school today. They might have some side effects, including bruising or itching at the injection site, a high temperature, nausea, or pain in the arms, hands, or fingers.\n\nIf you’re concerned, contact your GP in the usual way.'
      },
      'record-could-not-vaccinate': {
        label: 'Could not vaccinate',
        name: 'Child did not get their vaccination despite having consent',
        text: '{{consent.child.firstName}} did not have their {{session.vaccinationNames.sentenceCase}} at school today. This was because {{reason}}.\n\nIf you’d still like them to be vaccinated on a different date, contact our team by calling [{{team.tel}}](#), or email [{{team.email}}](#).'
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
      defaults: 'Session defaults',
      password: 'Shared password',
      text: 'You can change these values when scheduling new sessions.'
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
    sessionRegistration: {
      title:
        'Do you want to register children’s attendance before recording vaccinations?',
      label: 'Register attendance'
    },
    password: {
      label: 'Shared password',
      title: 'Shared password',
      hint: 'Use this password to unlock offline vaccination spreadsheets. Don’t share it with anyone outside your team.'
    }
  },
  triage: {
    title: 'Triage',
    label: 'Is it safe to vaccinate {{patient.firstName}}?',
    confirm: 'Save triage',
    edit: {
      title: 'Update triage outcome',
      success: 'Triage outcome updated'
    },
    outcomeAt: {
      label: 'Delayed until',
      title:
        'What is the earliest date {{patient.firstName}} can be vaccinated?',
      hint: 'For example, {{date}}'
    },
    note: {
      label: 'Triage notes'
    },
    outcome: {
      label: 'Outcome',
      [ScreenOutcome.Vaccinate]: 'Yes, it’s safe to vaccinate',
      [ScreenOutcome.VaccinateAlternativeFluInjectionOnly]:
        'Yes, it’s safe to vaccinate with injected vaccine',
      [ScreenOutcome.VaccinateAlternativeMMRInjectionOnly]:
        'Yes, it’s safe to vaccinate with gelatine-free vaccine',
      [ScreenOutcome.VaccinateIntranasalOnly]:
        'Yes, it’s safe to vaccinate with nasal spray',
      [ScreenOutcome.DoNotVaccinate]: 'No, do not vaccinate',
      [ScreenOutcome.InviteToClinic]: 'No, invite to clinic',
      [ScreenOutcome.DelayVaccination]: 'No, delay vaccination',
      [ScreenOutcome.NeedsTriage]: 'No, keep in triage'
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
      cancel: 'No, return to import',
      confirm: 'Yes, %s'
    },
    delete: {
      label: 'Delete upload',
      confirm: 'Cancel and delete upload',
      success: 'Upload deleted'
    },
    approve: {
      confirm: 'Approve and import records',
      success: 'Upload approved'
    },
    list: {
      label: 'Imports',
      title: 'Imports',
      description:
        'Import child, cohort and vaccination records and see important notices',
      introduction:
        'Use this page to upload and import child, class list and vaccination records.\n\nUpload times can vary. Refresh the page to see the latest status.'
    },
    search: {
      label: 'Find upload'
    },
    results:
      '{count, plural, =0 {No imports matching your search criteria were found} one {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> import} other {Showing <b>{from}</b> to <b>{to}</b> of <b>{count}</b> imports}}',
    recent: {
      label: 'Uploaded files',
      title: 'Uploaded files',
      count:
        '{count, plural, =0 {No uploaded files} one {1 uploaded file} other {# uploaded files}} ({needsReview, plural, =0 {none need} one {1 needs} other {# need}} review)'
    },
    imported: {
      label: 'Completed imports',
      title: 'Completed imports',
      count:
        '{count, plural, =0 {No completed imports} one {1 completed import} other {# completed imports}}'
    },
    show: {
      title: 'Upload ({{upload.formatted.createdAt}})',
      needsReviewTitle:
        'Review and approve upload ({{upload.formatted.createdAt}})',
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
          [UploadStatus.Approved]: 'Upload issues resolved for this import'
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
            '{count, plural, =0 {No records} one {1 import issue} other {# import issues}} reviewed'
        }
      },
      matched: {
        title: 'Records already in Mavis',
        count:
          '{count, plural, =0 {No records} one {1 record} other {# records}} already in Mavis',
        summary:
          'This upload includes {count, plural, =0 {no records that already exist} one {1 record that already exists} other {# records that already exist}} in Mavis. You do not need to remove these from your CSV file. If you approve the upload, any new information will be added to the existing records.'
      },
      imported: {
        title: 'Imported records',
        count:
          '{count, plural, =0 {No imported records} one {1 imported record} other {# imported records}}'
      },
      moves: {
        title: {
          [UploadStatus.Review]: 'School moves – need review',
          [UploadStatus.Approved]: 'School moves resolved for this import'
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
    file: {
      title: 'Import {{type}}',
      label: 'Upload file',
      description: {
        report:
          'You can import vaccination records by uploading:\n\n- a Mavis CSV file\n- a SystmOne file',
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
        'If there is a problem in the class list import, you can bulk remove relationships between parents and children.',
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
      title: 'Which year groups do you want to import class list records for?'
    },
    invalid: {
      title: 'Records could not be imported',
      description:
        'The records could not be imported due to errors in the CSV file. When fixing these errors, note that the header does not count as a row.'
    },
    devoid: {
      title: 'No new records',
      description: 'All records in this upload have already been imported'
    },
    failed: {
      title: 'Too many records could not be matched',
      description:
        'The records could not be imported as an unusually low number of records were matched to PDS (spine). PDS successfully matched only 60 records, a 10% match rate.\n\nReview your file and try uploading it again.',
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
      description: 'Review children who have moved schools',
      introduction:
        'When imported records or a new consent response indicates that a child has changed school, Mavis flags this as a school move.\n\nYou can then review the new information and confirm the school move or ignore it.'
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
      label: 'Download records'
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
      summary: 'Vaccination details'
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
        ttcv: 'Record a previous vaccination'
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
    createdAt: {
      label: 'Vaccination date',
      title:
        'When was the {{session.programmeNames.sentenceCase}} vaccination given?'
    },
    createdAt_date: {
      label: 'Date',
      hint: 'For example, 27 10 2025'
    },
    createdAt_time: {
      label: 'Time',
      hint: 'For example, 13 15'
    },
    reportedAt: {
      label: 'Reported on'
    },
    reportedBy: {
      label: 'Reported by'
    },
    age: {
      label: 'Age'
    },
    variant: {
      label: 'Programme variant',
      title: 'Was {{patient.firstName}} vaccinated with the MMRV vaccine?',
      hint: '{{patient.firstName}} is eligible for the new MMRV vaccine, but may have got the  MMR vaccine instead.'
    },
    syncStatus: {
      label: 'Synced with NHS England?'
    },
    createdBy: {
      label: 'Vaccinator',
      title: 'Who was the vaccinator?'
    },
    suppliedBy: {
      label: 'Supplier',
      title:
        'Which nurse identified and pre-screened the child and supplied vaccine?'
    },
    updatedAt: {
      label: 'Record updated'
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
    selfId: {
      true: 'The child',
      false: 'Somebody else'
    },
    identifiedBy: {
      title: 'Who confirmed {{patient.firstName}}’s identity?',
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
    ttcv: {
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
    vaccine_snomed: {
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
        label: 'Previously imported record',
        record: 'Previously imported child record',
        vaccination: 'Previously imported vaccination record'
      },
      decision: {
        label: 'Which record do you want to keep?',
        duplicate: {
          label: 'Use duplicate record',
          hint: 'The duplicate record will replace the previously imported record.'
        },
        original: {
          label: 'Keep previously imported record',
          hint: 'The previously imported record will be kept and the duplicate record will be discarded.'
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
