import wizard from '@x-govuk/govuk-prototype-wizard'

import { AcademicYear, DownloadFormat, DownloadType } from '../enums.js'
import { Download, Programme, Team } from '../models.js'
import { getDateValueDifference } from '../utils/date.js'
import { getResults, getPagination } from '../utils/pagination.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { getFilterParams } from '../utils/url.js'

export const downloadController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, download_id) {
    response.locals.download = Download.findOne(
      download_id,
      request.session.data
    )

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    response.locals.downloads = Download.findAll(request.session.data)

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
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

    return response.render(`download/list`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  filterList(request, response) {
    const params = getFilterParams(request, ['type'])

    return saveAndRedirect(request, response, `/downloads?${params}`)
  },

  /**
   * @param {string} [type] - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  new(type) {
    return (request, response) => {
      const { school_id, session_id } = request.params
      const { data } = request.session
      const { account } = response.locals

      const download = Download.create(
        { createdBy_uid: account.uid },
        data.wizard
      )

      switch (type) {
        case DownloadType.Moves:
          download.type = type
          saveAndRedirect(request, response, `${download.uri}/new/moves`)
          break
        case DownloadType.Session:
          download.type = type
          download.format = DownloadFormat.XLSX
          download.school_id = school_id
          download.session_id = session_id
          saveAndRedirect(request, response, `${download.uri}/new/session`)
          break
        default:
          saveAndRedirect(request, response, `${download.uri}/new/type`)
      }
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { download_id } = request.params
    const { data } = request.session
    const { __ } = response.locals

    const download = Download.create(data.wizard.downloads[download_id], data)

    // Clean up session data
    delete data.download
    delete data.wizard

    request.flash('message', __(`download.new.message`, { download }))

    return saveAndRedirect(request, response, '/downloads')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
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

    response.locals.recordOfflineItems = [
      {
        text: __('download.canRecordOffline.yes.label'),
        value: true
      },
      {
        text: __('download.canRecordOffline.no.label'),
        value: false
      }
    ]

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

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { view } = request.params

    return response.render(`download/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response, next) {
    const { download_id } = request.params
    const { data } = request.session
    const { paths } = response.locals

    Download.update(download_id, request.body.download, data.wizard)

    return paths.next ? saveAndRedirect(request, response, paths.next) : next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  download(request, response) {
    const { data } = request.session
    const { download } = response.locals

    // Generate and return file
    const { buffer, fileName, mimetype } = download.createFile(data)

    response.header('Content-Type', mimetype)
    response.header('Content-disposition', `attachment; filename=${fileName}`)

    return response.end(buffer)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
