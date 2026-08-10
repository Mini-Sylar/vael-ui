<template>
  <output data-testid="value">{{ JSON.stringify(value) }}</output>
  <Accordion
    ref="accordion"
    v-model:value="value"
    :multiple="multiple"
    :collapsible="collapsible"
    :motion-css="motionCss"
    @change="onChange"
  >
    <AccordionItem ref="firstItem" value="first" title="First section">
      First panel content.
    </AccordionItem>
    <AccordionItem value="second" title="Second section">Second panel content.</AccordionItem>
    <AccordionItem value="third" title="Disabled section" disabled>
      Never shown open.
    </AccordionItem>
  </Accordion>
</template>

<script setup lang="ts">
import { shallowRef, useTemplateRef } from 'vue'
import Accordion from '../../src/components/Accordion/Accordion.vue'
import AccordionItem from '../../src/components/AccordionItem/AccordionItem.vue'

// collapsible/motionCss need explicit defaults matching Accordion's own — an
// absent boolean prop resolves to false, not undefined, so without this the
// fixture silently forwards false and defeats Accordion's real true defaults.
// (multiple's own absent-default of false already happens to match.)
const props = withDefaults(
  defineProps<{
    multiple?: boolean
    collapsible?: boolean
    motionCss?: boolean
    initial?: string | string[] | null
  }>(),
  { collapsible: true, motionCss: true },
)

const value = shallowRef<string | string[] | null>(props.initial ?? null)
const changes: Array<string | string[] | null> = []
function onChange(next: string | string[] | null) {
  changes.push(next)
}

const accordion = useTemplateRef('accordion')
const firstItem = useTemplateRef('firstItem')

defineExpose({ changes, accordion, firstItem })
</script>
