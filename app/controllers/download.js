import programmesData from '../datasets/programmes.js'
import { AcademicYear, DownloadFormat, ProgrammeType } from '../enums.js'
import { Download, Programme, Team } from '../models.js'
import { getDateValueDifference } from '../utils/date.js'
import { getResults, getPagination } from '../utils/pagination.js'

export const downloadController = {
  read(request, response, next, download_id) {
    response.locals.download = Download.findOne(
      download_id,
      request.session.data
    )

    next()
  },

  readAll(request, response, next) {
    response.locals.downloads = Download.findAll(request.session.data)

    next()
  },

  list(request, response) {
    const { type } = request.query
    const { data } = request.session
    const { downloads } = response.locals

    let results = downloads

    // Filter by type
    if (type && type !== 'none') {
      results = results.filter((download) => download.type === type)
    }

    // Sort
    results = results.sort((a, b) =>
      getDateValueDifference(b.createdAt, a.createdAt)
    )

    // Results
    response.locals.results = getResults(results, request.query, 40)
    response.locals.pages = getPagination(results, request.query, 40)

    // Clean up session data
    delete data.type

    response.render(`download/list`)
  },

  filterList(request, response) {
    const params = new URLSearchParams()

    // Radios and text inputs
    for (const key of ['type']) {
      const value = request.body[key]
      if (value) {
        params.append(key, String(value))
      }
    }

    response.redirect(`/downloads?${params}`)
  },

  form(request, response) {
    const { data } = request.session

    const academicYearKeys = Object.keys(AcademicYear)
    const mostRecentYear = academicYearKeys[academicYearKeys.length - 1]

    response.locals.academicYearItems = Object.entries(AcademicYear).map(
      ([value, text]) => ({
        text,
        value,
        checked: value === mostRecentYear
      })
    )

    response.locals.programmeTypeItems = Object.entries(ProgrammeType).map(
      ([value, text]) => ({
        text,
        value,
        checked: value === ProgrammeType.Flu
      })
    )

    response.locals.download = {
      format: DownloadFormat.CSV
    }

    response.locals.teamItems = Team.findAll(data).map((team) => ({
      text: team.name,
      value: team.id
    }))

    response.locals.paths = {
      back: '/reports',
      next: '/reports/download/new'
    }

    response.render('download/form')
  },

  create(request, response) {
    const { account } = request.app.locals
    const { data } = request.session

    const { programmeType } = request.body.download
    const programme_id = programmesData[programmeType].id
    const programme = Programme.findOne(programme_id, data)

    const createdDownload = Download.create(
      {
        ...request.body.download,
        programme_id,
        vaccination_uuids: programme.vaccinations.map(({ uuid }) => uuid),
        createdBy_uid: account.uid
      },
      data
    )

    const download = new Download(createdDownload, data)

    // Generate and return file
    const { buffer, fileName, mimetype } = download.createFile(data)

    response.header('Content-Type', mimetype)
    response.header('Content-disposition', `attachment; filename=${fileName}`)

    response.end(buffer)
  },

  download(request, response) {
    const { data } = request.session
    const { download } = response.locals

    // Generate and return file
    const { buffer, fileName, mimetype } = download.createFile(data)

    response.header('Content-Type', mimetype)
    response.header('Content-disposition', `attachment; filename=${fileName}`)

    response.end(buffer)
  }
}
