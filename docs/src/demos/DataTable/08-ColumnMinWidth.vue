<template>
  <section class="demo">
    <h3>A least width for a sharing column</h3>
    <p class="note">
      <code>min-width</code> is the least width of a column that shares the room. Here the email
      <code>fill</code>s the box, but never gets narrower than 10rem: the table scrolls instead of
      squeezing it further.
    </p>
    <div class="narrow">
      <DataTable :data="members" row-key="id">
        <template #columns="{ Column }">
          <component :is="Column" field="email" label="Email" fill min-width="10rem" />
          <component :is="Column" field="role" label="Role" :width="90" />
          <component :is="Column" field="team" label="Team" :width="110" />
        </template>
      </DataTable>
    </div>
  </section>
</template>

<script setup lang="ts">
import { DataTable } from 'vael-ui'

const members = [
  { id: 1, email: 'ama.owusu-ansah@a-long-domain.example.com', role: 'Owner', team: 'Platform' },
  { id: 2, email: 'kofi@example.com', role: 'Admin', team: 'Growth' },
]
</script>

<style scoped>
.narrow {
  max-inline-size: 22rem;
}
</style>
