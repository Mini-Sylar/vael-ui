<template>
  <section class="demo">
    <h2>Input</h2>
    <p class="note">
      <code>inheritAttrs: false</code>: the native <code>&lt;input&gt;</code> gets
      <code>maxlength</code>/<code>autocomplete</code>/<code>name</code>/listeners, the root frame
      gets <code>class</code>/<code>style</code>. Clicking anywhere on the frame focuses the input,
      unless the click lands on an interactive <code>#start</code>/<code>#end</code> child.
    </p>

    <h3>Sizes</h3>
    <div class="row">
      <Input v-model="sizeValue" size="sm" placeholder="Small" />
      <Input v-model="sizeValue" size="md" placeholder="Medium" />
      <Input v-model="sizeValue" size="lg" placeholder="Large" />
    </div>

    <h3><code>#start</code> / <code>#end</code> slots</h3>
    <p class="note">The library owns the wrapper spans, icons/kbd hints only fill them.</p>
    <div class="row">
      <Input v-model="searchValue" placeholder="Search..." class="input-fixed">
        <template #start>
          <PhMagnifyingGlass weight="bold" />
        </template>
        <template #end>
          <kbd class="input-kbd">⌘K</kbd>
        </template>
      </Input>
      <Input v-model="copyValue" placeholder="Click the button, not the frame" class="input-fixed">
        <template #end>
          <Button size="sm" variant="ghost" icon aria-label="Copy link" @click="onCopyClick">
            <PhCopy weight="bold" />
          </Button>
        </template>
      </Input>
    </div>
    <p class="note">Copy button clicks: {{ copyClicks }}</p>

    <h3>States</h3>
    <div class="row">
      <Input placeholder="Disabled" disabled />
      <Input placeholder="Readonly" readonly model-value="Can't edit this" />
      <Input placeholder="Invalid" invalid />
    </div>

    <h3>v-model modifiers</h3>
    <div class="row">
      <Input
        v-model.trim="trimValue"
        placeholder=".trim, try leading/trailing spaces"
        class="input-fixed"
      />
      <Input v-model.lazy="lazyValue" placeholder=".lazy, commits on blur" class="input-fixed" />
    </div>
    <p class="note">trim: "{{ trimValue }}" / lazy: "{{ lazyValue }}"</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Input } from 'vael-ui'
import { PhCopy, PhMagnifyingGlass } from '@phosphor-icons/vue'

const sizeValue = shallowRef('')
const searchValue = shallowRef('')
const copyValue = shallowRef('https://vael-ui.dev')
const copyClicks = shallowRef(0)
function onCopyClick() {
  copyClicks.value++
}
const trimValue = shallowRef('')
const lazyValue = shallowRef('')
</script>

<style scoped>
.input-fixed {
  max-width: 16rem;
}
.input-kbd {
  font: inherit;
  font-size: 0.6875rem;
  padding: 0.0625rem 0.375rem;
  border: 1px solid var(--ui-border-strong);
  border-radius: 4px;
  color: var(--ui-text-muted);
}
</style>
