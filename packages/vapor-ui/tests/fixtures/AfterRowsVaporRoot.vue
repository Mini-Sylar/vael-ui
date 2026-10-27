<template>
  <Drawer v-model:open="open" title="Cart">
    <p
      v-for="row in ['A', 'B']"
      :key="row"
      v-animate:rows="{ initial: { opacity: 0, x: 16 }, after: 'panel:70%' }"
      class="row"
    >
      {{ row }}
    </p>
  </Drawer>
</template>

<script setup lang="ts" vapor>
// A drawer whose rows wait on its panel, opened for the first time.
import { shallowRef } from 'vue'
import { Drawer } from 'vael-ui/vapor'
import { vAnimateVapor as vAnimate } from 'vael-ui/motion'

const open = shallowRef(false)
defineExpose({ open })
</script>
