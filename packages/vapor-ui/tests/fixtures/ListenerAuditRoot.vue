<template>
  <div>
    <CascadeSelect
      v-if="show('cascade')"
      v-model="city"
      :items="cities"
      data-testid="audit-cascade"
      placeholder="City"
      @click="log('cascade-click')"
      @keydown="log('cascade-keydown')"
    />
    <Rating
      v-if="show('rating')"
      v-model="stars"
      data-testid="audit-rating"
      @pointerdown="log('rating-pointerdown')"
      @pointermove="log('rating-pointermove')"
      @keydown="log('rating-keydown')"
    />
    <Dock
      v-if="show('dock')"
      data-testid="audit-dock"
      aria-label="Apps"
      :items="apps"
      @pointermove="log('dock-pointermove')"
    />
    <Tabs
      v-if="show('tabs')"
      v-model:active="tab"
      :items="tabs"
      data-testid="audit-tabs"
      @keydown="log('tabs-keydown')"
    >
      <template #default="{ active, select, items }">
        <button
          v-for="item in items"
          :key="item"
          role="tab"
          :aria-selected="active === item"
          :tabindex="active === item ? 0 : -1"
          :data-testid="`audit-tab-${item}`"
          @click="select(item)"
        >
          {{ item }}
        </button>
      </template>
    </Tabs>
    <Toolbar
      v-if="show('toolbar')"
      aria-label="Format"
      data-testid="audit-toolbar"
      @keydown="log('toolbar-keydown')"
    >
      <Button data-testid="audit-bold">Bold</Button>
      <Button>Italic</Button>
    </Toolbar>
    <MenuList
      v-if="show('menulist')"
      :items="menu"
      data-testid="audit-menulist"
      @keydown="log('menulist-keydown')"
    />
    <Switch
      v-if="show('switch')"
      v-model="on"
      data-testid="audit-switch"
      @click="log('switch-click')"
      @keydown="log('switch-keydown')"
    />
    <Checkbox
      v-if="show('checkbox')"
      v-model="checked"
      data-testid="audit-checkbox"
      @click="log('checkbox-click')"
    />
    <Slider
      v-if="show('slider')"
      v-model="level"
      data-testid="audit-slider"
      @pointerdown="log('slider-pointerdown')"
      @keydown="log('slider-keydown')"
    />
    <Knob
      v-if="show('knob')"
      v-model="level"
      data-testid="audit-knob"
      @keydown="log('knob-keydown')"
    />
    <SelectButton
      v-if="show('selectbutton')"
      v-model="size"
      :items="sizes"
      data-testid="audit-selectbutton"
      @click="log('selectbutton-click')"
    />
  </div>
</template>

<script setup lang="ts" vapor>
import { ref } from 'vue'
import {
  Button,
  CascadeSelect,
  Checkbox,
  Dock,
  Knob,
  MenuList,
  Rating,
  SelectButton,
  Slider,
  Switch,
  Tabs,
  Toolbar,
} from 'vael-ui/vapor'

const props = defineProps<{ events: string[]; only?: string }>()
const show = (name: string) => !props.only || props.only === name
function log(name: string) {
  props.events.push(name)
}

const city = ref<string | null>(null)
const cities = [
  { label: 'Ghana', value: 'gh', children: [{ label: 'Accra', value: 'accra' }] },
  { label: 'Togo', value: 'tg', children: [{ label: 'Lome', value: 'lome' }] },
]
const stars = ref(0)
const apps = [
  { label: 'Mail', value: 'mail' },
  { label: 'Notes', value: 'notes' },
  { label: 'Files', value: 'files' },
]
const on = ref(false)
const checked = ref(false)
const level = ref(50)
const size = ref('s')
const sizes = [
  { label: 'S', value: 's' },
  { label: 'M', value: 'm' },
]
const tab = ref('one')
const tabs = ['one', 'two', 'three']
const menu = [
  { label: 'Home', value: 'home' },
  { label: 'Reports', value: 'reports' },
  { label: 'Settings', value: 'settings' },
]
</script>
