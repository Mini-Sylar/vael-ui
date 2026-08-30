<template>
  <section class="demo">
    <h3>Notification badge: the <code>#badge</code> slot</h3>
    <p class="note">
      Button owns the positioned wrapper (<code>badgePlacement</code>, default
      <code>top-end</code>); <code>Badge</code> stays the same context-free component it is
      everywhere else. The wrapper only exists when a badge is actually rendered, so it costs
      nothing on every other Button in this file.
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
