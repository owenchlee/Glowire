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
    files: ['app/**/*.tsx', 'src/render/**/*.tsx', 'src/world-view/**/*.tsx', 'src/puzzle-view/**/*.tsx'],
    rules: { 'react/no-unknown-property': 'off' },
  },
  {
    // R3F mutates three.js objects inside useFrame/effects, and gesture-handler builds
    // gestures from callbacks that read refs. Both are the libraries' documented
    // patterns; these React Compiler rules assume pure render-time code. The compiler
    // itself is not enabled in this project.
    files: ['src/render/**/*.tsx', 'src/ui/**/*.tsx'],
    rules: { 'react-hooks/refs': 'off', 'react-hooks/immutability': 'off' },
  },
  {
    // The engine and the world rules must stay pure TypeScript: no React or React Native.
    files: ['src/engine/**/*.ts', 'src/world/**/*.ts'],
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
