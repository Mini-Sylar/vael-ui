<template>
  <button data-testid="add" @click="items = [next++, ...items]">add</button>
  <button data-testid="sort" @click="items = [...items].reverse()">sort</button>
  <TransitionGroup
    tag="ul"
    v-bind="list.transition"
    style="margin: 0; padding: 0; list-style: none"
  >
    <li v-for="n in items" :key="n" :data-item="n" style="height: 30px">item {{ n }}</li>
  </TransitionGroup>
</template>

<script setup lang="ts" vapor>
// Built `vael-ui/vapor`: useMotion('list') on Vapor's TransitionGroup.
import { shallowRef } from 'vue'
import { useMotion } from 'vael-ui/vapor'

let next = 10
const items = shallowRef([1, 2, 3])
const list = useMotion('list')
</script>
