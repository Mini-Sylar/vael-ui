<template>
  <section class="demo">
    <h3>Basics, CSS transition, footer slot, nested dialogs</h3>
    <div class="row">
      <Button @click="cssOpen = true">Rename project</Button>
      <Button variant="outline" @click="outerOpen = true">Nested dialogs</Button>
    </div>

    <Dialog
      v-model:open="cssOpen"
      aria-label="CSS dialog"
      title="Rename project"
      description="The new name is visible to everyone in the workspace."
    >
      <template #default>
        <p>
          Body content goes here. The header above and footer below are the built-in chrome
          (title/description props plus the <code>#footer</code> slot).
        </p>
      </template>
      <template #footer="{ close }">
        <Button variant="ghost" @click="close()">Cancel</Button>
        <Button @click="() => fakeTask().then(close)">Save changes</Button>
      </template>
    </Dialog>

    <Dialog v-model:open="outerOpen" aria-label="Outer dialog" title="Outer dialog">
      <template #default>
        <p>
          Escape here closes this dialog, unless the nested one below is open, in which case Escape
          closes that one first.
        </p>
        <Button variant="secondary" @click="innerOpen = true">Open nested dialog</Button>

        <Dialog v-model:open="innerOpen" aria-label="Inner dialog" title="Inner dialog" size="sm">
          <template #default>
            <p>Topmost: this is the one Escape and Tab act on right now.</p>
          </template>
        </Dialog>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog } from 'vael-ui'

const cssOpen = shallowRef(false)
const outerOpen = shallowRef(false)
const innerOpen = shallowRef(false)

const fakeTask = () => new Promise((resolve) => setTimeout(resolve, 1200))
</script>
