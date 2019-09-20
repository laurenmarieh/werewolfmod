module.exports = {
  env: {
    browser: true,
    commonjs: true,
    es6: true
  },
  extends: ['airbnb-base'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly'
  },
  parserOptions: {
    ecmaVersion: 2018
  },
  rules: {
    'vars-on-top': 'off',
    'no-case-declarations': 'off',
    radix: 'off',
    'no-plusplus': 'off',
    indent: [true, 'spaces', 4]
  }
}
