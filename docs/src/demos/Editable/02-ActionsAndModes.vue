<template>
  <section class="demo">
    <h3>Save and cancel buttons, double-click to open</h3>
    <p class="note">
      <code>activation-mode="dblclick"</code> keeps a single click free for selecting text, and
      <code>submit-mode="enter"</code> means leaving the field drops the change, so the buttons in
      <code>#actions</code> are the way to commit with the pointer.
    </p>
    <Editable v-model="title" activation-mode="dblclick" submit-mode="enter" aria-label="Title">
      <template #actions="{ submit, cancel }">
        <Button size="sm" @click="submit">Save</Button>
        <Button size="sm" variant="ghost" @click="cancel">Cancel</Button>
      </template>
    </Editable>
    <p class="demo-status">Title: {{ title }}</p>

    <h3>Any control in #edit</h3>
    <p class="note">
      <code>#edit</code> hands you the draft and an <code>update</code> function, so the control can
      be a Textarea, a Select, a date picker. Enter stays a new line in a textarea; Cmd or Ctrl with
      Enter saves, and so does leaving.
    </p>
    <Editable v-model="note" placeholder="Add a note" aria-label="Note" class="note-editable">
      <template #preview="{ value }">
        <span class="note-preview">{{ value || 'Add a note' }}</span>
      </template>
      <template #edit="{ value, update }">
        <Textarea :model-value="value" :rows="3" aria-label="Note" @update:model-value="update" />
      </template>
    </Editable>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Editable, Textarea } from 'vael-ui'

const title = shallowRef('Double-click me')
const note = shallowRef('Ship the roadmap by Friday.\nCheck with Ama on the budget line.')
</script>

<style scoped>
.note-editable {
  max-inline-size: 24rem;
}
.note-preview {
  white-space: pre-wrap;
}
</style>
