// The Forms guide (vael-form), chapter by chapter: each section is a heading, a sentence or two, a
// snippet or a live demo from form-demos. The words live in the locales under formsDocs.chapters.<id>.
export interface FormsChapter {
  id: string
  routeName: string
  path: string
  /** `code`: a snippet shown under the section's words, before its demo. */
  sections: { id: string; demo?: string; code?: string }[]
}

export const FORMS_CHAPTERS: FormsChapter[] = [
  {
    id: 'start',
    routeName: 'forms-start',
    path: '/forms/start',
    sections: [
      { id: 'install', code: 'pnpm add vael-form zod' },
      { id: 'first', demo: 'start/01-SignUp' },
      { id: 'state', demo: 'start/02-FormState' },
      { id: 'choices', demo: 'start/03-Choices' },
      {
        id: 'components',
        code: `<Field label="Email" :error="errors.email">
  <Input v-model="email" v-bind="attrs.email" />
</Field>`,
      },
    ],
  },
  {
    id: 'errors',
    routeName: 'forms-errors',
    path: '/forms/errors',
    sections: [
      { id: 'modes', demo: 'errors/01-Modes' },
      {
        id: 'perPath',
        code: `useForm({
  schema,
  showErrors: { default: 'edited', username: 'input', members: 'submit' },
})`,
      },
      { id: 'summary', demo: 'errors/02-Summary' },
      {
        id: 'shift',
        code: `<p :id="attrs.email.errorId" class="error">{{ errors.email }}</p>

<style>
.error {
  min-height: 1.5em;
}
</style>`,
      },
      { id: 'autofill' },
      {
        id: 'app',
        code: `// main.ts
import { formPlugin } from 'vael-form'

app.use(formPlugin, { showErrors: 'blur' })`,
      },
    ],
  },
  {
    id: 'submitting',
    routeName: 'forms-submitting',
    path: '/forms/submitting',
    sections: [
      { id: 'onSubmit', demo: 'submitting/01-Submit' },
      { id: 'server', demo: 'submitting/02-ServerErrors' },
      {
        id: 'buttons',
        code: `<button name="action" value="draft">Save draft</button>
<button name="action" value="publish">Publish</button>

<script setup lang="ts">
const form = useForm({
  schema,
  onSubmit: (values, { submitter }) => api.save(values, submitter?.value),
})
</script>`,
      },
      {
        id: 'handler',
        code: `const onSubmit = handleSubmit(async (values, { formData }) => {
  await api.save(values)
})

// <form novalidate @submit="onSubmit">`,
      },
      {
        id: 'formData',
        code: `useForm({
  schema,
  onSubmit: (values, { formData }) =>
    fetch('/api/signup', { method: 'POST', body: formData }),
})`,
      },
      {
        id: 'query',
        code: `const mutation = useMutation({ mutationFn: (values: Values) => api.save(values) })

const { handleSubmit } = useForm({
  schema,
  onSubmit: (values) => mutation.mutateAsync(values),
})
// <Button type="submit" :loading="mutation.isPending.value">Save</Button>`,
      },
    ],
  },
  {
    id: 'validation',
    routeName: 'forms-validation',
    path: '/forms/validation',
    sections: [
      {
        id: 'libraries',
        code: `// Zod
z.object({ email: z.email(), age: z.number().min(18) })

// Valibot
v.object({ email: v.pipe(v.string(), v.email()), age: v.pipe(v.number(), v.minValue(18)) })

// ArkType
type({ email: 'string.email', age: 'number >= 18' })`,
      },
      { id: 'cross', demo: 'validation/01-ConfirmPassword' },
      { id: 'rules', demo: 'validation/02-Username' },
      { id: 'plain', demo: 'validation/03-NoSchema' },
      {
        id: 'validator',
        code: `import { validator } from 'vael-form/validator'

export const signup = validator<Values>({ email: [required, email], age: min(18) })

// In a component: useForm({ schema: signup, defaultValues })
// On a server:    signup['~standard'].validate(body)`,
      },
      {
        id: 'transforms',
        code: `z.object({
  name: z.string().trim().min(1), // "  Ada " becomes "Ada"
  email: z.string().trim().toLowerCase().pipe(z.email()),
  price: z.string().transform(Number), // "12.5" becomes 12.5
})`,
      },
      { id: 'limits', demo: 'validation/04-Limits' },
    ],
  },
  {
    id: 'lists',
    routeName: 'forms-lists',
    path: '/forms/lists',
    sections: [
      { id: 'list', demo: 'lists/01-Members' },
      { id: 'steps', demo: 'lists/02-Steps' },
      { id: 'unions', demo: 'lists/03-Payment' },
      {
        id: 'dynamic',
        code: `const schema = ref(schemas.personal)
const form = useForm({ schema })

// A new schema validates the same values again.
form.model.kind.watch(({ value }) => (schema.value = schemas[value]))`,
      },
    ],
  },
  {
    id: 'data',
    routeName: 'forms-data',
    path: '/forms/data',
    sections: [
      { id: 'loading', demo: 'data/01-LoadLater' },
      { id: 'watch', demo: 'data/02-Dependent' },
      { id: 'dialogs', demo: 'data/03-EditInDialog' },
      {
        id: 'store',
        code: `export const useSignup = defineStore('signup', () => {
  const form = useForm({
    schema,
    id: 'signup',
    onSubmit: async (values, { form }) => {
      try {
        await api.signUp(values)
      } catch {
        form.setErrors({ email: 'That email is already registered' })
      }
    },
  })
  return { form }
})`,
      },
      {
        id: 'reusable',
        code: `<!-- TextField.vue -->
<script setup lang="ts">
import type { Field } from 'vael-form'

defineProps<{ field: Field<string>; label: string }>()
</script>

<template>
  <Field :label="label" :error="field.error">
    <Input v-model="field.value" v-bind="field.attrs" />
  </Field>
</template>

<!-- <TextField :field="form.field('email')" label="Email" /> -->`,
      },
      {
        id: 'children',
        code: `<!-- AccountStep.vue, inside the form's component -->
<script setup lang="ts">
import { useFormContext } from 'vael-form'
import type { schema } from './schema'

const { model, errors, attrs } = useFormContext<typeof schema>()
const { account } = model
</script>`,
      },
    ],
  },
  {
    id: 'i18n',
    routeName: 'forms-i18n',
    path: '/forms/i18n',
    sections: [
      {
        id: 'setup',
        code: `// main.ts
import { createI18n } from 'vue-i18n'
import { formPlugin } from 'vael-form'

const i18n = createI18n({ legacy: false, locale: 'en', messages: { en, fr } })
app.use(i18n)
app.use(formPlugin, { i18n: i18n.global })`,
      },
      { id: 'live', demo: 'i18n/01-Translated' },
      { id: 'catalog' },
      {
        id: 'labels',
        code: `useForm({
  schema,
  labels: { email: 'labels.email', firstName: 'labels.firstName' },
})
// "{field} is required" becomes "Email is required", in the current locale`,
      },
      {
        id: 'msg',
        code: `import { msg } from 'vael-form'

z.string().refine(isFree, msg('errors.taken', { name }, 'Already taken'))

declare module 'vael-form' {
  interface Register {
    messageKeys: 'errors.taken' | 'errors.members'
  }
}`,
      },
    ],
  },
  {
    id: 'nuxt',
    routeName: 'forms-nuxt',
    path: '/forms/nuxt',
    sections: [
      {
        id: 'module',
        code: `// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/i18n', 'vael-form/nuxt'],
  vaelForm: { showErrors: 'edited' },
})`,
      },
      { id: 'ssr' },
      { id: 'vapor' },
    ],
  },
]

