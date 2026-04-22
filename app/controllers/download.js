import wizard from '@x-govuk/govuk-prototype-wizard'

import { AcademicYear, DownloadType } from '../enums.js'
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

  new(type) {
    return (request, response) => {
      const { account } = request.app.locals
      const { data } = request.session

      const download = Download.create(
        { createdBy_uid: account.uid },
        data.wizard
      )

      if (type) {
        download.type = type
        response.redirect(`${download.uri}/new/moves`)
      } else {
        response.redirect(`${download.uri}/new/type`)
      }
    }
  },

  update(request, response) {
    const { download_id } = request.params
    const { data } = request.session
    const { __ } = response.locals

    const download = Download.create(data.wizard.downloads[download_id], data)

    // Clean up session data
    delete data.download
    delete data.wizard

    request.flash('message', __(`download.new.message`, { download }))

    response.redirect('/downloads')
  },

  readForm(request, response, next) {
    const { download_id } = request.params
    const { data, referrer } = request.session
    const { __ } = response.locals

    // Setup wizard if not already setup
    let download = Download.findOne(download_id, data.wizard)
    if (!download) {
      download = Download.create(response.locals.download, data.wizard)
    }

    const journey = {
      [`/`]: {},
      [`/${download_id}/new/type`]: {
        [`/${download_id}/new/cohort`]: {
          data: 'download.type',
          value: DownloadType.Cohort
        },
        [`/${download_id}/new/report`]: {
          data: 'download.type',
          value: DownloadType.Report
        },
        [`/${download_id}/new/moves`]: {
          data: 'download.type',
          value: DownloadType.Moves
        }
      }
    }

    // TODO: Use presenter
    download = new Download(download, data)
    response.locals.download = download

    const academicYearKeys = Object.keys(AcademicYear)
    const mostRecentYear = academicYearKeys[academicYearKeys.length - 1]

    response.locals.academicYearItems = Object.entries(AcademicYear).map(
      ([value, text]) => ({
        text,
        value,
        checked: value === mostRecentYear
      })
    )

    response.locals.programmeTypeItems = Programme.findAll(data)
      ?.filter((programme) => !programme.hidden)
      .map((programme) => ({
        text: programme.name,
        value: programme.type
      }))

    response.locals.teamItems = Team.findAll(data)?.map((team) => ({
      text: team.name,
      value: team.id
    }))

    response.locals.typeItems = Object.values(DownloadType)
      ?.filter((type) => type !== DownloadType.Session)
      .sort((a, b) => a.localeCompare(b))
      .map((type) => ({
        text: type,
        value: type,
        hint: {
          text: __(`download.type.hint.${type}`)
        }
      }))

    response.locals.paths = {
      ...wizard(journey, request),
      ...(referrer && { back: referrer })
    }

    next()
  },

  showForm(request, response) {
    const { view } = request.params

    response.render(`download/form/${view}`)
  },

  updateForm(request, response, next) {
    const { download_id } = request.params
    const { data } = request.session
    const { paths } = response.locals

    Download.update(download_id, request.body.download, data.wizard)

    return paths.next ? response.redirect(paths.next) : next()
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
