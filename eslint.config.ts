import {defineConfig} from 'eslint/config';
import {fixupPluginRules} from '@eslint/compat';
import reactNative from 'eslint-plugin-react-native';
import tseslint from 'typescript-eslint';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';

export default defineConfig([
  {
    ignores: ['**/*.generated.ts'],
  },
  eslintPluginPrettierRecommended,
  {
    plugins: {
      '@typescript-eslint': tseslint.plugin,
      // @ts-ignore
      'react-native': fixupPluginRules(reactNative),
    },
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'no-console': ['error'],
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'react-native/no-color-literals': 2,
      'react-native/no-unused-styles': 2,
      'react-native/no-raw-text': 2,
      'react-native/sort-styles': 2,
      quotes: ['error', 'single'],
    },
  },
]);
