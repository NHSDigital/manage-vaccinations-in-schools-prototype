import { GillickCompetent } from '../enums.js'
import { stringToBoolean } from '../utils/string.js'

import { BaseModel } from './base.js'

/**
 * @typedef {BaseModelOptions & object} GillickOptions
 * @property {boolean} [q1] - Question 1
 * @property {boolean} [q2] - Question 2
 * @property {boolean} [q3] - Question 3
 * @property {boolean} [q4] - Question 4
 * @property {boolean} [q5] - Question 5
 * @property {string} [note] - Assessment note
 */

/**
 * @class Gillick assessment
 */
export class Gillick extends BaseModel {
  static ns = 'gillick'

  /**
   * @param {GillickOptions} options - Options
   */
  constructor(options) {
    super(options)

    this.q1 = stringToBoolean(options?.q1)
    this.q2 = stringToBoolean(options?.q2)
    this.q3 = stringToBoolean(options?.q3)
    this.q4 = stringToBoolean(options?.q4)
    this.q5 = stringToBoolean(options?.q5)
    this.note = options?.note
  }

  /**
   * Get Gillick competency
   *
   * @returns {object|undefined} Gillick competency
   */
  get competent() {
    const questions = [this.q1, this.q2, this.q3, this.q4, this.q5]
    if (questions.includes(false)) {
      return GillickCompetent.False
    } else if (questions.every((answer) => answer === true)) {
      return GillickCompetent.True
    }
  }
}

/**
 * @import { BaseModelOptions } from './base.js'
 */
