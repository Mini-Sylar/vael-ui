<template>
  <section class="demo">
    <h3>Loading state</h3>
    <p class="note">
      With <code>loading="auto"</code>, the button shows its loading state while the promise
      returned from <code>@click</code> is pending. It’s opt-in because any thenable counts,
      including ones that mean nothing to the user, such as a router navigation’s promise.
      <code>loader="inline"</code> keeps the label visible and puts the spinner beside it instead of
      over the button.
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
