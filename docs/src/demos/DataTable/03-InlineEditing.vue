<template>
  <section class="demo">
    <h3>Inline editing</h3>
    <p class="note">
      Put an <code>Editable</code> in a column’s <code>#cell</code> slot and bind it to the row’s
      field. Enter or leaving the cell saves, and Escape cancels. Save the change to your server in
      the <code>submit</code> event.
    </p>
    <DataTable :data="products" row-key="id">
      <template #columns="{ Column }">
        <component :is="Column" field="name" label="Product">
          <template #cell="{ row }">
            <Editable
              v-model="row.name"
              :aria-label="`Name of ${row.name}`"
              size="sm"
              @submit="save(row)"
            />
          </template>
        </component>
        <component :is="Column" field="price" label="Price" width="9rem">
          <template #cell="{ row }">
            <Editable
              :model-value="row.price.toFixed(2)"
              :aria-label="`Price of ${row.name}`"
              size="sm"
              @update:model-value="setPrice(row, $event)"
              @submit="save(row)"
            />
          </template>
        </component>
        <component :is="Column" field="stock" label="In stock" width="7rem" />
      </template>
    </DataTable>
    <p class="demo-status" aria-live="polite">{{ lastSaved }}</p>
  </section>
</template>

<script setup lang="ts">
import { reactive, shallowRef } from 'vue'
import { DataTable, Editable } from 'vael-ui'

interface Product {
  id: number
  name: string
  price: number
  stock: number
}

// reactive, so editing a row's field updates the table.
const products = reactive<Product[]>([
  { id: 1, name: 'Desk lamp', price: 39, stock: 12 },
  { id: 2, name: 'Notebook', price: 4.5, stock: 140 },
  { id: 3, name: 'Monitor stand', price: 59.9, stock: 7 },
  { id: 4, name: 'Cable tray', price: 18, stock: 31 },
])

function setPrice(row: Product, value: string) {
  const price = Number.parseFloat(value.replace(',', '.'))
  // Anything that isn't a price keeps the old one.
  if (Number.isFinite(price) && price >= 0) row.price = Math.round(price * 100) / 100
}

const lastSaved = shallowRef('')
function save(row: Product) {
  lastSaved.value = `Saved ${row.name} at $${row.price.toFixed(2)}`
}
</script>
