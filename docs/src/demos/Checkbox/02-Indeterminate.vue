<template>
  <section class="demo">
    <h3>Indeterminate</h3>
    <p class="note">
      A “Select all” checkbox whose state comes from the boxes below it, not from its own model. It
      shows <code>indeterminate</code> while only some are checked.
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
    <p class="demo-status">Selected: {{ fruits.length ? fruits.join(', ') : '(none)' }}</p>
  </section>
</template>

<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { Checkbox } from 'vael-ui'

const ALL_FRUITS = ['apple', 'banana', 'cherry']
const fruits = shallowRef<string[]>(['banana'])
const allSelected = computed(() => fruits.value.length === ALL_FRUITS.length)
const someSelected = computed(() => fruits.value.length > 0 && !allSelected.value)
function toggleAll(checked: boolean | unknown[]) {
  fruits.value = checked === true ? [...ALL_FRUITS] : []
}
</script>
