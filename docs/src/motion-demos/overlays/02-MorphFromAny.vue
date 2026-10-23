<template>
  <section class="demo">
    <h3>Morph from any element</h3>
    <table class="orders">
      <tbody>
        <tr v-for="order in orders" :key="order.id" @click="show(order, $event)">
          <td>{{ order.id }}</td>
          <td>{{ order.customer }}</td>
          <td>{{ order.total }}</td>
        </tr>
      </tbody>
    </table>
    <Dialog
      v-model:open="open"
      size="sm"
      :title="`Order ${current?.id}`"
      :description="current?.customer"
      :motion="motion"
    >
      <p>Total {{ current?.total }}, ready to ship.</p>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Dialog } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const orders = [
  { id: '#1042', customer: 'Maya Chen', total: '$84.00' },
  { id: '#1043', customer: 'Tom Okafor', total: '$129.50' },
  { id: '#1044', customer: 'Lena Fischer', total: '$32.20' },
]

const open = shallowRef(false)
const current = shallowRef<(typeof orders)[number]>()
let row: HTMLElement | null = null

// Grows out of the clicked row; the row stays visible underneath.
const motion: DialogMotion = { morph: { from: () => row, hide: false } }

function show(order: (typeof orders)[number], event: MouseEvent) {
  row = event.currentTarget as HTMLElement
  current.value = order
  open.value = true
}
</script>

<style scoped>
.orders {
  inline-size: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}
td {
  padding: 0.625rem 0.75rem;
  border-block-end: 1px solid var(--ui-border);
  cursor: pointer;
}
tr:hover {
  background: var(--ui-surface);
}
</style>
