<template>
  <section class="demo">
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

const ALL_FRUITS = ['apple', 'banana', 'cherry']
const fruits = shallowRef<string[]>(['banana'])
const allSelected = computed(() => fruits.value.length === ALL_FRUITS.length)
const someSelected = computed(() => fruits.value.length > 0 && !allSelected.value)
function toggleAll(checked: boolean | unknown[]) {
  fruits.value = checked === true ? [...ALL_FRUITS] : []
}
</script>
