<template>
  <section class="demo">
    <h3>On a button</h3>
    <div class="row">
      <Button icon variant="outline" aria-label="Notifications, 3 unread">
        <template #badge>
          <Badge variant="danger" :count="3" />
        </template>
        <PhBell />
      </Button>
      <Button icon variant="outline" aria-label="Messages, new">
        <template #badge>
          <Badge dot variant="primary" />
        </template>
        <PhChatCircle />
      </Button>
      <Button variant="secondary">
        <template #badge>
          <Badge variant="info" :count="128" />
        </template>
        Inbox
      </Button>
      <Button icon variant="outline" badge-placement="bottom-end" aria-label="Cart, 2 items">
        <template #badge>
          <Badge variant="success" :count="2" />
        </template>
        <PhShoppingCart />
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Badge, Button } from 'vael-ui'
import { PhBell, PhChatCircle, PhShoppingCart } from '@phosphor-icons/vue'
</script>
