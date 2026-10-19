<template>
  <section class="demo">
    <h3>Option groups</h3>
    <p class="note">
      The same <code>{ label, items }</code> entries as Select. Typing filters inside each group and
      hides a group with no match, and arrow keys move through every group. The
      <code>#group-label</code> slot shows how many of each group still match.
    </p>
    <div class="row">
      <Field label="Ingredient">
        <Combobox v-model="ingredient" :items="ingredients" placeholder="Search ingredients">
          <template #group-label="{ group, items }">
            {{ group.label }} <span class="group-count">{{ items.length }}</span>
          </template>
        </Combobox>
      </Field>
      <output class="panel-text">{{ ingredient ?? '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Combobox, Field } from 'vael-ui'

const ingredients = [
  {
    label: 'Fruit',
    items: [
      { label: 'Apple', value: 'apple' },
      { label: 'Banana', value: 'banana' },
      { label: 'Mango', value: 'mango' },
    ],
  },
  {
    label: 'Vegetables',
    items: [
      { label: 'Carrot', value: 'carrot' },
      { label: 'Spinach', value: 'spinach' },
      { label: 'Sweet potato', value: 'sweet-potato' },
    ],
  },
  {
    label: 'Herbs',
    items: [
      { label: 'Basil', value: 'basil' },
      { label: 'Mint', value: 'mint' },
    ],
  },
]
const ingredient = shallowRef<string | null>(null)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1rem;
}
.group-count {
  margin-inline-start: 0.25rem;
  font-variant-numeric: tabular-nums;
}
</style>
