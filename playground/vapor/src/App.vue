<template>
  <header class="demo-header">
    <h1>vael-ui/vapor — real components, real Vapor</h1>
    <ThemeToggle />
  </header>

  <section class="demo-section">
    <h2>Actions</h2>
    <div class="demo-row" data-testid="smoke-Button"><Button>Click</Button></div>
  </section>

  <section class="demo-section">
    <h2>Overlays</h2>
    <div class="demo-row" data-testid="smoke-Dialog">
      <Button @click="dialogOpen = true">Open dialog</Button>
      <Dialog v-model:open="dialogOpen" title="Real Dialog, real Vapor" aria-label="Smoke dialog">
        <template #default="{ close }">
          <p>This is the actual generated Dialog.vue component, not a lookalike.</p>
          <Button variant="outline" @click="close()">Close</Button>
        </template>
      </Dialog>
    </div>
    <div class="demo-row" data-testid="smoke-Popover">
      <Popover v-model:open="popoverOpen">
        <template #trigger="{ setTriggerEl }">
          <Button :ref="setTriggerEl" @click="popoverOpen = !popoverOpen">Popover</Button>
        </template>
        <template #default>Content</template>
      </Popover>
    </div>
    <div class="demo-row" data-testid="smoke-Tooltip">
      <Tooltip>
        <template #trigger="{ setTriggerEl }"><Button :ref="setTriggerEl">Hover</Button></template>
        <template #default>Tooltip text</template>
      </Tooltip>
    </div>
    <div class="demo-row" data-testid="smoke-Menu">
      <Menu :items="menuItems">
        <template #trigger><Button>Menu</Button></template>
      </Menu>
    </div>
    <!-- Wrapping div, not a fallthrough attr directly on TooltipHost: its root is a Teleport, which can't inherit attrs. -->
    <div data-testid="smoke-TooltipHost"><TooltipHost /></div>
  </section>

  <section class="demo-section">
    <h2>Navigation</h2>
    <div class="demo-row" data-testid="smoke-Tabs">
      <Tabs v-model:active="activeTab" :items="tabsItems">
        <template #default="{ items: list }">
          <div v-for="item in list" :key="item">{{ item }}</div>
        </template>
      </Tabs>
    </div>
    <div class="demo-row" data-testid="smoke-Dock"><Dock :items="dockItems" tooltips /></div>
  </section>

  <section class="demo-section">
    <h2>Forms</h2>
    <div class="demo-row" data-testid="smoke-Field">
      <Field label="Field label"><Input /></Field>
    </div>
    <div class="demo-row" data-testid="smoke-Input"><Input placeholder="Input" /></div>
    <div class="demo-row" data-testid="smoke-Textarea"><Textarea placeholder="Textarea" /></div>
    <div class="demo-row" data-testid="smoke-OtpInput"><OtpInput /></div>
    <div class="demo-row" data-testid="smoke-Checkbox"><Checkbox label="Check me" /></div>
    <div class="demo-row" data-testid="smoke-RadioGroup"><RadioGroup /></div>
    <div class="demo-row" data-testid="smoke-Switch"><Switch /></div>
    <div class="demo-row" data-testid="smoke-SelectButton">
      <SelectButton :items="selectButtonItems" />
    </div>
    <div class="demo-row" data-testid="smoke-Slider"><Slider /></div>
    <div class="demo-row" data-testid="smoke-Knob"><Knob :min="0" :max="10" /></div>
    <div class="demo-row" data-testid="smoke-Dial"><Dial :min="0" :max="10" /></div>
  </section>

  <section class="demo-section">
    <h2>Feedback</h2>
    <div class="demo-row" data-testid="smoke-Badge"><Badge :count="3" /></div>
    <div class="demo-row" data-testid="smoke-Chip"><Chip label="Chip" /></div>
    <div class="demo-row" data-testid="smoke-Tag"><Tag>Tag</Tag></div>
    <div class="demo-row" data-testid="smoke-Progress"><Progress :value="40" /></div>
    <div class="demo-row" data-testid="smoke-Skeleton"><Skeleton /></div>
    <div class="demo-row" data-testid="smoke-Loader"><Loader /></div>
  </section>

  <section class="demo-section">
    <h2>Layout &amp; display</h2>
    <div class="demo-row" data-testid="smoke-Card"><Card title="Card title">Body</Card></div>
    <div class="demo-row" data-testid="smoke-Avatar"><Avatar name="Ama Mensah" /></div>
    <div class="demo-row" data-testid="smoke-Kbd"><Kbd>K</Kbd></div>
    <div class="demo-row" data-testid="smoke-Accordion"><Accordion /></div>
    <div class="demo-row" data-testid="smoke-Collapsible"><Collapsible /></div>
    <div class="demo-row" data-testid="smoke-Calendar"><Calendar /></div>
    <div class="demo-row" data-testid="smoke-Separator"><Separator /></div>
    <div class="demo-row" data-testid="smoke-ConfigProvider"><ConfigProvider /></div>
  </section>

  <section class="demo-section">
    <h2>Gestures</h2>
    <div class="demo-row" data-testid="smoke-SwipeToReveal">
      <SwipeToReveal>
        <template #actions>Delete</template>
        <template #default>Content</template>
      </SwipeToReveal>
    </div>
    <div class="demo-row" data-testid="smoke-PullToRefresh">
      <PullToRefresh :on-refresh="onRefresh">Pull content</PullToRefresh>
    </div>
    <div class="demo-row" data-testid="smoke-Resizable">
      <Resizable v-model:size="resizableSize" />
    </div>
  </section>
</template>

<script setup lang="ts" vapor>
// Every vael-ui/vapor component mounted with minimal, sane props — no interop
// plugin, a genuinely pure-Vapor tree.
import {
  Accordion,
  Avatar,
  Badge,
  Button,
  Calendar,
  Card,
  Checkbox,
  Chip,
  Collapsible,
  ConfigProvider,
  Dial,
  Dialog,
  Dock,
  Field,
  Input,
  Kbd,
  Knob,
  Loader,
  Menu,
  OtpInput,
  Popover,
  Progress,
  PullToRefresh,
  RadioGroup,
  Resizable,
  SelectButton,
  Separator,
  Skeleton,
  Slider,
  SwipeToReveal,
  Switch,
  Tabs,
  Tag,
  Textarea,
  Tooltip,
  TooltipHost,
} from 'vael-ui/vapor'
import { shallowRef } from 'vue'
import ThemeToggle from './ThemeToggle.vue'

const dialogOpen = shallowRef(false)
const popoverOpen = shallowRef(false)
const dockItems = [
  { label: 'Finder', value: 'finder' },
  { label: 'Mail', value: 'mail' },
]
const menuItems = [
  { label: 'Rename', value: 'rename' },
  { label: 'Delete', value: 'delete' },
]
const selectButtonItems = [
  { label: 'Day', value: 'day' },
  { label: 'Week', value: 'week' },
]
const tabsItems = ['alpha', 'beta']
const activeTab = shallowRef('alpha')
const resizableSize = shallowRef(200)

function onRefresh() {
  return new Promise<void>((resolve) => setTimeout(resolve, 10))
}
</script>
