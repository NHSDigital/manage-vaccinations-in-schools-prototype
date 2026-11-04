/**
 * Subteams of SAIS teams
 *
 * `clinic_ids` and `school_ids` are only used when creating seed data, to
 * assign clinics and schools to a subteam (as `subteam_id`). Any clinics or
 * schools not listed here remain assigned to the parent team.
 */
export default [
  {
    id: 'S01',
    team_id: '001',
    name: 'Coventry School-Aged Immunisation Service',
    // Uses parent team’s contact details
    clinic_ids: ['M86014', 'M86017', 'M86035', 'M86046', 'Y00140'],
    school_ids: ['133556', '777778']
  },
  {
    id: 'S02',
    team_id: '001',
    name: 'North Warwickshire School-Aged Immunisation Service',
    email: 'NorthImms@covwarkpt.nhs.uk',
    tel: '024 7632 1550',
    clinic_ids: ['M84008', 'M84016'],
    school_ids: ['777777', '777779']
  },
  {
    id: 'S03',
    team_id: '001',
    name: 'South Warwickshire School-Aged Immunisation Service',
    email: 'SouthImms@covwarkpt.nhs.uk',
    tel: '01926 353899',
    clinic_ids: ['Y00060', 'Y00996'],
    school_ids: ['137272']
  }
]