// Beside a section's heading: the options and returns it teaches, linked to the API page.
export const SECTION_APIS: Record<string, string[]> = {
  'start.first': ['useForm', 'model', 'errors', 'attrs', 'handleSubmit'],
  'start.state': ['valid', 'dirty', 'touched', 'submitting', 'values'],
  'start.components': ['attrs'],
  'errors.modes': ['showErrors'],
  'errors.perPath': ['showErrors'],
  'errors.summary': ['errorList', 'allErrors'],
  'errors.app': ['formPlugin'],
  'submitting.onSubmit': ['onSubmit', 'submitting'],
  'submitting.server': ['setErrors'],
  'submitting.handler': ['handleSubmit'],
  'submitting.formData': ['onSubmit'],
  'validation.cross': ['schema'],
  'validation.rules': ['rules', 'debounce', 'pending'],
  'validation.plain': ['validate'],
  'validation.validator': ['validator'],
  'validation.limits': ['attrs'],
  'lists.list': ['field'],
  'lists.steps': ['validate()'],
  'data.loading': ['defaultValues', 'reset'],
  'data.watch': ['watch'],
  'data.dialogs': ['reset'],
  'data.children': ['useFormContext'],
  'i18n.setup': ['formPlugin'],
  'i18n.labels': ['labels'],
  'i18n.msg': ['msg'],
}

// A name's row on the API page: `validate()` is the method, `validate` the option.
export const apiAnchor = (name: string) => (name === 'validate()' ? 'validate-fn' : name)

// The API reference's rows: the page and the command palette read this one list.
// [what it's called, its key in formsDocs.api.rows, its anchor when that differs from the name]
type Row = [name: string, key?: string, anchor?: string]
const rows = (list: Row[]) =>
  list.map(([name, key = name, anchor = name]) => ({ name, key, anchor }))

export const FORMS_API = [
  {
    id: 'options',
    rows: rows([
      ['schema'],
      ['validate'],
      ['defaultValues'],
      ['onSubmit'],
      ['onInvalid'],
      ['showErrors'],
      ['rules'],
      ['debounce'],
      ['labels'],
      ['i18n'],
      ['id'],
    ]),
  },
  {
    id: 'returns',
    rows: rows([
      ['model'],
      ['errors'],
      ['attrs'],
      ['handleSubmit'],
      ['submitting'],
      ['valid'],
      ['dirty'],
      ['touched'],
      ['pending'],
      ['submitCount'],
      ['values'],
      ['errorList'],
      ['allErrors'],
      ['reset'],
      ['validate()', 'validateFn', 'validate-fn'],
      ['setValue'],
      ['setValues'],
      ['setErrors'],
      ['clearErrors'],
      ['watch'],
      ['field', 'fieldFn'],
    ]),
  },
  {
    id: 'field',
    rows: rows([
      ['value', 'f_value', 'field-value'],
      ['error', 'f_error', 'field-error'],
      ['touched, dirty, …', 'f_state', 'field-state'],
      ['attrs', 'f_attrs', 'field-attrs'],
      ['touch(), …', 'f_methods', 'field-methods'],
    ]),
  },
  {
    id: 'list',
    rows: rows([
      ['items', 'l_items'],
      ['push, remove, …', 'l_ops', 'list-operations'],
    ]),
  },
  {
    id: 'exports',
    rows: rows([
      ['formPlugin'],
      ['provideFormConfig'],
      ['useFormContext'],
      ['useField'],
      ['msg'],
      ['validator'],
    ]),
  },
]
