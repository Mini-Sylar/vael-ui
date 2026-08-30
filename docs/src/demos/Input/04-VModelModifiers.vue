<template>
  <section class="demo">
    <h3>v-model modifiers</h3>
    <div class="row">
      <Input
        v-model.trim="trimValue"
        placeholder=".trim, try leading/trailing spaces"
        class="input-fixed"
      />
      <Input v-model.lazy="lazyValue" placeholder=".lazy, commits on blur" class="input-fixed" />
    </div>
    <p class="note">trim: "{{ trimValue }}" / lazy: "{{ lazyValue }}"</p>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Input } from 'vael-ui'

const trimValue = shallowRef('')
const lazyValue = shallowRef('')
</script>

<style scoped>
.input-fixed {
  max-width: 16rem;
}
</style>
