<template>
  <section class="demo">
    <h3>Results from a server</h3>
    <p class="note">
      <code>loading</code> shows a spinner instead of “No results” while a search is out, and the
      results replace it when they arrive. The <code>#loading</code> slot replaces the spinner. Open
      it and type a name, such as “ko”.
    </p>
    <div class="row">
      <Button variant="outline" @click="open = true">Search teammates</Button>
      <Switch v-model="custom" label="Custom loading text" />
    </div>
    <CommandPalette
      v-model:open="open"
      v-model:query="query"
      :items="results"
      :filter="() => true"
      :loading="loading"
      placeholder="Search teammates…"
    >
      <template v-if="custom" #loading>Asking the server…</template>
    </CommandPalette>
  </section>
</template>

<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { Button, CommandPalette, Switch } from 'vael-ui'
import type { CommandPaletteItem } from 'vael-ui'

const people = ['Ama Owusu', 'Kofi Boateng', 'Kojo Mensah', 'Efua Asante', 'Yaw Darko']

const open = shallowRef(false)
const custom = shallowRef(false)
const query = shallowRef('')
const loading = shallowRef(false)
const results = shallowRef<CommandPaletteItem[]>([])

// Stands in for your API: it answers after a moment, and the newest search wins.
let search = 0
watch(query, (text) => {
  const id = ++search
  loading.value = text.length > 0
  setTimeout(() => {
    if (id !== search) return
    loading.value = false
    results.value = text
      ? people
          .filter((name) => name.toLowerCase().includes(text.toLowerCase()))
          .map((name) => ({ id: name, label: name }))
      : []
  }, 800)
})
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
}
</style>
