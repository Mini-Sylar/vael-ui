<template>
  <GuideLayout :links="[]">
    <h1>{{ t('i18nKeys.title') }}</h1>
    <p>{{ t('i18nKeys.intro') }}</p>
    <CodeBlock
      lang="typescript"
      code="import { useI18n } from 'vue-i18n'
import { ConfigProvider } from 'vael-ui'

const i18n = useI18n()"
    />
    <CodeBlock
      code='<ConfigProvider :i18n="i18n">
  <YourApp />
</ConfigProvider>'
    />

    <p>{{ t('i18nKeys.copyIntro') }}</p>
    <CodeBlock lang="json" :code="jsonSnippet" />

    <table>
      <thead>
        <tr>
          <th>{{ t('i18nKeys.key') }}</th>
          <th>{{ t('i18nKeys.englishDefault') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.key">
          <td>
            <code>{{ row.key }}</code>
          </td>
          <td>{{ row.value }}</td>
        </tr>
      </tbody>
    </table>
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { defaultMessages } from 'vael-ui'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'

const { t } = useI18n()

interface KeyRow {
  key: string
  value: string
}

function flatten(node: unknown, prefix: string, out: KeyRow[]): void {
  if (typeof node === 'string') {
    out.push({ key: prefix, value: node })
    return
  }
  if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) flatten(v, `${prefix}.${k}`, out)
  }
}

const rows = computed(() => {
  const out: KeyRow[] = []
  flatten(defaultMessages, 'uiKit', out)
  return out
})

const jsonSnippet = computed(() => {
  const tree: Record<string, unknown> = {}
  for (const row of rows.value) {
    const parts = row.key.split('.')
    let node = tree
    for (let i = 0; i < parts.length - 1; i++) {
      const key = parts[i]!
      if (!node[key]) node[key] = {}
      node = node[key] as Record<string, unknown>
    }
    node[parts[parts.length - 1]!] = row.value
  }
  return JSON.stringify(tree, null, 2)
})
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin-top: 1rem;
}

th,
td {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  vertical-align: top;
}

thead th {
  color: var(--ui-text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--ui-muted);
}
</style>
