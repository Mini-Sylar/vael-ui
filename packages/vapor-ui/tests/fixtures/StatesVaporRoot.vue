<template>
  <Input data-testid="field" :invalid="invalid" :motion="inputMotion" />
  <button data-testid="toggle" @click="invalid = !invalid">toggle</button>
  <Button data-testid="press" :motion="buttonMotion">Press</Button>
  <Accordion v-model:value="open" :motion="accordionMotion">
    <AccordionItem value="a" title="A">Body</AccordionItem>
  </Accordion>
</template>

<script setup lang="ts" vapor>
// The built Vapor components with `states`: shake on entering invalid, press held, chevron held.
import { shallowRef } from 'vue'
import { Accordion, AccordionItem, Button, Input } from 'vael-ui/vapor'
import type { AccordionMotion, ButtonMotion, InputMotion } from 'vael-ui'

const invalid = shallowRef(false)
const open = shallowRef<string | undefined>(undefined)
defineExpose({ open })
const inputMotion: InputMotion = { states: { invalid: { root: { x: [0, -6, 6, 0] } } } }
const buttonMotion: ButtonMotion = { states: { active: { label: { scale: '0.8' } } } }
const accordionMotion: AccordionMotion = { states: { open: { chevron: { rotate: '-90deg' } } } }
</script>
