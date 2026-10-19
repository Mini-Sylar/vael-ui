<template>
  <section class="demo">
    <h3>Toggle buttons</h3>
    <p class="note">
      Give the group a <code>v-model</code> and each Button a <code>value</code>, and they turn on
      and off by themselves, with <code>aria-pressed</code> set for screen readers.
      <code>multiple</code> lets several be on at once. A Button's own <code>@click</code> still
      runs first; call <code>event.preventDefault()</code> there to keep it from toggling.
    </p>
    <div class="row">
      <ButtonGroup v-model="active" multiple aria-label="Text style">
        <Button
          v-for="style in styles"
          :key="style.value"
          :value="style.value"
          variant="outline"
          icon
          :aria-label="style.label"
        >
          <component :is="style.icon" weight="bold" />
        </Button>
      </ButtonGroup>
      <output class="panel-text">{{ active.length ? active.join(', ') : '(none)' }}</output>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, ButtonGroup } from 'vael-ui'
import {
  PhTextBolder,
  PhTextItalic,
  PhTextStrikethrough,
  PhTextUnderline,
} from '@phosphor-icons/vue'

const styles = [
  { value: 'bold', label: 'Bold', icon: PhTextBolder },
  { value: 'italic', label: 'Italic', icon: PhTextItalic },
  { value: 'underline', label: 'Underline', icon: PhTextUnderline },
  { value: 'strike', label: 'Strikethrough', icon: PhTextStrikethrough },
]
const active = shallowRef(['bold'])
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 1rem;
}
</style>
