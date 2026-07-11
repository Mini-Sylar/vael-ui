import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/*.d.ts'] },
  ...vue.configs['flat/base'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
    rules: {
      'vue/block-order': ['error', { order: ['template', 'script', 'style'] }],
      'vue/no-unused-vars': ['error', { ignorePattern: '^_' }],
    },
  },
)
