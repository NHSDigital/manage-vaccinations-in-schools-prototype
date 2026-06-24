import _ from 'lodash'

/**
 * Diff two model instances and return changed fields with display values
 *
 * @param {object} before - Model instance before update
 * @param {object} after - Model instance after update
 * @returns {{ key: string, before: string, after: string }[]} Updated fields
 */
export function getUpdatedFields(before, after) {
  const keys = Object.keys(before).filter((key) => !key.includes('_'))
  const updatedFields = []

  for (const key of keys) {
    const valueBefore = before.formatted?.[key] || before?.[key]
    const valueAfter = after.formatted?.[key] || after?.[key]

    if (!_.isMatch(valueBefore, valueAfter)) {
      updatedFields.push({
        key: `${after.ns}.${key}.label`,
        before: String(valueBefore ?? '').replace('<br>', ', '),
        after: String(valueAfter ?? '').replace('<br>', ', ')
      })
    }
  }

  return updatedFields
}
