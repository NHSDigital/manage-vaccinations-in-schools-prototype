import { TeamType } from '../enums.js'

export default [
  {
    id: '001',
    type: TeamType.SAIS,
    ods: 'RYG',
    name: 'Coventry and Warwickshire Partnership NHS Trust',
    email: 'Bewise.Immunise@covwarkpt.nhs.uk',
    tel: '024 7696 1422',
    privacyPolicyUrl: 'https://www.covwarkpt.nhs.uk/download.cfm?ver=8286'
  },
  {
    id: '002',
    type: TeamType.ICB,
    ods: 'QWU',
    name: 'NHS Coventry and Warwickshire Integrated Care Board',
    email: 'cwicb.communications@nhs.net ',
    tel: '024 7655 3344'
  },
  {
    id: '003',
    type: TeamType.School,
    name: 'Grace Academy Coventry',
    email: 'coventry@graceacademy.org.uk',
    tel: '02476 589 000',
    school_ids: ['135335']
  }
]
