<template>
  <section class="demo">
    <h3>Option groups</h3>
    <p class="note">
      Put <code>{ label, items }</code> entries in <code>items</code> to list options under a group
      label, like a native <code>&lt;optgroup&gt;</code>. Arrow keys and typing move through every
      group, the search box hides groups with no match, and screen readers announce each group's
      name. To show more than the name, such as an icon or a count, use the
      <code>#group-label</code> slot; the extreme examples below show how.
    </p>
    <div class="row">
      <Field label="Office">
        <Select v-model="office" :items="offices" placeholder="Choose an office" filter clearable />
      </Field>
      <Field label="Offices">
        <Select v-model="offices2" :items="offices" placeholder="Choose offices" multiple />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Select } from 'vael-ui'
import type { SelectGroupData, SelectItemData } from 'vael-ui'

const offices: (SelectItemData | SelectGroupData)[] = [
  { label: 'Remote', value: 'remote' },
  {
    label: 'Ghana',
    items: [
      { label: 'Accra', value: 'accra' },
      { label: 'Kumasi', value: 'kumasi' },
      { label: 'Takoradi', value: 'takoradi' },
    ],
  },
  {
    label: 'Nigeria',
    items: [
      { label: 'Lagos', value: 'lagos' },
      { label: 'Abuja', value: 'abuja' },
    ],
  },
  {
    label: 'Kenya',
    items: [
      { label: 'Nairobi', value: 'nairobi' },
      { label: 'Mombasa', value: 'mombasa', disabled: true },
    ],
  },
]
const office = shallowRef<string | null>(null)
const offices2 = shallowRef<string[]>([])
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
