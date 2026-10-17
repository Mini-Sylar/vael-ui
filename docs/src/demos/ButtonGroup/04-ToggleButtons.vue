<template>
  <section class="demo">
    <h3>Toggle buttons</h3>
    <p class="note">
      Bind <code>:aria-pressed</code> to make a button a toggle. Screen readers hear it as pressed,
      and the button shows it, with no extra prop. Any number can be on. When exactly one option is
      chosen, use <code>SelectButton</code> instead.
    </p>
    <div class="row">
      <ButtonGroup aria-label="Text style">
        <Button
          v-for="style in styles"
          :key="style.value"
          variant="outline"
          icon
          :aria-label="style.label"
          :aria-pressed="active.has(style.value)"
          @click="toggle(style.value)"
        >
          <component :is="style.icon" weight="bold" />
        </Button>
      </ButtonGroup>
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
const active = shallowRef(new Set(['bold']))

function toggle(value: string) {
  const next = new Set(active.value)
  if (next.has(value)) next.delete(value)
  else next.add(value)
  active.value = next
}
</script>
