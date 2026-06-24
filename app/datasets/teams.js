import clinics from './clinics.js'

export default [
  {
    id: '001',
    ods: 'RYG',
    name: 'Coventry and Warwickshire Partnership NHS Trust',
    email: 'enquiries@covwarkpt.nhs.uk',
    tel: '024 7636 2100',
    privacyPolicyUrl: 'https://www.covwarkpt.nhs.uk/download.cfm?ver=8286',
    clinic_ids: Object.values(clinics)
      .filter((clinic) => clinic.team_id == '001')
      .map((clinic) => clinic.id)
  },
  {
    id: '002',
    ods: 'QWU',
    name: 'NHS Coventry and Warwickshire Integrated Care Board',
    email: 'cwicb.communications@nhs.net ',
    tel: '024 7655 3344'
  }
]
