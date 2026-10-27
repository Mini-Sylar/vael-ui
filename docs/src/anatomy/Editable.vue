<!-- Editable with every part: one at rest showing its preview, one open with its input and actions. -->
<template>
  <div data-specimen class="specimen">
    <Editable v-model="team" aria-label="Team name" />
    <!-- Held open from outside, so the edit area, its input and the actions show. -->
    <Editable
      ref="editor"
      v-model="email"
      :editing="open"
      aria-label="Billing email"
      @update:editing="() => {}"
    >
      <template #actions>
        <Button size="sm">Save</Button>
        <Button size="sm" variant="ghost">Cancel</Button>
      </template>
    </Editable>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, shallowRef, useTemplateRef } from 'vue'
import { Button, Editable } from 'vael-ui'

const team = shallowRef('Analytical Engine team')
const email = shallowRef('billing@lovelace.dev')
const open = shallowRef(false)
const editor = useTemplateRef('editor')
// start() fills the input with the text; opening a tick later leaves focus on the page.
onMounted(async () => {
  editor.value?.start()
  await nextTick()
  open.value = true
})
</script>

<style scoped>
.specimen {
  display: grid;
  gap: 1rem;
  inline-size: min(22rem, 100%);
}
</style>
