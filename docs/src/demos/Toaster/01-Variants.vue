<template>
  <section class="demo">
    <h3>Variants</h3>
    <p class="note">
      <code>toast()</code> is a plain function you can call from anywhere, with no hooks or context.
      The single <code>&lt;Toaster /&gt;</code> mounted once in <code>App.vue</code> renders every
      toast. Hover the stack to expand it and pause every timer; each one resumes with the time it
      had left. Drag a card sideways, or toward its edge, to swipe it away.
    </p>
    <div class="row">
      <Button @click="toast('Simple notification')">Default</Button>
      <Button variant="secondary" @click="toast.success('Changes saved')">Success</Button>
      <Button variant="secondary" @click="toast.error('Could not save changes')">Error</Button>
      <Button variant="secondary" @click="toast.warning('Storage almost full')">Warning</Button>
      <Button variant="secondary" @click="toast.info('New version available')">Info</Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button, toast } from 'vael-ui'
</script>
