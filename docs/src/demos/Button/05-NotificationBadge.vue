<template>
  <section class="demo">
    <h3>Notification badge: the <code>#badge</code> slot</h3>
    <p class="note">
      Button renders the positioned wrapper (<code>badgePlacement</code>, default
      <code>top-end</code>), and <code>Badge</code> stays the same component it is everywhere else.
      The wrapper renders only when you use a badge, through a <code>#badge</code> slot or a set
      <code>badgePlacement</code>, so other Buttons don’t render it.
    </p>
    <div class="row">
      <Button variant="secondary" icon aria-label="Notifications">
        <template #badge>
          <Badge dot variant="danger" />
        </template>
        <PhBell weight="bold" />
      </Button>
      <Button variant="secondary" icon aria-label="Messages">
        <template #badge>
          <Badge variant="danger" :count="unread" />
        </template>
        <PhEnvelopeSimple weight="bold" />
      </Button>
      <Button size="sm" variant="ghost" @click="unread++">+1 unread</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Badge, Button } from 'vael-ui'
import { PhBell, PhEnvelopeSimple } from '@phosphor-icons/vue'

const unread = shallowRef(2)
</script>
