export const reviewController = {
  /**
   * @type {import("express").RequestHandler}
   */
  list(request, response) {
    return response.redirect('/notices')
  }
}
