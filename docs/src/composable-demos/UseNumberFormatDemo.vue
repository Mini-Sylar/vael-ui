<template>
  <section class="demo">
    <Field label="Price">
      <Input
        :model-value="text"
        inputmode="decimal"
        @beforeinput="onBeforeInput"
        @input="onInput"
        @blur="onBlur"
      >
        <template #start>$</template>
      </Input>
    </Field>
    <p class="demo-status">
      Parsed value: <strong>{{ value === null ? 'null' : value }}</strong>
    </p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Field, Input, useNumberFormat } from 'vael-ui'

// Decimal mode (not 'currency') since the $ sign is its own Input #start
// icon here, not Intl's own currency symbol — the more common real-world
// split between "fixed prefix affordance" and "the number itself".
const { format, parse, isPartial } = useNumberFormat({
  mode: 'decimal',
  minFractionDigits: 2,
  maxFractionDigits: 2,
})

const value = shallowRef<number | null>(1234.5)
const text = shallowRef(format(value.value))

// Same split InputNumber itself uses: isPartial only ever decides whether a
// KEYSTROKE is legal to type at all (a lone '-' or '1.' must not be
// rejected just because parse() can't resolve it yet) — it's not a gate on
// whether to commit. Committing just always tries parse() and takes
// whatever isn't null, on every change, partial-looking or not.
function onBeforeInput(event: InputEvent) {
  if (!event.data) return
  const target = event.target as HTMLInputElement
  const start = target.selectionStart ?? target.value.length
  const end = target.selectionEnd ?? target.value.length
  const next = target.value.slice(0, start) + event.data + target.value.slice(end)
  if (!isPartial(next) && parse(next) === null) event.preventDefault()
}

function onInput(event: Event) {
  const raw = (event.target as HTMLInputElement).value
  text.value = raw
  if (raw === '') {
    value.value = null
    return
  }
  // Only commit an actual parse — leave value at its last good number
  // while typing a transient invalid state ('-', '1.') instead of
  // flashing it to null on every keystroke that isn't parseable yet.
  const parsed = parse(raw)
  if (parsed !== null) value.value = parsed
}

function onBlur() {
  // On blur, always land on the canonical formatted string — this is
  // where InputNumber itself re-formats, not on every keystroke.
  text.value = format(value.value)
}
</script>

<style scoped>
.demo {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.75rem;
  inline-size: 12rem;
}

.demo-status {
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
