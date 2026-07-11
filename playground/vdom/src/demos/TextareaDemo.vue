<template>
  <section class="demo">
    <h2>Textarea</h2>
    <p class="note">
      Same model/slot contract as Input, plus <code>rows</code>/<code>autoGrow</code>/<code
        >maxRows</code
      >
      and a full-width in-frame action strip (<code>#bottom-start</code>/<code>#bottom-end</code>)
      under the text.
    </p>

    <h3>Fixed rows (default)</h3>
    <Textarea v-model="fixedValue" :rows="3" placeholder="Doesn't grow" class="textarea-fixed" />

    <h3>Auto-grow — native <code>field-sizing: content</code>, capped at <code>maxRows</code></h3>
    <p class="note">Type past the visible rows and watch it grow, up to 8 rows, then scroll.</p>
    <Textarea
      v-model="growValue"
      auto-grow
      :rows="2"
      :max-rows="8"
      placeholder="Keep typing…"
      class="textarea-fixed"
    />

    <h3><code>#start</code>/<code>#end</code> and the bottom action strip</h3>
    <Textarea v-model="composerValue" auto-grow :rows="2" :max-rows="6" class="textarea-fixed">
      <template #start>
        <span class="textarea-avatar" aria-hidden="true">AL</span>
      </template>
      <template #bottom-start>
        <Button size="sm" variant="ghost">Attach</Button>
      </template>
      <template #bottom-end>
        <span class="note char-count">{{ composerValue.length }}/280</span>
        <Button size="sm" :disabled="!composerValue">Post</Button>
      </template>
    </Textarea>

    <h3>Inside a Field</h3>
    <Field label="Bio" description="Shown on your public profile." label-placement="top">
      <Textarea v-model="bioValue" :rows="3" />
    </Field>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Field, Textarea } from 'vael-ui'

const fixedValue = shallowRef('')
const growValue = shallowRef('')
const composerValue = shallowRef('')
const bioValue = shallowRef('')
</script>

<style scoped>
.textarea-fixed {
  max-width: 28rem;
  margin-block-end: 0.75rem;
}
.textarea-avatar {
  display: grid;
  place-items: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  border-radius: 9999px;
  background: var(--ui-muted);
  font-size: 0.6875rem;
  font-weight: 600;
}
.char-count {
  margin-inline-end: 0.5rem;
}
</style>
