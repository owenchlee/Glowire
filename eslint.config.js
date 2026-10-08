// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = defineConfig([
  expoConfig,
  prettierConfig,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*'],
  },
  {
    // R3F JSX props (position, intensity, args...) are three.js props, not DOM attributes.
    files: ['app/**/*.tsx', 'src/render/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
  {
    // The engine must stay pure TypeScript: no React or React Native.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['react', 'react-native', 'react-native-*', 'expo*', '@react-three/*', 'three'],
        },
      ],
    },
  },
]);
