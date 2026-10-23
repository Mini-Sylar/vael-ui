<template>
  <section class="demo">
    <SelectButton v-model="choice" :items="items" />
    <ConfigProvider :motion="motion">
      <div class="row">
        <Button @click="open = true">Invite teammate</Button>
        <Button variant="outline" @click="toast.success('Invite sent')">Send invite</Button>
        <Button variant="ghost">Save draft</Button>
        <Button variant="secondary">Archive</Button>
      </div>
      <Dialog v-model:open="open" title="Invite teammate">
        <p>They will get an email with a link to join the project.</p>
      </Dialog>
      <Toaster />
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { Button, ConfigProvider, Dialog, SelectButton, Toaster, toast } from 'vael-ui'
import type { MotionStyle } from 'vael-ui'

const styles: Record<string, MotionStyle> = {
  calm: { version: 1, spring: { damping: 1, response: 0.4 } },
  playful: {
    version: 1,
    spring: { damping: 0.6, response: 0.4 },
    overlay: { initial: { opacity: 0, scale: '0.85' } },
    list: { stagger: 0.06 },
    press: { active: { scale: '0.9' } },
  },
}
const items = [
  { label: 'Calm', value: 'calm' },
  { label: 'Playful', value: 'playful' },
]
const choice = ref('calm')
const motion = computed(() => styles[choice.value])
const open = ref(false)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 1rem;
}
</style>
