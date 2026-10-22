import wizard from '@x-govuk/govuk-prototype-wizard'

import { UploadFormat, UploadStatus, UploadType } from '../enums.js'
import { Patient, Upload } from '../models.js'
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

    let uploads = Upload.findAll(data).filter((upload) => {
      // School admins can only see files uploaded by users in their team
      if (account.isSchoolUser) {
        return upload.uploadedBy?.team_id === account.team_id
      }

      // SAIS teams can’t see uploads that are private to a school admin
      if (upload.teamStatus === undefined) {
        return false
      }

      // SAIS teams can only see uploads created by users in their team
      // (including requests sent to schools) and uploads from other teams that
      // have been sent for approval
      return (
        upload.createdBy?.team_id === account.team_id ||
        Boolean(upload.submittedAt)
      )
    })

    if (account.isSchoolUser) {
      uploads = uploads.filter((upload) => upload.type === UploadType.School)
    }

    if (account.isSchoolUser && uploads.length === 0) {
      return response.redirect('/uploads/guides')
    }

    response.locals.uploads = uploads

    return next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  show(request, response) {
    const view = request.params.view || 'show'
    const { account } = response.locals

    if (view === 'show' && account.isSchoolUser) {
      return response.render(`upload/show-class-list`)
    }

    // SAIS teams can’t see uploads that are private to a school admin
    if (
      !account.isSchoolUser &&
      response.locals.upload?.teamStatus === undefined
    ) {
      return response.redirect('/uploads')
    }

    return response.render(`upload/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  showGuide(request, response) {
    const view = request.params.view || 'index'

    response.locals.view = view

    return response.render(`upload/guides/${view}`)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  list(request, response) {
    const { status, type } = request.query
    const { data } = request.session
    const { account, uploads } = response.locals

    let results = uploads

    // Filter by status (as shown to the type of user)
    if (status) {
      const statuses = Array.isArray(status) ? status : [status]
      const statusKey = account.isSchoolUser ? 'schoolStatus' : 'teamStatus'
      results = results.filter((upload) =>
        statuses.some((status) => upload[statusKey] === status)
      )
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
        type: account.isSchoolUser ? UploadType.School : type,
        fileName: 'example.csv',
        ...(type === UploadType.School && school_id && { school_id })
      },
      data.wizard
    )

    function getStartPath(account, type, upload) {
      if (account.isSchoolUser) {
        return 'format'
      }

      if (!type) {
        return 'type'
      }

      // School uploads need a school chosen before the file
      if (type === UploadType.School && !upload.school_id) {
        return 'school'
      }

      return 'file'
    }

    data.startPath = getStartPath(account, type, upload)

    return saveAndRedirect(
      request,
      response,
      `${upload.uri}/new/${data.startPath}`
    )
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  request(request, response) {
    const { programme_id } = request.params
    const { school_id } = request.query
    const { data } = request.session
    const { account } = response.locals

    const upload = Upload.create(
      {
        createdAt: today(),
        createdBy_uid: account.uid,
        requestedAt: today(),
        requestedBy_uid: account.uid,
        programme_id,
        type: UploadType.School,
        school_id
      },
      data.wizard
    )

    return saveAndRedirect(
      request,
      response,
      `${upload.uri}/request/year-groups`
    )
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  update(type) {
    return (request, response) => {
      const { upload_id } = request.params
      const { data } = request.session
      const { __, account } = response.locals

      // Update session data
      let upload = Upload.update(
        upload_id,
        data.wizard.uploads[upload_id],
        data.wizard
      )

      // Add patient records
      let patients = Patient.findAll(data)
      switch (upload.type) {
        case UploadType.School:
          // Pupils at the school in the chosen year groups
          patients = patients.filter(
            (patient) =>
              upload.school_id === patient.school_id &&
              upload.yearGroups.map(Number).includes(patient.yearGroup)
          )
          break
        case UploadType.Report:
          // Patients with vaccination records
          patients = patients.filter(
            (patient) => patient.vaccinations.length > 0
          )
          break
      }

      upload.patient_uuids = patients.map((patient) => patient.uuid)

      if (type === 'new' || type === 'edit') {
        // Record file upload (restarts processing)
        upload.uploadedAt = today()
        upload.uploadedBy_uid = account.uid
      }

      if (type === 'edit') {
        // Delete any previous validation errors and failed data checks
        delete upload.validations
        delete upload.hasFailed
      } else if (type === 'request') {
        // Add assignees before updating upload
        upload.assignee_uids = request.body.upload.assignee_uids
      } else if (type === 'new' && upload.format === UploadFormat.Mavis) {
        // Add validation errors
        upload.validations = {}

        for (const [i, patient] of patients.entries()) {
          upload.validations[i + 1] = {
            CHILD_FIRST_NAME: 'is required but missing',
            CHILD_DOB: `‘${patient.firstName}’ should be formatted as YYYY-MM-DD`,
            CHILD_POSTCODE: `‘${patient.address.addressLine1}’ should be a postcode, like SW1A 1AA`
          }
        }
      }

      upload = Upload.create(upload, data)

      // Clean up session data
      delete data.upload
      delete data.wizard

      if (
        [UploadStatus.Requested, UploadStatus.Processing].includes(
          upload.status
        )
      ) {
        request.flash('success', __(`upload.${type}.success`))
      }

      let nextPage = '/uploads'
      if ([UploadStatus.Failed, UploadStatus.Invalid].includes(upload.status)) {
        nextPage = upload.uri
      } else if (type === 'request') {
        nextPage = `${upload.school.uri}/uploads`
      }

      saveAndRedirect(request, response, nextPage)
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
      const { __, account } = response.locals

      // Setup wizard if not already setup
      let upload = Upload.findOne(upload_id, data.wizard)
      if (!upload) {
        upload = Upload.create(response.locals.upload, data.wizard)
      }

      // Journey for SAIS teams to request an upload from a school
      const saisRequestJourney = {
        [`/${upload_id}/request/year-groups`]: {},
        [`/${upload_id}/request/assignees`]: {},
        [`/${upload_id}`]: {}
      }

      // Journey for SAIS teams
      const saisJourney = {
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

      // Journey for school teams
      const schoolJourney = {
        [`/`]: {},
        [`/${upload_id}/${type}/format`]: {
          [`/${upload_id}/${type}/school`]: () =>
            request.body?.upload?.format === UploadFormat.Mavis
        },
        [`/${upload_id}/${type}/school`]: {},
        [`/${upload_id}/${type}/year-groups`]: {},
        [`/${upload_id}/${type}/file`]: {},
        [`/${upload_id}`]: {}
      }

      let journey
      if (type === 'request') {
        journey = saisRequestJourney
      } else {
        journey = account.isSchoolUser ? schoolJourney : saisJourney
      }

      upload = new Upload(upload, data)
      response.locals.upload = upload

      response.locals.paths = wizard(journey, request)

      response.locals.type = type

      response.locals.formatItems = [
        {
          text: UploadFormat.Arbor
        },
        {
          text: UploadFormat.Bromcom
        },
        {
          text: UploadFormat.SIMS
        },
        {
          divider: 'or'
        },
        {
          text: __(`upload.format.${UploadFormat.Mavis}.label`),
          value: UploadFormat.Mavis
        }
      ]

      response.locals.typeItems = Object.entries(UploadType).map(
        ([key, value]) => ({
          text: UploadType[key],
          hint: __(`upload.type.hint.${key}`),
          value
        })
      )

      if (upload.school) {
        response.locals.assigneeItems = upload.school.users.map((user) => ({
          text: user.email,
          hint: user.fullName,
          value: user.uid
        }))

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
   * @param {'submit'|'approve'} type - Review type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  review(type) {
    return (request, response) => {
      const { upload_id } = request.params
      const { data } = request.session
      const { __, account } = response.locals

      Upload.update(
        upload_id,
        {
          updatedBy_uid: account.uid,
          ...(type === 'submit' && {
            submittedAt: today(),
            submittedBy_uid: account.uid
          }),
          ...(type === 'approve' && {
            approvedAt: today(),
            approvedBy_uid: account.uid
          })
        },
        data
      )

      request.flash('success', __(`upload.${type}.success`))

      return saveAndRedirect(request, response, '/uploads')
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  reject(request, response) {
    const { upload_id } = request.params
    const { rejectionReason } = request.body.upload
    const { data } = request.session
    const { __, account } = response.locals

    Upload.update(
      upload_id,
      {
        updatedBy_uid: account.uid,
        rejectedAt: today(),
        rejectedBy_uid: account.uid,
        rejectionReason
      },
      data
    )

    request.flash('success', __('upload.reject.success'))

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
