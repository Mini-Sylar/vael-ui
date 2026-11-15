<template>
  <input
    class="ui-required-input"
    tabindex="-1"
    aria-hidden="true"
    required
    :value="filled ? 'on' : ''"
    :disabled="disabled || undefined"
    @invalid="focusControl"
    @focus="focusControl"
  />
</template>

<!-- A hidden input can't be validated, so an explicit `required` gets this stand-in: an empty value blocks a native submit and sends focus to the control. -->
<script setup lang="ts">
import './RequiredInput.css'

const props = defineProps<{
  /** Whether the control holds a value. */
  filled: boolean
  /** The control's focusable element. */
  control: () => HTMLElement | null | undefined
  disabled?: boolean
}>()

function focusControl() {
  props.control()?.focus()
}
</script>
