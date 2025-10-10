/** ESLint security baseline for Node/TS */
module.exports = {
  root: true,
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  env: { node: true, es2022: true },
  extends: ['eslint:recommended', 'plugin:security/recommended'],
  plugins: ['security'],
  ignorePatterns: ['dist/**', 'node_modules/**', 'coverage/**']
};
