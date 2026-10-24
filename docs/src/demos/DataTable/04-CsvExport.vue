<template>
  <section class="demo">
    <h3>CSV export</h3>
    <p class="note">
      Build the CSV from the same rows and columns the table shows, and download it as a
      <code>Blob</code>. Values that contain a comma, a quote or a line break are quoted.
    </p>
    <DataTable :data="orders" row-key="id">
      <template #toolbar>
        <Button size="sm" variant="outline" @click="download">
          <template #leading><PhDownloadSimple /></template>
          Export CSV
        </Button>
      </template>
      <template #columns="{ Column }">
        <component
          :is="Column"
          v-for="column in columns"
          :key="column.field"
          :field="column.field"
          :label="column.label"
        />
      </template>
    </DataTable>
  </section>
</template>

<script setup lang="ts">
import { Button, DataTable } from 'vael-ui'
import { PhDownloadSimple } from '@phosphor-icons/vue'

interface Order {
  id: string
  customer: string
  total: number
  note: string
}

const orders: Order[] = [
  { id: 'A-1001', customer: 'Mira Chen', total: 128.5, note: 'Gift wrap' },
  { id: 'A-1002', customer: 'Tom Okafor', total: 42, note: 'Leave at "back door"' },
  { id: 'A-1003', customer: 'Ruiz, Ana', total: 310.25, note: '' },
]

const columns: { field: keyof Order; label: string }[] = [
  { field: 'id', label: 'Order' },
  { field: 'customer', label: 'Customer' },
  { field: 'total', label: 'Total' },
  { field: 'note', label: 'Note' },
]

function toCsv<T>(rows: T[], cols: { field: keyof T; label: string }[]) {
  const cell = (value: unknown) => {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
  }
  const header = cols.map((col) => cell(col.label)).join(',')
  const lines = rows.map((row) => cols.map((col) => cell(row[col.field])).join(','))
  return [header, ...lines].join('\r\n')
}

function download() {
  const blob = new Blob([toCsv(orders, columns)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'orders.csv'
  link.click()
  // Revoked once the download has started.
  setTimeout(() => URL.revokeObjectURL(url))
}
</script>
