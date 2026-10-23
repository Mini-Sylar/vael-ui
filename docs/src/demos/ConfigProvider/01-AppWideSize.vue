<template>
  <section class="demo">
    <h3>One size for the whole app</h3>
    <p class="note">
      <code>size</code> sets the default for every button, field and table inside, so a dense
      dashboard doesn’t repeat <code>size="sm"</code> on each one. Switch it below and everything
      follows. A component’s own <code>size</code> still wins, like the
      <strong>Cancel</strong> button here.
    </p>
    <SelectButton
      v-model="density"
      :items="densities"
      :allow-empty="false"
      size="sm"
      aria-label="Density"
    />
    <ConfigProvider :size="density">
      <form class="form" @submit.prevent>
        <Input v-model="name" placeholder="Project name" />
        <Select v-model="plan" :items="plans" placeholder="Plan" aria-label="Plan" />
        <div class="row">
          <Switch v-model="publicProject" label="Public" />
          <Checkbox v-model="notify" label="Email me" />
        </div>
        <div class="row">
          <Button>Create project</Button>
          <Button variant="ghost" size="md">Cancel</Button>
        </div>
      </form>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Checkbox, ConfigProvider, Input, Select, SelectButton, Switch } from 'vael-ui'

const densities = [
  { label: 'Compact', value: 'sm' },
  { label: 'Default', value: 'md' },
  { label: 'Comfortable', value: 'lg' },
]
const density = shallowRef<'sm' | 'md' | 'lg'>('sm')
const plans = [
  { label: 'Free', value: 'free' },
  { label: 'Team', value: 'team' },
]
const name = shallowRef('')
const plan = shallowRef<string | null>(null)
const publicProject = shallowRef(false)
const notify = shallowRef(true)
</script>

<style scoped>
.form {
  display: grid;
  gap: 0.75rem;
  max-inline-size: 22rem;
  margin-block-start: 1rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
