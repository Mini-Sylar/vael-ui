<template>
  <section class="demo">
    <h3>One spring for everything</h3>
    <p class="note">
      <code>:motion="{ spring }"</code> takes a damping and a response, and the drawer, the number
      and the tab indicator all move on it. The label's crossfade keeps its own quick timing. Below
      1, damping overshoots. Bind it to the sliders and the whole app retunes live. Open the drawer,
      change the number and switch tabs.
    </p>
    <div class="tuning">
      <Field :label="`Damping ${damping}`">
        <Slider v-model="damping" :min="0.3" :max="1" :step="0.05" />
      </Field>
      <Field :label="`Response ${response}s`">
        <Slider v-model="response" :min="0.2" :max="0.8" :step="0.05" />
      </Field>
    </div>
    <ConfigProvider :motion="{ spring: { damping, response } }">
      <div class="stage">
        <Tabs v-model:active="tab" :items="['orders', 'returns', 'refunds']">
          <template #default="{ items, itemProps, indicatorProps }">
            <span v-bind="indicatorProps('underline')" />
            <button v-for="item in items" :key="item" v-bind="itemProps(item)">
              {{ item[0]!.toUpperCase() + item.slice(1) }}
            </button>
          </template>
        </Tabs>
        <div class="row">
          <AnimatedNumber :value="count" class="count" />
          <Button variant="secondary" size="sm" @click="count += 137">
            <AnimatedText :value="count % 2 ? 'Add more' : 'Add 137'" />
          </Button>
          <Button size="sm" @click="open = true">Open drawer</Button>
        </div>
        <Drawer v-model:open="open" title="Order 1042">
          <p>Opens and closes on the spring.</p>
        </Drawer>
      </div>
    </ConfigProvider>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import {
  AnimatedNumber,
  AnimatedText,
  Button,
  ConfigProvider,
  Drawer,
  Field,
  Slider,
  Tabs,
} from 'vael-ui'

const damping = shallowRef(0.55)
const response = shallowRef(0.45)
const tab = shallowRef('orders')
const count = shallowRef(1280)
const open = shallowRef(false)
</script>

<style scoped>
.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-block-end: 1rem;
}
.tuning {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 1rem;
  max-inline-size: 24rem;
  margin-block-end: 1rem;
}
.stage {
  display: grid;
  gap: 1rem;
}
.count {
  min-inline-size: 5ch;
  font-size: 1.75rem;
  font-weight: 600;
}
</style>
