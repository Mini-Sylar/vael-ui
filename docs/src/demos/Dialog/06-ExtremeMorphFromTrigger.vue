<template>
  <section class="demo">
    <h3>Extreme: the dialog morphs out of its button</h3>
    <p class="note">
      <code>morph: 'trigger'</code> grows the panel out of the button that opened it, with the
      button's colour and corners handing over to the surface, and shrinks it back on close.
      <code>exitOrder: 'reverse'</code> lets the contents leave before the panel folds away. The
      backdrop fades on the same progress.
    </p>
    <Button @click="open = true">Invite teammates</Button>

    <Dialog
      v-model:open="open"
      size="sm"
      :motion="morph"
      title="Invite teammates"
      description="They get an email with a link to join this workspace."
    >
      <Input v-model="email" type="email" aria-label="Email" placeholder="name@company.com" />
      <template #footer="{ close }">
        <Button variant="secondary" @click="close()">Cancel</Button>
        <Button @click="close()">Send invite</Button>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, Input } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'

const open = shallowRef(false)
const email = shallowRef('')

const morph: DialogMotion = { morph: 'trigger', exitOrder: 'reverse' }
</script>
