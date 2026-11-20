<template>
  <div class="va">
    <SelectButton
      v-model="form"
      :items="forms"
      size="sm"
      :allow-empty="false"
      :aria-label="t('motionDocs.anatomy.label')"
    />
    <div class="va-code" role="group" :aria-label="t('motionDocs.anatomy.label')">
      <div v-for="(line, i) in lines" :key="`${form}-${i}`" class="va-line">
        <template v-for="(part, j) in line" :key="j">
          <button
            v-if="part.token"
            v-tooltip="t(`motionDocs.anatomy.tips.${part.token}`)"
            type="button"
            class="va-token"
            :class="[`va-token--${part.token}`, { 'va-token--on': active === part.token }]"
            @mouseenter="active = part.token"
            @focus="active = part.token"
            @click="active = part.token"
          >
            {{ part.text }}
          </button>
          <span v-else class="va-plain">{{ part.text }}</span>
        </template>
      </div>
    </div>
    <p class="va-explain" aria-live="polite">
      <strong>{{ t(`motionDocs.anatomy.roles.${active}`) }}:</strong>
      {{ explanation }}
    </p>
    <p class="va-rule">{{ t('motionDocs.anatomy.rule') }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { SelectButton, vTooltip } from 'vael-ui'

type Token = 'directive' | 'name' | 'modifier' | 'value' | 'none'
type Form = 'alone' | 'group' | 'component'
interface Part {
  text: string
  token?: Token
}

const { t } = useI18n()

const forms = computed(() =>
  (['alone', 'group', 'component'] as const).map((id) => ({
    label: t(`motionDocs.anatomy.forms.${id}`),
    value: id,
  })),
)

// Each form's code, a part at a time: the parts with a token explain themselves.
const code: Record<Form, Part[][]> = {
  alone: [
    [
      { text: '<p ' },
      { text: 'v-animate', token: 'directive' },
      { text: '(no name)', token: 'none' },
      { text: '.rise', token: 'modifier' },
      { text: '>Saved</p>' },
    ],
  ],
  group: [
    [
      { text: '<li v-for="row in rows" ' },
      { text: 'v-animate', token: 'directive' },
      { text: ':rows', token: 'name' },
      { text: '.rise', token: 'modifier' },
      { text: '="{ stagger: true }"', token: 'value' },
      { text: '>' },
    ],
  ],
  component: [
    [
      { text: '<Dialog :motion="{ targets: { ' },
      { text: 'rows', token: 'name' },
      { text: ': … } }">' },
    ],
    [
      { text: '  <li v-for="row in rows" ' },
      { text: 'v-animate', token: 'directive' },
      { text: ':rows', token: 'name' },
      { text: '>' },
    ],
  ],
}

const form = shallowRef<Form>('group')
const active = shallowRef<Token>('name')
const lines = computed(() => code[form.value])
// Picking a form starts on the part that decides it: the name, or its absence.
watch(form, (next) => (active.value = next === 'alone' ? 'none' : 'name'))

const explanation = computed(() =>
  active.value === 'name'
    ? t(`motionDocs.anatomy.name.${form.value === 'component' ? 'component' : 'group'}`)
    : t(`motionDocs.anatomy.${active.value}`),
)
</script>

<style scoped>
.va {
  display: grid;
  gap: 0.75rem;
  margin-block: 1rem;
}
.va-code {
  overflow-x: auto;
  padding: 1rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius);
  background: var(--ui-muted);
  font-family: var(--ui-font-mono, ui-monospace, monospace);
  font-size: 0.875rem;
  line-height: 2;
}
.va-line {
  white-space: pre;
}
.va-plain {
  color: var(--ui-text-muted);
}
.va-token {
  padding: 0.125rem 0.25rem;
  border: 1px solid transparent;
  border-radius: 6px;
  background: color-mix(in oklch, var(--hue) 16%, transparent);
  color: var(--ui-text);
  font: inherit;
  cursor: help;
  transition: border-color 120ms ease;
}
.va-token:hover,
.va-token--on {
  border-color: color-mix(in oklch, var(--hue) 70%, transparent);
}
.va-token:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: 2px;
}
.va-token--directive {
  --hue: oklch(0.6 0 0);
}
.va-token--name {
  --hue: oklch(0.65 0.17 250);
}
.va-token--modifier {
  --hue: oklch(0.65 0.17 150);
}
.va-token--value {
  --hue: oklch(0.72 0.15 70);
}
.va-token--none {
  --hue: oklch(0.6 0 0);
  border: 1px dashed var(--ui-border-strong);
  background: transparent;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}
.va-explain {
  margin: 0;
  min-block-size: 3.25rem;
  line-height: 1.5;
}
.va-explain strong {
  margin-inline-end: 0.25rem;
}
.va-rule {
  margin: 0;
  color: var(--ui-text-muted);
  font-size: 0.875rem;
}
</style>
