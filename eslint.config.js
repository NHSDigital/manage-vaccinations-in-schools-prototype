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
    files: ['app/assets/javascripts/**/*.js'],
    rules: {
      'import-x/no-unresolved': 'off',
      'n/no-missing-import': 'off'
    }
  },
  {
    ignores: ['assets']
  }
]
