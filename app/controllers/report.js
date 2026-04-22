import { Programme, Vaccination } from '../models.js'
import { formatYearGroup } from '../utils/string.js'

export const reportController = {
  readAll(request, response, next) {
    const { gender, yearGroup } = request.query
    const programme_id = request.query.programme_id || 'flu'
    const { data } = request.session

    const programmes = Programme.findAll(data)
      ?.filter((programme) => !programme.hidden)
      .sort((a, b) => a.name.localeCompare(b.name))

    let vaccinations = Vaccination.findAll(data) || []

    // Convert year groups query into an array of numbers
    let yearGroups
    if (yearGroup) {
      yearGroups = Array.isArray(yearGroup) ? yearGroup : [yearGroup]
      yearGroups = yearGroups.map((year) => Number(year))
    }

    // Convert gender query into an array of strings
    let genders
    if (gender) {
      genders = Array.isArray(gender) ? gender : [gender]
      genders = genders.map((gender) => String(gender))
    }

    // Filter by programme
    vaccinations = vaccinations.filter(
      (vaccination) => vaccination.programme_id === programme_id
    )

    // Filter by gender
    if (gender) {
      vaccinations = vaccinations.filter((vaccination) =>
        genders.some((gender) => vaccination.patient?.gender === gender)
      )
    }

    // Filter by year group
    if (yearGroup) {
      vaccinations = vaccinations.filter((vaccination) =>
        yearGroups.some(
          (yearGroup) => vaccination.patient?.yearGroup === yearGroup
        )
      )
    }

    response.locals.vaccinations = vaccinations

    // Programme filter options
    response.locals.programmeItems = programmes.map((programme) => ({
      text: programme.name,
      value: programme.id,
      checked: programme_id === programme.id
    }))

    // Year group filter options
    response.locals.yearGroupItems = [...Array(14).keys()].map((yearGroup) => ({
      text: formatYearGroup(yearGroup),
      value: yearGroup,
      checked: yearGroups?.includes(yearGroup) ?? false
    }))

    // Clean up session data
    delete data.gender
    delete data.programme_id
    delete data.yearGroup

    next()
  },

  show(request, response) {
    const view = request.params.view || 'vaccinations'

    response.render(`report/${view}`)
  },

  list(request, response) {
    response.redirect('/reports/vaccinations')
  },

  filterList(request, response) {
    const view = request.params.view || 'vaccinations'

    const params = new URLSearchParams()

    // Radios and text inputs
    for (const key of ['programme_id']) {
      const value = request.body[key]
      if (value) {
        params.append(key, String(value))
      }
    }

    // Checkboxes
    for (const key of ['gender', 'yearGroup']) {
      const value = request.body[key]
      const values = Array.isArray(value) ? value : [value]
      if (value) {
        values
          .filter((item) => item !== '_unchecked')
          .forEach((value) => {
            params.append(key, String(value))
          })
      }
    }

    response.redirect(`/reports/${view}?${params}`)
  }
}
