<template>
  <section class="demo">
    <h3>Status variants</h3>
    <div class="message-stack">
      <Message title="Heads up" variant="default">
        A plain informational message. <code>role="status"</code> by default.
      </Message>
      <Message title="Saved" variant="success">Your changes were saved successfully.</Message>
      <Message title="Something went wrong" variant="error">
        The request failed. <code>role="alert"</code> by default.
      </Message>
      <Message title="Storage almost full" variant="warning">
        You're at 92% of your plan's storage. <code>role="alert"</code> by default.
      </Message>
      <Message title="New feature" variant="info">Custom domains are now available.</Message>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Message } from 'vael-ui'
</script>

<style scoped>
.message-stack {
  display: grid;
  gap: 0.75rem;
  max-width: 28rem;
}
</style>
