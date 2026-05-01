import xGovukConfig from '@x-govuk/eslint-config'

export default [
  ...xGovukConfig,
  {
    files: ['**/*.js'],
    rules: {
      camelcase: 'off',
      'getter-return': 'off',
      'no-continue': 'off'
    }
  },
  {
    ignores: ['assets']
  }
]
