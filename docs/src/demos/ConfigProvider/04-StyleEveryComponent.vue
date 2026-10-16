<template>
  <section class="demo">
    <h3>Style every component from one place</h3>
    <p class="note">
      <code>theme</code> takes a <code>ui</code> override per component, the same shape as each
      component's own <code>ui</code> prop. Set it once on <code>ConfigProvider</code> and every
      Button, Card, Input and Tag inside picks it up. A component's own <code>ui</code> still layers
      on top, like the <strong>Skip</strong> button here.
    </p>
    <div class="row" style="margin-bottom: 1rem">
      <SelectButton v-model="look" :items="looks" :allow-empty="false" size="sm" />
    </div>
    <ConfigProvider :theme="theme">
      <Card title="Invite your team" description="They get an email with a link to join.">
        <div class="stack">
          <Input v-model="email" placeholder="name@company.com" />
          <div class="row">
            <Tag variant="success">Admin</Tag>
            <Tag>Editor</Tag>
            <Tag>Viewer</Tag>
          </div>
        </div>
        <template #footer>
          <div class="row">
            <Button>Send invite</Button>
            <Button variant="ghost" :ui="{ root: { style: { textTransform: 'none' } } }">
              Skip
            </Button>
          </div>
        </template>
      </Card>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Button, Card, ConfigProvider, Input, SelectButton, Tag } from 'vael-ui'
import type { UiTheme } from 'vael-ui'

const looks = [
  { label: 'Default', value: 'default' },
  { label: 'Editorial', value: 'editorial' },
]
const look = shallowRef('editorial')
const email = shallowRef('')

const editorial: UiTheme = {
  radius: '0px',
  button: {
    ui: { root: { style: { textTransform: 'uppercase', letterSpacing: '0.06em' } } },
  },
  card: {
    ui: {
      root: {
        style: { border: '2px solid var(--ui-text)', boxShadow: '4px 4px 0 var(--ui-text)' },
      },
    },
  },
  input: {
    ui: { root: { style: { borderWidth: '0 0 2px', borderColor: 'var(--ui-text)' } } },
  },
  tag: {
    ui: { root: { style: { background: 'transparent', border: '1px solid currentColor' } } },
  },
}

const theme = computed(() => (look.value === 'editorial' ? editorial : undefined))
</script>

<style scoped>
.stack {
  display: grid;
  gap: 0.75rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
</style>
