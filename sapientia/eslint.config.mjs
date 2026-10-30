import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import stylistic from '@stylistic/eslint-plugin';

/**
 * Google JavaScript Style Guide rules, ported by hand: eslint-config-google (0.14, 2019) still names rules that ESLint 9
 * removed (valid-jsdoc, require-jsdoc), so it cannot be loaded. Two deliberate departures, kept the same across the code:
 * lines up to 140 characters (Google says 80) and spaces inside braces, `{ a }` (Google says `{a}`).
 */
const googleStyle = {
  plugins: { '@stylistic': stylistic },
  rules: {
    // Language rules
    'no-var': 'error',
    'prefer-const': ['error', { destructuring: 'all' }],
    'prefer-rest-params': 'error',
    'prefer-spread': 'error',
    'no-new-wrappers': 'error',
    'no-with': 'error',
    'no-throw-literal': 'error',
    'guard-for-in': 'error',
    'new-cap': ['error', { capIsNew: false }],
    'curly': ['error', 'multi-line'],
    // Formatting rules
    '@stylistic/indent': ['error', 2, {
      SwitchCase: 1,
      offsetTernaryExpressions: true,
      ignoredNodes: ['JSXElement', 'JSXElement *', 'JSXOpeningElement', 'JSXClosingElement', 'JSXFragment', 'TemplateLiteral *'],
    }],
    '@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
    '@stylistic/semi': ['error', 'always'],
    '@stylistic/comma-dangle': ['error', { arrays: 'always-multiline', objects: 'always-multiline', imports: 'always-multiline',
      exports: 'always-multiline', functions: 'always-multiline', generics: 'ignore' }],
    '@stylistic/brace-style': ['error', '1tbs', { allowSingleLine: true }],
    '@stylistic/eol-last': 'error',
    '@stylistic/no-trailing-spaces': 'error',
    '@stylistic/no-tabs': 'error',
    '@stylistic/keyword-spacing': 'error',
    '@stylistic/space-before-blocks': 'error',
    '@stylistic/comma-spacing': 'error',
    '@stylistic/key-spacing': 'error',
    '@stylistic/object-curly-spacing': ['error', 'always'],
    '@stylistic/array-bracket-spacing': ['error', 'never'],
    '@stylistic/max-len': ['error', { code: 140, ignoreUrls: true, ignoreStrings: true, ignoreTemplateLiterals: true, ignoreRegExpLiterals: true }],
    '@stylistic/no-multiple-empty-lines': ['error', { max: 2 }],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ['**/*.{js,mjs,ts,tsx,mts}'], ...googleStyle },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
