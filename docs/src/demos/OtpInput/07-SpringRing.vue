<template>
  <section class="demo">
    <h3>A ring that glides or springs between cells</h3>
    <p class="note">
      One ring follows the active cell with the caret, so typing, Backspace and the arrow keys move
      it like the highlight in a list. It follows <code>ConfigProvider</code>'s
      <code>indicator</code>: <code>'glide'</code> (the default), <code>'instant'</code> or a
      spring. Type a code, then press Backspace a few times.
    </p>
    <div class="row">
      <SelectButton
        v-model="choice"
        :items="choices"
        :allow-empty="false"
        size="sm"
        aria-label="Ring motion"
      />
    </div>
    <ConfigProvider :indicator="modes[choice]">
      <div class="row">
        <Field label="Verification code">
          <OtpInput v-model="code" size="lg" />
        </Field>
        <Field label="Field variant">
          <OtpInput v-model="fieldCode" variant="field" size="lg" />
        </Field>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { ConfigProvider, Field, OtpInput, SelectButton } from 'vael-ui'
import type { IndicatorMode } from 'vael-ui'

const modes: Record<string, IndicatorMode> = {
  glide: 'glide',
  instant: 'instant',
  jelly: { damping: 0.5, response: 0.3 },
}
const choices = [
  { label: 'Glide', value: 'glide' },
  { label: 'Instant', value: 'instant' },
  { label: 'Jelly spring', value: 'jelly' },
]
const choice = shallowRef('jelly')
const code = shallowRef('')
const fieldCode = shallowRef('')
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1.5rem;
  margin-block-end: 1rem;
}
</style>
