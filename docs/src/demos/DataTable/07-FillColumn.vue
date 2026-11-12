<template>
  <section class="demo">
    <h3>A column that takes what's left</h3>
    <p class="note">
      <code>fill</code> gives a column the room the others leave, and no more: a long value that
      doesn't wrap, such as an email, ends in an ellipsis instead of widening the table past its
      box.
    </p>
    <div class="narrow">
      <DataTable :data="members" row-key="id">
        <template #columns="{ Column }">
          <component :is="Column" field="email" label="Email" fill />
          <component :is="Column" field="role" label="Role" :width="90" />
        </template>
      </DataTable>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DataTable } from 'vael-ui'

const members = [
  { id: 1, email: 'ama.owusu-ansah@a-very-long-company-domain.example.com', role: 'Owner' },
  { id: 2, email: 'kofi@example.com', role: 'Admin' },
  { id: 3, email: 'efua.boateng.operations@example.com', role: 'Member' },
]
</script>

<style scoped>
.narrow {
  max-inline-size: 22rem;
}
</style>
