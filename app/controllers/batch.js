import { Batch, DefaultBatch } from '../models.js'

export const batchController = {
  /**
   * @type {RequestParamHandler}
   */
  read(request, response, next, batch_id) {
    const batch = Batch.findOne(batch_id, request.session.data)

    response.locals.batch = batch

    next()
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  form(request, response) {
    return response.render('batch/form')
  },

  /**
   * @param {string} type - Form type
   * @returns {RequestHandler<Record<string, string>>} Request handler
   */
  action(type) {
    return (request, response) => {
      response.render('batch/action', { type })
    }
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  create(request, response) {
    const { vaccine_snomed } = request.params
    const { data } = request.session
    const { __ } = response.locals

    const batch = Batch.create(
      {
        ...request.body.batch,
        vaccine_snomed
      },
      data
    )

    request.flash('success', __(`batch.new.success`, { batch }))

    return response.redirect('/vaccines')
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  update(request, response) {
    const { batch_id } = request.params
    const { data } = request.session
    const { __, paths } = response.locals

    // Clean up session data
    delete data.batch

    // Update session data
    const batch = Batch.update(batch_id, request.body.batch, data)

    request.flash('success', __(`batch.edit.success`, { batch }))

    return response.redirect(paths.next)
  },

  /**
   * @type {RequestHandler<Record<string, string>>}
   */
  archive(request, response) {
    const { batch_id } = request.params
    const { data } = request.session
    const { __ } = response.locals

    // Remove from default batches
    DefaultBatch.delete(batch_id, data)

    // Archive batch
    const batch = Batch.archive(batch_id, data)

    request.flash('success', __(`batch.archive.success`, { batch }))

    return response.redirect('/vaccines')
  }
}

/**
 * @import { RequestHandler, RequestParamHandler } from 'express'
 */
