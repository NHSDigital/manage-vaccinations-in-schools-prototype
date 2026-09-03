import wizard from '@x-govuk/govuk-prototype-wizard'

import { UploadStatus, UploadType } from '../enums.js'
import { Upload } from '../models.js'
import { getDateValueDifference, today } from '../utils/date.js'
import { getResults, getPagination } from '../utils/pagination.js'
import { saveAndRedirect } from '../utils/redirect.js'
import { formatYearGroup } from '../utils/string.js'
import { getFilterParams } from '../utils/url.js'

export const uploadController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, upload_id) {
    response.locals.upload = Upload.findOne(upload_id, request.session.data)

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  readAll(request, response, next) {
    const { data } = request.session
    const { account } = response.locals

    let uploads = Upload.findAll(data)

    if (account.isSchoolUser) {
      uploads = uploads.filter((upload) => upload.type === UploadType.School)
    }

    response.locals.uploads = uploads

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    const view = request.params.view || 'show'

    return response.render(`upload/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    const { status, type } = request.query
    const { data } = request.session
    const { uploads } = response.locals

    let results = uploads

    // Filter by status
    if (status) {
      results = results.filter((upload) => upload.status === status)
    }

    // Filter by type
    if (type && type !== 'none') {
      results = results.filter((upload) => upload.type === type)
    }

    // Sort
    results = results.sort((a, b) =>
      getDateValueDifference(b.createdAt, a.createdAt)
    )

    // Results
    response.locals.results = getResults(results, request.query, 40)
    response.locals.pages = getPagination(results, request.query, 40)

    // Clean up session data
    delete data.status
    delete data.type

    return response.render(`upload/list`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  filterList(request, response) {
    const params = getFilterParams(request, ['type'], ['status'])

    return saveAndRedirect(request, response, `/uploads?${params}`)
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      const { upload } = response.locals
      let paths

      if (type === 'bulk remove relationships') {
        paths = { back: `${upload.uri}/bulk-remove-relationships` }
      }

      response.render('upload/action', { paths, type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  new(request, response) {
    const { programme_id } = request.params
    const { type, school_id } = request.query
    const { data } = request.session
    const { account } = response.locals

    const upload = Upload.create(
      {
        createdAt: today(),
        createdBy_uid: account.uid,
        programme_id,
        type,
        status: UploadStatus.Processing,
        progress: 1,
        fileName: 'example.csv',
        ...(type === UploadType.School && school_id && { school_id })
      },
      data.wizard
    )

    // If type provided in query string, start journey at upload question
    data.startPath = type
      ? type === UploadType.School
        ? 'year-groups'
        : 'file'
      : 'type'

    return saveAndRedirect(
      request,
      response,
      `${upload.uri}/new/${data.startPath}`
    )
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(type) {
    return (request, response) => {
      const { upload_id } = request.params
      const { data, referrer } = request.session
      const { __ } = response.locals

      // Update session data
      let upload = Upload.update(
        upload_id,
        data.wizard.uploads[upload_id],
        data.wizard
      )

      // Editing an upload means retrying an upload with a new file
      // This means the existing failed or invalid status should be replaced
      if (type === 'edit') {
        upload.status = UploadStatus.Processing
      }

      upload = Upload.create(upload, data)

      // Clean up session data
      delete data.upload
      delete data.wizard

      request.flash('success', __(`upload.${type}.success`))

      saveAndRedirect(request, response, referrer || upload.uri)
    }
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  readForm(type) {
    return (request, response, next) => {
      const { upload_id } = request.params
      const { data } = request.session
      const { __ } = response.locals

      // Setup wizard if not already setup
      let upload = Upload.findOne(upload_id, data.wizard)
      if (!upload) {
        upload = Upload.create(response.locals.upload, data.wizard)
      }

      const journey = {
        [`/`]: {},
        ...(data.startPath === 'type'
          ? {
              [`/${upload_id}/${type}/type`]: {
                [`/${upload_id}/${type}/file`]: {
                  data: 'upload.type',
                  excludedValue: UploadType.School
                }
              },
              [`/${upload_id}/${type}/school`]: {},
              [`/${upload_id}/${type}/year-groups`]: {},
              [`/${upload_id}/${type}/file`]: {}
            }
          : {
              [`/${upload_id}/${type}/school`]: {},
              [`/${upload_id}/${type}/year-groups`]: {},
              [`/${upload_id}/${type}/file`]: {}
            }),
        [`/${upload_id}`]: {}
      }

      upload = new Upload(upload, data)
      response.locals.upload = upload

      response.locals.paths = wizard(journey, request)

      response.locals.typeItems = Object.entries(UploadType).map(
        ([key, value]) => ({
          text: UploadType[key],
          hint: __(`upload.type.hint.${key}`),
          value
        })
      )

      if (upload.school) {
        response.locals.yearGroupItems = upload.school.yearGroups.map(
          (yearGroup) => ({
            text: formatYearGroup(yearGroup),
            value: yearGroup
          })
        )
      }

      next()
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showForm(request, response) {
    const { view } = request.params

    return response.render(`upload/form/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  updateForm(request, response) {
    const { upload_id } = request.params
    const { data } = request.session
    const { paths } = response.locals

    Upload.update(upload_id, request.body.upload, data.wizard)

    return saveAndRedirect(request, response, paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  delete(request, response) {
    const { upload_id } = request.params
    const { data } = request.session
    const { __ } = response.locals

    Upload.delete(upload_id, data)

    request.flash('success', __(`upload.delete.success`))

    return saveAndRedirect(request, response, '/uploads')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  approve(request, response) {
    const { upload_id } = request.params
    const { data } = request.session
    const { __, account } = response.locals

    Upload.update(
      upload_id,
      {
        updatedAt: new Date(),
        updatedBy_uid: account.uid,
        status: UploadStatus.Approved
      },
      data
    )

    request.flash('success', __(`upload.approve.success`))

    return saveAndRedirect(request, response, '/uploads')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  removeRelationships(request, response) {
    const { __, upload } = response.locals

    request.flash('success', __('upload.removeRelationships.success'))

    return saveAndRedirect(request, response, upload.uri)
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
