import {
  PreScreenQuestion,
  VaccineMethod,
  VaccinationProtocol,
  VaccineCriteria,
  VaccineSideEffect
} from '../enums.js'

export default {
  // Flu vaccines
  // https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1107978/Influenza-green-book-chapter19-16September22.pdf
  '43208811000001106': {
    snomed: '43208811000001106',
    type: 'Flu',
    brand: 'Fluenz Trivalent',
    manufacturer: 'AstraZeneca UK Ltd',
    leaflet: {
      url: 'https://www.medicines.org.uk/emc/files/pil.15790.pdf',
      size: '197KB'
    },
    criteria: VaccineCriteria.Intranasal,
    method: VaccineMethod.Intranasal,
    delegationProtocol: VaccinationProtocol.PSD,
    dose: 0.2,
    sideEffects: [
      VaccineSideEffect.BlockedNose,
      VaccineSideEffect.Headache,
      VaccineSideEffect.Tiredness,
      VaccineSideEffect.AppetiteLoss
    ],
    healthQuestions: {
      'asthma': {
        conditional: {
          'asthmaSteroids': {},
          'asthmaAdmitted': {}
        }
      },
      'immuneSystem': {},
      'immuneSystemCloseContact': {},
      'eggAllergy': {},
      'anaphylaxisNasalFlu': {},
      'aspirin': {},
      'recentFluVaccination': {}
    },
    preScreenQuestions: [
      PreScreenQuestion.IsWell,
      PreScreenQuestion.IsMedicated,
      PreScreenQuestion.IsAsthmatic,
      PreScreenQuestion.IsHappy,
      PreScreenQuestion.IsNotContraindicated
    ]
  },
  '40085011000001101': {
    snomed: '40085011000001101',
    type: 'Flu',
    brand: 'Cell-based Quadrivalent',
    manufacturer: 'Seqirus UK Limited',
    leaflet: {
      url: 'https://www.medicines.org.uk/emc/files/pil.12882.pdf',
      size: '174KB'
    },
    criteria: VaccineCriteria.AlternativeInjection,
    method: VaccineMethod.Injection,
    delegationProtocol: VaccinationProtocol.National,
    dose: 0.5,
    sideEffects: [
      VaccineSideEffect.PainSite,
      VaccineSideEffect.Headache,
      VaccineSideEffect.Dizzy,
      VaccineSideEffect.Sick,
      VaccineSideEffect.Rash,
      VaccineSideEffect.Irritable,
      VaccineSideEffect.Drowsy,
      VaccineSideEffect.AppetiteLoss,
      VaccineSideEffect.Temperature,
      VaccineSideEffect.Unwell
    ],
    healthQuestions: {
      'bleeding': {},
      'anaphylaxisInjectedFlu': {},
      'recentFluVaccination': {}
    },
    preScreenQuestions: [
      PreScreenQuestion.IsWell,
      PreScreenQuestion.IsMedicated,
      PreScreenQuestion.IsHappy,
      PreScreenQuestion.IsNotContraindicated
    ]
  },
  // HPV vaccines
  // Possible others: Gardasil, Cervarix
  // https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1065283/HPV-greenbook-chapter-18a.pdf
  '33493111000001108': {
    snomed: '33493111000001108',
    type: 'HPV',
    brand: 'Gardasil 9',
    manufacturer: 'Merck Sharp & Dohme (UK) Ltd',
    leaflet: {
      url: 'https://www.medicines.org.uk/emc/files/pil.7330.pdf',
      size: '110KB'
    },
    criteria: VaccineCriteria.Injection,
    method: VaccineMethod.Injection,
    delegationProtocol: VaccinationProtocol.PSD,
    dose: 0.5,
    sideEffects: [
      VaccineSideEffect.Bruising,
      VaccineSideEffect.TemperatureShiver,
      VaccineSideEffect.SickFeeling,
      VaccineSideEffect.PainArms
    ],
    healthQuestions: {
      'allergy': {},
      'bleeding': {},
      'bloodThinning': {},
      'immuneSystemHpv': {}
    },
    preScreenQuestions: [
      PreScreenQuestion.IsWell,
      PreScreenQuestion.IsPregnant,
      PreScreenQuestion.IsHappy,
      PreScreenQuestion.IsNotContraindicated
    ]
  },
  // 3-in-1 vaccines
  // Possible others: Pediacel, Repevax, Infanrix IPV
  // https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/147952/Green-Book-Chapter-15.pdf
  '7374311000001101': {
    snomed: '7374311000001101',
    type: 'TdIPV',
    brand: 'Revaxis',
    manufacturer: 'Sanofi',
    leaflet: {
      url: 'https://www.medicines.org.uk/emc/files/pil.5581.pdf',
      size: '2.64MB'
    },
    criteria: VaccineCriteria.Injection,
    method: VaccineMethod.Injection,
    delegationProtocol: VaccinationProtocol.PSD,
    dose: 0.5,
    sideEffects: [
      VaccineSideEffect.PainSite,
      VaccineSideEffect.Dizzy,
      VaccineSideEffect.SickFeeling,
      VaccineSideEffect.Temperature,
      VaccineSideEffect.Headache
    ],
    healthQuestions: {
      'bleeding': {},
      'allergy': {},
      'previousReaction': {},
      'recentTdIpvVaccination': {}
    },
    preScreenQuestions: [
      PreScreenQuestion.IsWell,
      PreScreenQuestion.IsPregnant,
      PreScreenQuestion.IsMedicated,
      PreScreenQuestion.IsHappy,
      PreScreenQuestion.IsNotContraindicated
    ]
  },
  // MenACWY vaccines
  // Possible others: Menveo, Nimenrix
  // https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/1076053/Meningococcal-greenbook-chapter-22_17May2022.pdf
  '39779611000001104': {
    snomed: '39779611000001104',
    type: 'MenACWY',
    brand: 'MenQuadfi',
    manufacturer: 'Sanofi',
    leaflet: {
      url: 'https://www.medicines.org.uk/emc/files/pil.12818.pdf',
      size: '177KB'
    },
    criteria: VaccineCriteria.Injection,
    method: VaccineMethod.Injection,
    delegationProtocol: VaccinationProtocol.PSD,
    dose: 0.5,
    sideEffects: [
      VaccineSideEffect.PainSite,
      VaccineSideEffect.Headache,
      VaccineSideEffect.SickFeeling,
      VaccineSideEffect.Rash,
      VaccineSideEffect.Irritable,
      VaccineSideEffect.Drowsy,
      VaccineSideEffect.AppetiteLoss,
      VaccineSideEffect.Unwell
    ],
    healthQuestions: {
      'bleeding': {},
      'allergy': {},
      'previousReaction': {},
      'recentMenAcwyVaccination': {}
    },
    preScreenQuestions: [
      PreScreenQuestion.IsWell,
      PreScreenQuestion.IsMedicated,
      PreScreenQuestion.IsHappy,
      PreScreenQuestion.IsNotContraindicated
    ]
  },
  // MMR vaccines
  '13968211000001108': {
    snomed: '13968211000001108',
    type: 'MMR',
    brand: 'M-M-RvaxPro',
    manufacturer: 'Merck Sharp & Dohme (UK) Ltd',
    leaflet: {
      url: 'https://www.medicines.org.uk/emc/files/pil.6307.pdf',
      size: '103KB'
    },
    criteria: VaccineCriteria.Injection,
    method: VaccineMethod.Injection,
    dose: 0.5,
    sideEffects: [
      VaccineSideEffect.Bruising,
      VaccineSideEffect.TemperatureShiver,
      VaccineSideEffect.SickFeeling,
      VaccineSideEffect.PainArms
    ],
    healthQuestions: {
      'bleeding': {},
      'bloodThinning': {},
      'bloodTransfusion': {},
      'previousReactionMmr': {},
      'previousReactionNeomycinGelatine': {},
      'immuneSystem': {},
      'immunisations': {}
    },
    preScreenQuestions: [
      PreScreenQuestion.IsWell,
      PreScreenQuestion.IsPregnant,
      PreScreenQuestion.IsHappy,
      PreScreenQuestion.IsNotContraindicated
    ]
  },
  '34925111000001104': {
    snomed: '34925111000001104',
    type: 'MMR',
    brand: 'Priorix',
    manufacturer: 'GlaxoSmithKline UK Ltd',
    leaflet: {
      url: 'https://www.medicines.org.uk/emc/files/pil.1159.pdf',
      size: '266KB'
    },
    criteria: VaccineCriteria.AlternativeInjection,
    method: VaccineMethod.Injection,
    dose: 0.5,
    sideEffects: [
      VaccineSideEffect.Bruising,
      VaccineSideEffect.TemperatureShiver,
      VaccineSideEffect.SickFeeling,
      VaccineSideEffect.PainArms
    ],
    healthQuestions: {
      'bleeding': {},
      'bloodThinning': {},
      'bloodTransfusion': {},
      'previousReactionMmr': {},
      'previousReactionNeomycinGelatine': {},
      'immuneSystem': {},
      'immunisations': {}
    },
    preScreenQuestions: [
      PreScreenQuestion.IsWell,
      PreScreenQuestion.IsPregnant,
      PreScreenQuestion.IsHappy,
      PreScreenQuestion.IsNotContraindicated
    ]
  },
  // MMRV (measles, mumps, rubella, varicella) — not used on the UK schedule.
  // Included only to simulate miscoded records surfacing in Mavis. SNOMED is
  // fabricated (99 prefix) since there is no real UK dm+d code to lean on.
  '99926011000001103': {
    snomed: '99926011000001103',
    type: 'MMRV',
    brand: 'ProQuad',
    manufacturer: 'Merck Sharp & Dohme (UK) Ltd',
    criteria: VaccineCriteria.Injection,
    method: VaccineMethod.Injection,
    dose: 0.5,
    sideEffects: [
      VaccineSideEffect.Bruising,
      VaccineSideEffect.TemperatureShiver,
      VaccineSideEffect.SickFeeling,
      VaccineSideEffect.PainArms
    ],
    healthQuestions: {
      'bleeding': {},
      'bloodThinning': {},
      'bloodTransfusion': {},
      'previousReactionMmr': {},
      'previousReactionNeomycinGelatine': {},
      'immuneSystem': {},
      'immunisations': {}
    },
    preScreenQuestions: [
      PreScreenQuestion.IsWell,
      PreScreenQuestion.IsPregnant,
      PreScreenQuestion.IsHappy,
      PreScreenQuestion.IsNotContraindicated
    ]
  }
}
