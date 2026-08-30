<template>
  <section class="demo">
    <h3>Loading state</h3>
    <p class="note">
      <code>loading="auto"</code> opts a button into promise-driven loading — returning a promise
      from <code>@click</code> is then all the wiring it needs. It's opt-in rather than the default
      because any thenable counts, including ones with no user-facing meaning (a router navigation's
      own promise, say). <code>loader="inline"</code> keeps the label visible and puts the spinner
      next to it instead of covering the button.
    </p>
    <div class="row">
      <Button loading="auto" @click="fakeSave">Save changes</Button>
      <Button loading="auto" loader="inline" variant="secondary" @click="fakeSave">
        <template #default="{ loading }">
          {{ loading ? 'Saving…' : 'Save as draft' }}
        </template>
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { Button } from 'vael-ui'

const fakeSave = () => new Promise((resolve) => setTimeout(resolve, 1400))
</script>
