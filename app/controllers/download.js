import programmesData from '../datasets/programmes.js'
import { AcademicYear, DownloadFormat, ProgrammeType } from '../enums.js'
import { Download, Programme, Team } from '../models.js'

export const downloadController = {
  list(request, response) {
    response.render(`download/list`)
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

    const { type } = request.body.download
    const programme_id = programmesData[type].id
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
  }
}
