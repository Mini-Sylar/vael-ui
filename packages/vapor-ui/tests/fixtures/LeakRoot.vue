<template>
  <Button v-if="which === 'Button hold'" :hold="200">Hold</Button>
  <template v-else-if="which === 'Input'">
    <Input v-model="text" animated placeholder="Search" aria-label="a" />
    <Input v-model="text" aria-label="b">
      <template #display="{ value }">{{ value }}</template>
    </Input>
  </template>
  <Textarea v-else-if="which === 'Textarea'" v-model="text" aria-label="t">
    <template #display="{ value }">{{ value }}</template>
  </Textarea>
  <InputNumber v-else-if="which === 'InputNumber'" v-model="num" animated scrub aria-label="n" />
  <OtpInput v-else-if="which === 'OtpInput'" v-model="code" aria-label="code" />
  <Select
    v-else-if="which === 'Select'"
    v-model="pick"
    v-model:open="open"
    :items="items"
    aria-label="s"
  />
  <Combobox
    v-else-if="which === 'Combobox'"
    v-model="pick"
    v-model:open="open"
    :items="items"
    aria-label="c"
  />
  <Menu v-else-if="which === 'Menu'" v-model:open="open" :items="items">
    <template #trigger><button>menu</button></template>
  </Menu>
  <MenuList v-else-if="which === 'MenuList'" :items="items" active="b" aria-label="m" />
  <Tree v-else-if="which === 'Tree'" :items="tree" />
  <TreeSelect v-else-if="which === 'TreeSelect'" v-model:open="open" :items="tree" />
  <Tabs v-else-if="which === 'Tabs'" v-model:active="tab" :items="['one', 'two', 'three']" />
  <SelectButton v-else-if="which === 'SelectButton'" v-model="pick" :items="items" />
  <Pagination v-else-if="which === 'Pagination'" v-model:page="page" :total="200" />
  <Calendar v-else-if="which === 'Calendar'" v-model="date" />
  <DataTable v-else-if="which === 'DataTable'" :data="rows" row-key="id" />
  <Dialog v-else-if="which === 'Dialog'" v-model:open="open" origin="trigger" title="d" />
  <Popover v-else-if="which === 'Popover'" v-model:open="open" aria-label="p">
    <template #trigger><button>pop</button></template>
    body
  </Popover>
  <CommandPalette v-else-if="which === 'CommandPalette'" v-model:open="open" :items="commands" />
  <AnimatedNumber v-else-if="which === 'AnimatedNumber'" :value="num" />
  <AnimatedText v-else-if="which === 'AnimatedText'" :value="text || 'x'" />
  <ConfigProvider v-else-if="which === 'ConfigProvider'" :motion="{ spring }" haptics>
    <MenuList :items="items" active="a" aria-label="m" />
    <Switch v-model="on" label="s" />
  </ConfigProvider>
  <Editable v-else-if="which === 'Editable'" v-model="text" aria-label="e" />
  <ColorPicker v-else-if="which === 'ColorPicker'" v-model:open="open" aria-label="color" />
  <ScrollArea v-else-if="which === 'ScrollArea'" style="block-size: 60px">
    <div style="block-size: 400px" />
  </ScrollArea>
  <Sortable v-else-if="which === 'Sortable'" v-model:items="list" item-key="id" label-key="label">
    <template #item="{ item }">{{ item.label }}</template>
  </Sortable>
</template>

<script setup lang="ts" vapor>
import { ref, shallowRef } from 'vue'
import {
  AnimatedNumber,
  AnimatedText,
  Button,
  Calendar,
  ColorPicker,
  Combobox,
  CommandPalette,
  ConfigProvider,
  DataTable,
  Dialog,
  Editable,
  Input,
  InputNumber,
  Menu,
  MenuList,
  OtpInput,
  Pagination,
  Popover,
  ScrollArea,
  Select,
  SelectButton,
  Sortable,
  Switch,
  Tabs,
  Textarea,
  Tree,
  TreeSelect,
} from 'vael-ui/vapor'

defineProps<{ which: string }>()

const items = [
  { label: 'Alpha', value: 'a' },
  { label: 'Beta', value: 'b' },
  { label: 'Gamma', value: 'c' },
]
const commands = [
  { id: 1, label: 'One' },
  { id: 2, label: 'Two' },
]
const tree = [
  { label: 'Root', value: 'root', children: [{ label: 'Leaf', value: 'leaf' }] },
  { label: 'Other', value: 'other' },
]
const rows = [
  { id: 1, name: 'One' },
  { id: 2, name: 'Two' },
]
const list = ref([
  { id: 1, label: 'One' },
  { id: 2, label: 'Two' },
])
const spring = { damping: 0.6, response: 0.3 }
const text = shallowRef('hello')
const num = shallowRef(12)
const code = shallowRef('')
const pick = shallowRef<string | null>(null)
const open = shallowRef(true)
const tab = shallowRef('one')
const page = shallowRef(1)
const date = shallowRef<Date | null>(null)
const on = shallowRef(false)
</script>
