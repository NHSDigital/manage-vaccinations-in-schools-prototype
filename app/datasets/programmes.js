import { ProgrammeType } from '../enums.js'

export default {
  [ProgrammeType.Other]: {
    type: ProgrammeType.Other,
    id: 'other',
    name: 'A programme administered outside the UK',
    title: 'A programme administered outside the UK',
    hidden: true,
    ttcv: true,
    sequence: ['1P'],
    sequenceDefault: '1P'
  },
  [ProgrammeType._4in1]: {
    type: ProgrammeType._4in1,
    id: '4in1',
    name: '4-in-1',
    title: '4-in-1 pre-school booster',
    hidden: true,
    ttcv: true,
    sequence: ['1P', '2P', '3P'],
    sequenceDefault: '1P'
  },
  [ProgrammeType._5in1]: {
    type: ProgrammeType._5in1,
    id: '5in1',
    name: '5-in-1',
    title: '5-in-1',
    hidden: true,
    ttcv: true,
    sequence: ['1B'],
    sequenceDefault: '1B'
  },
  [ProgrammeType._6in1]: {
    type: ProgrammeType._6in1,
    id: '6in1',
    name: '6-in-1',
    title: '6-in-1',
    hidden: true,
    ttcv: true,
    sequence: ['1P', '2P', '3P', '4P'],
    sequenceDefault: '1P'
  },
  [ProgrammeType.Flu]: {
    type: ProgrammeType.Flu,
    id: 'flu',
    name: 'Flu',
    title: 'Children’s flu',
    information: {
      startPage:
        'Use this service to give or refuse consent for your child to have a flu vaccination.\n\nThis vaccination is recommended for school age children every year.\n\n## About the children’s flu vaccine\n\nThe children’s flu vaccine helps protect children against flu. Vaccinating children also protects others who are vulnerable to flu, such as babies and older people.\n\nThe vaccine is given as a nasal spray. This gives the most effective protection.\n\nSome children can have an injection instead, for example if they:\n\n- have had a serious allergic reaction to a previous dose of the nasal spray vaccine\n- have a severe egg allergy\n- have asthma that’s being treated with long-term steroid tablets\n- do not use gelatine or other animal products',
      description:
        'The vaccine protects against flu, which can cause serious health problems such as bronchitis and pneumonia. It is recommended for children from Reception to Year 11 every year.',
      url: 'https://www.nhs.uk/vaccinations/child-flu-vaccine/'
    },
    guidance: {
      url: 'https://www.gov.uk/government/publications/flu-vaccination-leaflets-and-posters',
      hint: 'including in other languages and alternative formats, including BSL and Braille'
    },
    sequence: ['1P'],
    immunocompromisedSequence: ['1P', '2P'],
    sequenceDefault: '1P',
    yearGroups: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    vaccine_snomeds: ['43208811000001106', '40085011000001101'],
    nhseSyncable: true
  },
  [ProgrammeType.HPV]: {
    type: ProgrammeType.HPV,
    id: 'hpv',
    name: 'HPV',
    title: 'Human papillomavirus (HPV)',
    information: {
      startPage:
        'The HPV vaccine helps to prevent HPV related cancers from developing in boys and girls.\n\nThe number of doses you need depends on your age and how well your immune system works. Young people usually only need 1 dose.',
      description:
        'The HPV vaccine helps protect boys and girls against cancers caused by HPV, including:\n- cervical cancer\n- some mouth and throat (head and neck) cancers\n- some cancers of the anal and genital areas\n\nThe HPV vaccine has been given to girls since 2008. Following its success at helping prevent cervical cancers, it was introduced to boys in 2019 to help prevent HPV-related cancers that affect them.\n\nYoung people usually only need 1 dose.',
      url: 'https://www.nhs.uk/conditions/vaccinations/hpv-human-papillomavirus-vaccine/'
    },
    guidance: {
      url: 'https://www.gov.uk/government/publications/hpv-vaccine-vaccination-guide-leaflet',
      hint: 'including in other languages and alternative formats, including BSL and Braille'
    },
    sequence: ['1P'],
    immunocompromisedSequence: ['1P', '2P', '3P'],
    sequenceDefault: '1P',
    targetYearGroup: 8,
    yearGroups: [8, 9, 10, 11],
    vaccine_snomeds: ['33493111000001108'],
    nhseSyncable: true
  },
  [ProgrammeType.MenACWY]: {
    type: ProgrammeType.MenACWY,
    id: 'menacwy',
    name: 'MenACWY',
    title: 'MenACWY',
    information: {
      startPage:
        'The MenACWY vaccine helps protect against meningitis and sepsis. It is recommended for all teenagers. Most people only need one dose of the vaccine.',
      description:
        'The MenACWY vaccine helps protect against life-threatening illnesses including meningitis, sepsis and septicaemia (blood poisoning).\n\nIt is recommended for all teenagers. Most people only need 1 dose of the vaccine.',
      url: 'https://www.nhs.uk/vaccinations/menacwy-vaccine/'
    },
    guidance: {
      url: 'https://www.gov.uk/government/publications/menacwy-vaccine-information-for-young-people',
      hint: 'with links to information in other languages'
    },
    sequence: ['1P'],
    sequenceDefault: '1P',
    targetYearGroup: 9,
    yearGroups: [9, 10, 11],
    vaccine_snomeds: ['39779611000001104'],
    nhseSyncable: false
  },
  [ProgrammeType.MMR]: {
    type: ProgrammeType.MMR,
    id: 'mmr',
    name: 'MMR',
    title: 'Measles, mumps and rubella (MMR)',
    emailNames: {
      default: 'MMR catch-up',
      invite: 'MMR (measles, mumps and rubella) catch-up'
    },
    information: {
      startPage:
        'The MMR vaccine protects against measles, mumps and rubella. Having 2 doses gives lasting protection against all 3 illnesses. If you’re not sure how many doses your child has had, having further doses will not cause any harm. If your child has had 2 doses, please confirm this using the consent request form.\n\nResearch has shown there is no link between the MMR vaccine and autism.',
      description:
        'The MMR vaccine protects against measles, mumps and rubella. Having 2 doses gives lasting protection against all 3 illnesses. If you’re not sure how many doses your child has had, having further doses will not cause any harm.\n\nResearch has shown there is no link between the MMR vaccine and autism.',
      url: 'https://www.nhs.uk/vaccinations/mmr-vaccine/'
    },
    guidance: {
      url: 'https://www.gov.uk/government/publications/mmr-for-all-general-leaflet',
      hint: 'including in other languages'
    },
    sequence: ['1P', '2P'],
    sequenceDefault: '1P',
    targetYearGroup: -3,
    yearGroups: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    vaccine_snomeds: ['13968211000001108', '34925111000001104'],
    nhseSyncable: true
  },
  [ProgrammeType.TdIPV]: {
    type: ProgrammeType.TdIPV,
    id: 'td-ipv',
    name: 'Td/IPV',
    title: 'Td/IPV (3-in-1 teenage booster)',
    information: {
      startPage:
        'The Td/IPV vaccine (also called the 3-in-1 teenage booster) helps protect against tetanus, diphtheria and polio.\n\nIt boosts the protection provided by the [6-in-1 vaccine](https://www.nhs.uk/vaccinations/6-in-1-vaccine/) and [4-in-1 pre-school booster vaccine](https://www.nhs.uk/vaccinations/4-in-1-preschool-booster-vaccine/).',
      description:
        'The Td/IPV vaccine (also called the 3-in-1 teenage booster) helps protect against tetanus, diphtheria and polio.\n\nIt’s offered at around 13 or 14 years old (school year 9 or 10). It boosts the protection provided by the [6-in-1 vaccine](https://www.nhs.uk/vaccinations/6-in-1-vaccine/) and [4-in-1 pre-school booster vaccine](https://www.nhs.uk/vaccinations/4-in-1-preschool-booster-vaccine/).',
      url: 'https://www.nhs.uk/vaccinations/td-ipv-vaccine-3-in-1-teenage-booster/'
    },
    guidance: {
      url: 'https://www.gov.uk/government/publications/a-guide-to-the-3-in-1-teenage-booster-tdipv',
      hint: 'with links to information in other languages'
    },
    sequence: ['2B'],
    sequenceDefault: '2B',
    yearGroups: [9, 10, 11],
    targetYearGroup: 9,
    vaccine_snomeds: ['7374311000001101'],
    ttcv: true,
    nhseSyncable: false
  }
}
