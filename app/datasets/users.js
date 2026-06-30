import { UserRole } from '../enums.js'

export default [
  {
    uid: '000000000001',
    firstName: 'Jane',
    lastName: 'Joy',
    email: 'jane.joy@covwarkpt.nhs.example',
    role: UserRole.Nurse,
    team_id: '001'
  },
  {
    uid: '000000000002',
    firstName: 'Millie',
    lastName: 'Morris',
    email: 'millie.morris@covwarkpt.nhs.example',
    role: UserRole.NursePrescriber,
    team_id: '001'
  },
  {
    uid: '000000000003',
    firstName: 'Becky',
    lastName: 'Black',
    email: 'becky.black@covwarkpt.nhs.example',
    role: UserRole.Pharmacist,
    team_id: '001'
  },
  {
    uid: '000000000005',
    firstName: 'Rachel',
    lastName: 'Richards',
    email: 'rachel.richards@covwarkpt.nhs.example',
    role: UserRole.HCA,
    team_id: '001'
  },
  {
    uid: '000000000005',
    firstName: 'Samantha',
    lastName: 'Smith',
    email: 'samantha.smith@covwarkpt.nhs.example',
    role: UserRole.MedicalSecretary,
    team_id: '001'
  },
  {
    uid: '000000000006',
    firstName: 'Agatha',
    lastName: 'Andrews',
    email: 'agatha.andrews@cwicb.nhs.example',
    role: UserRole.DataConsumer,
    team_id: '002'
  }
]
