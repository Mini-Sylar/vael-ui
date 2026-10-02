<template>
  <section class="demo">
    <h3>Extreme: joined cells under pressure</h3>
    <p class="note">
      Each toggle tests a different case. RTL mirrors the labels, cells and corners, and size makes
      the cells follow the control's radius and font size. The currency cell mounts at runtime and
      the float label moves to clear it. An error recolors the whole row, and the Select inside the
      cell keeps its own state.
    </p>
    <p class="note">
      The last row is a hand-built <code>&lt;input&gt;</code> that joins through
      <code>data-ui-frame</code> and Field's <code>data-join-*</code> and <code>data-focused</code>
      attributes (see Advanced in the styling guide). The copy button animates with motion-v.
    </p>
    <div class="toolbar">
      <SelectButton v-model="size" :items="sizes" size="sm" :allow-empty="false" />
      <Switch v-model="rtl" label="RTL" />
      <Switch v-model="currency" label="Currency cell" />
      <Switch v-model="invalid" label="Error" />
      <Switch v-model="brand" label="Brand theme" />
    </div>

    <div class="stage" :dir="rtl ? 'rtl' : 'ltr'" :class="{ brand }">
      <Field label="Amount" label-placement="float">
        <template v-if="currency" #prepend>
          <Select v-model="code" :items="codes" :size="size" aria-label="Currency" />
        </template>
        <InputNumber v-model="amount" :size="size" />
      </Field>

      <Field
        label="Billing contact email address"
        label-placement="start"
        attached
        :label-width="132"
        :error="invalid ? 'That address bounced last month.' : undefined"
      >
        <Input v-model="email" type="email" :size="size" />
        <template #append>
          <Button
            variant="ghost"
            :size="size"
            icon
            :aria-label="copied ? 'Copied' : 'Copy email'"
            @click="copy"
          >
            <AnimatePresence mode="wait" :initial="false">
              <motion.span
                :key="copied ? 'check' : 'copy'"
                class="icon-swap"
                :initial="{ scale: 0.4, opacity: 0, rotate: -45 }"
                :animate="{ scale: 1, opacity: 1, rotate: 0 }"
                :exit="{ scale: 0.4, opacity: 0, rotate: 45 }"
                :transition="{ type: 'spring', duration: 0.3, bounce: 0.4 }"
              >
                <PhCheck v-if="copied" weight="bold" />
                <PhCopy v-else weight="bold" />
              </motion.span>
            </AnimatePresence>
          </Button>
        </template>
      </Field>

      <Field label="Plan" label-placement="end" attached :ui="{ prepend: 'cell-accent' }">
        <template #prepend><PhStack weight="bold" /></template>
        <Select v-model="plan" :items="plans" :size="size" />
      </Field>

      <Field label="Notes" label-placement="start" attached :label-width="132">
        <Textarea v-model="notes" :size="size" :rows="2" auto-grow :max-rows="8" />
        <template #append>{{ notes.length }}/280</template>
      </Field>

      <Field label="Own control" label-placement="start" attached :label-width="132">
        <template #prepend>#</template>
        <input v-model="tag" class="own-frame" data-ui-frame placeholder="A hand-built input" />
      </Field>
    </div>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { AnimatePresence, motion } from 'motion-v'
import { Button, Field, Input, InputNumber, Select, SelectButton, Switch, Textarea } from 'vael-ui'
import { PhCheck, PhCopy, PhStack } from '@phosphor-icons/vue'

const sizes = [
  { label: 'sm', value: 'sm' },
  { label: 'md', value: 'md' },
  { label: 'lg', value: 'lg' },
]
const size = shallowRef<'sm' | 'md' | 'lg'>('md')
const rtl = shallowRef(false)
const currency = shallowRef(true)
const invalid = shallowRef(false)
const brand = shallowRef(false)

const code = shallowRef('GHS')
const codes = [
  { label: 'GHS', value: 'GHS' },
  { label: 'USD', value: 'USD' },
  { label: 'EUR', value: 'EUR' },
]
const amount = shallowRef<number | null>(2500)
const email = shallowRef('billing@example.com')
const plan = shallowRef('team')
const plans = [
  { label: 'Free', value: 'free' },
  { label: 'Pro', value: 'pro' },
  { label: 'Team', value: 'team' },
]
const notes = shallowRef('Type a few lines: the cells stretch with the Textarea as it grows.')
const tag = shallowRef('')

const copied = shallowRef(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined
function copy() {
  void navigator.clipboard?.writeText(email.value).catch(() => {})
  copied.value = true
  clearTimeout(resetTimer)
  resetTimer = setTimeout(() => (copied.value = false), 1400)
}
</script>

<style scoped>
.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-block-end: 1rem;
}
.stage {
  display: grid;
  gap: 0.875rem;
  max-width: 30rem;
}
/* Theming through the cell variables, scoped to one wrapper. */
.stage.brand {
  --ui-field-cell-bg: color-mix(in oklab, var(--ui-primary) 12%, var(--ui-surface));
  --ui-field-cell-color: var(--ui-primary);
}
/* Theming one field's cell through the ui prop. */
.stage :deep(.cell-accent) {
  color: var(--ui-primary);
}
.icon-swap {
  display: inline-grid;
  place-items: center;
}
/* A hand-built control: unlayered CSS beats Field's layered join rules, so it reads Field's state hooks itself. */
.own-frame {
  min-inline-size: 0;
  block-size: 2.25rem;
  padding-inline: 0.75rem;
  border: 1px solid var(--ui-border);
  border-radius: 0.5rem;
  background: var(--ui-surface);
  color: var(--ui-text);
  font: inherit;
  outline: none;
}
:deep(.ui-field[data-join-start]) .own-frame {
  border-start-start-radius: 0;
  border-end-start-radius: 0;
}
:deep(.ui-field[data-focused]) .own-frame {
  border-color: var(--ui-primary);
}
</style>
