<template>
  <GuideLayout :links="tocLinks">
    <p class="fa-eyebrow">{{ t('formsDocs.eyebrow') }}</p>
    <h1>{{ t('formsDocs.api.title') }}</h1>
    <p class="fa-lede" v-html="t('formsDocs.api.intro')" />

    <section v-for="group in shown" :key="group.id" class="fa-group">
      <h2 :id="group.anchor">{{ t(`formsDocs.api.${group.id}`) }}</h2>
      <div class="fa-table-wrap">
        <table class="fa-table">
          <thead>
            <tr>
              <th scope="col">{{ t('formsDocs.api.name') }}</th>
              <th scope="col">{{ t('formsDocs.api.description') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in group.rows" :id="row.anchor" :key="row.key">
              <th scope="row">
                <code>{{ row.name }}</code>
              </th>
              <td v-html="t(`formsDocs.api.rows.${row.key}`)" />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import GuideLayout from '../../components/GuideLayout.vue'

const { t } = useI18n()
useHead({ title: () => t('formsDocs.api.title') })

// [what it's called, its key in formsDocs.api.rows, its anchor when that differs from the name]
type Row = [name: string, key?: string, anchor?: string]
const rows = (list: Row[]) =>
  list.map(([name, key = name, anchor = name]) => ({ name, key, anchor }))

const groups = [
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

// `field` is both a group and a method: the method's row keeps the name as its anchor.
const anchorOf = (id: string) => (id === 'field' ? 'field-members' : id)
const shown = groups.map((group) => ({ ...group, anchor: anchorOf(group.id) }))

const tocLinks = computed(() =>
  shown.map((group) => ({ id: group.anchor, label: t(`formsDocs.api.${group.id}`) })),
)
</script>

<style scoped>
.fa-eyebrow {
  margin: 0 0 0.25rem;
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.fa-lede {
  max-inline-size: 38rem;
  color: var(--ui-text-muted);
  font-size: 1.0625rem;
}
.fa-group {
  margin-block-start: 2.5rem;
}
.fa-table-wrap {
  overflow-x: auto;
}
.fa-table {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
.fa-table th,
.fa-table td {
  padding: 0.625rem 0.75rem;
  border-block-end: 1px solid var(--ui-border);
  text-align: start;
  vertical-align: top;
}
.fa-table thead th {
  color: var(--ui-text-muted);
  font-size: 0.75rem;
  font-weight: 600;
}
.fa-table tbody th {
  inline-size: 11rem;
  font-weight: 400;
  white-space: nowrap;
}
.fa-table tr {
  scroll-margin-top: calc(var(--docs-header-height) + 1.5rem);
}
</style>
