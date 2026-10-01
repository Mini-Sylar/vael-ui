<template>
  <Dialog :open="true" aria-label="Footer edge dialog">
    <p>Body text</p>
    <button data-testid="last" style="outline: 3px solid red; outline-offset: 0">
      Last control
    </button>
    <template #footer>
      <button data-testid="footer-action">Save</button>
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from '../../src/components/Dialog/Dialog.vue'
</script>
