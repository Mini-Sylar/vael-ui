<template>
  <section class="demo">
    <h2>Checkbox</h2>
    <p class="note">
      A real native <code>&lt;input type="checkbox"&gt;</code>, visually hidden under a styled
      indicator: free form participation, free label-click activation, native
      <code>:focus-visible</code> (no tracked-modality attribute needed for toggles, unlike text
      inputs).
    </p>

    <h3>Sizes and states</h3>
    <div class="row">
      <Checkbox v-model="basic" size="sm" label="Small" />
      <Checkbox v-model="basic" size="md" label="Medium" />
      <Checkbox :model-value="true" label="Checked" disabled />
      <Checkbox :model-value="false" label="Unchecked" disabled />
      <Checkbox v-model="invalidChecked" label="Invalid" invalid />
    </div>

    <h3>Indeterminate</h3>
    <p class="note">
      A "select all" checkbox driven by its children's state, not by its own model.
    </p>
    <div class="row">
      <Checkbox
        :model-value="allSelected"
        :indeterminate="someSelected"
        label="Select all"
        @update:model-value="toggleAll"
      />
    </div>
    <div class="row">
      <Checkbox v-model="fruits" value="apple" label="Apple" name="fruits" />
      <Checkbox v-model="fruits" value="banana" label="Banana" name="fruits" />
      <Checkbox v-model="fruits" value="cherry" label="Cherry" name="fruits" />
    </div>
    <p class="note">Selected: {{ fruits.length ? fruits.join(', ') : '(none)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Checkbox } from 'vael-ui'

const basic = shallowRef(false)
const invalidChecked = shallowRef(false)

const ALL_FRUITS = ['apple', 'banana', 'cherry']
const fruits = shallowRef<string[]>(['banana'])
const allSelected = computed(() => fruits.value.length === ALL_FRUITS.length)
const someSelected = computed(() => fruits.value.length > 0 && !allSelected.value)
function toggleAll(checked: boolean | unknown[]) {
  fruits.value = checked === true ? [...ALL_FRUITS] : []
}
</script>
