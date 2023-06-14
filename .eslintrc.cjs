/* eslint-env node */
module.exports = {
  extends: [
    'airbnb-typescript/base',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'prettier',
  ],
  parserOptions: {
    project: './eslint.tsconfig.json',
  },
};
