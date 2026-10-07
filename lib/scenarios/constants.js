/**
 * IDs reserved for scenario data, so it can never collide with the randomised data
 * `create-data.js` generates elsewhere, and is easy to recognise in `.data/*.json`.
 *
 * Mirrors the existing reserved school URNs (888888, 999999) used for "Unknown school" and
 * "Home-educated" in `app/datasets/schools.js`.
 */
export const ScenarioSchoolUrns = {
  FluPrimarySchool: '777777',
  HpvSecondarySchool: '777778',
  DoublesSecondarySchool: '777779'
}
