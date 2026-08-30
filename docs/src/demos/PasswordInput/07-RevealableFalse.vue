<template>
  <section class="demo">
    <h3><code>revealable=false</code></h3>
    <p class="note">For forms that never want the value shown in plain text.</p>
    <PasswordInput
      v-model="hidden"
      :revealable="false"
      hint-placement="none"
      placeholder="Never revealed"
      autocomplete="new-password"
    />
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { PasswordInput } from 'vael-ui'

const hidden = shallowRef('')
</script>
