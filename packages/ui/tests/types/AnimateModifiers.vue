<!-- Type test: vue-tsc checks v-animate's modifiers, presets and springs. -->
<template>
  <div v-animate.rise />
  <div v-animate.pop.bouncy />
  <div v-animate:rows.fade.stagger />
  <div v-animate.rise="{ delay: 0.1, initial: { y: 16 } }" />
  <div v-animate="{ initial: { opacity: 0 }, spring: 'gentle', stagger: 'center' }" />
  <div v-animate="'drop'" />
  <button v-animate="{ states: { hover: { scale: 1.03 }, active: { scale: 0.97 } } }" />
  <!-- @vue-expect-error `pressed` isn't a state: it's `active` -->
  <button v-animate="{ states: { pressed: { scale: 0.97 } } }" />
  <!-- @vue-expect-error a misspelled entrance -->
  <div v-animate.rsie />
  <!-- @vue-expect-error not a spring -->
  <div v-animate="{ initial: { opacity: 0 }, spring: 'wobbly' }" />
  <!-- @vue-expect-error not a stagger word -->
  <div v-animate="{ initial: { opacity: 0 }, stagger: 'middle' }" />
</template>

<script setup lang="ts">
import { vAnimate } from '../../src/directives/vAnimate'
</script>
