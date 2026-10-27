<!-- Message with every part: an icon, a title and description, actions and a close button. -->
<template>
  <div data-specimen class="specimen">
    <Message variant="error" title="Payment failed" closable>
      Update your card to keep the Team plan.
      <template #actions>
        <Button size="sm" variant="outline">Retry</Button>
      </template>
    </Message>
  </div>
</template>

<script setup lang="ts">
import { Button, Message } from 'vael-ui'
</script>

<style scoped>
.specimen {
  inline-size: min(24rem, 100%);
}
</style>
