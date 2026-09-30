<template>
  <section class="demo">
    <h3>Animated count</h3>
    <div class="row">
      <Button icon variant="outline" :aria-label="`Notifications, ${count} unread`">
        <template #badge>
          <Badge variant="danger" :count="count" />
        </template>
        <PhBell />
      </Button>
      <Button icon variant="outline" :aria-label="`Notifications, ${count} unread`">
        <template #badge>
          <Badge variant="danger" :count="count" :animated="false" />
        </template>
        <PhBell />
      </Button>
      <Button size="sm" variant="secondary" @click="count++">Add one</Button>
      <Button size="sm" variant="ghost" @click="count = 0">Clear</Button>
    </div>
    <p class="demo-status">Left animates the change. Right sets <code>:animated="false"</code>.</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Badge, Button } from 'vael-ui'
import { PhBell } from '@phosphor-icons/vue'

const count = shallowRef(3)
</script>
