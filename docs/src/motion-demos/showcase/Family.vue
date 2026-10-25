<!-- A floating sheet that rises from the bottom; its views cross-fade in place while it eases to each height. -->
<template>
  <section class="demo">
    <h3>Wallet sheet</h3>
    <Button variant="outline" pill @click="start">Wallet options</Button>
    <Dialog
      v-model:open="open"
      position="bottom"
      aria-label="Wallet options"
      :scroll-fade="false"
      :motion="motion"
      :ui="{
        panel: 'wallet-panel',
        body: 'wallet-body',
        close: { class: 'wallet-close', style: closeAt },
      }"
    >
      <template #default="{ close }">
        <div :key="view" v-animate="swap" class="view">
          <template v-if="view === 'options'">
            <h4 class="title bar">Options</h4>
            <div class="rows">
              <button
                v-for="o in options"
                :key="o.view"
                type="button"
                class="row"
                :data-danger="o.view === 'remove' || undefined"
                @click="view = o.view"
              >
                <component :is="o.icon" :size="20" />{{ o.label }}
              </button>
            </div>
          </template>
          <template v-else>
            <component
              :is="details[view].icon"
              :size="48"
              class="mark"
              :data-danger="view === 'remove' || undefined"
            />
            <h4 class="title">{{ details[view].title }}</h4>
            <p class="text">{{ details[view].body }}</p>
            <ul v-if="view !== 'remove'" class="points">
              <li v-for="p in points" :key="p.text">
                <component :is="p.icon" :size="20" />{{ p.text }}
              </li>
            </ul>
            <div class="actions">
              <button type="button" class="pill" @click="view = 'options'">Cancel</button>
              <button
                type="button"
                class="pill"
                :data-tone="view === 'remove' ? 'danger' : 'accent'"
                @click="close()"
              >
                <PhScanSmiley v-if="view !== 'remove'" :size="20" />{{
                  view === 'remove' ? 'Continue' : 'Reveal'
                }}
              </button>
            </div>
          </template>
        </div>
      </template>
    </Dialog>
  </section>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import { Button, Dialog, vAnimate } from 'vael-ui'
import type { DialogMotion } from 'vael-ui'
import {
  PhArticle,
  PhKey,
  PhLock,
  PhNote,
  PhProhibit,
  PhScanSmiley,
  PhShieldCheck,
  PhWarning,
} from '@phosphor-icons/vue'

type View = 'options' | 'key' | 'phrase' | 'remove'
const options = [
  { view: 'key', label: 'View private key', icon: PhLock },
  { view: 'phrase', label: 'View recovery phrase', icon: PhArticle },
  { view: 'remove', label: 'Remove wallet', icon: PhWarning },
] as const
const points = [
  { icon: PhShieldCheck, text: 'Keep your private key safe' },
  { icon: PhNote, text: 'Don’t share it with anyone' },
  { icon: PhProhibit, text: 'If you lose it, we can’t recover it' },
]
const details = {
  key: {
    icon: PhKey,
    title: 'Private key',
    body: 'Your private key backs up your wallet. Keep it secret and secure at all times.',
  },
  phrase: {
    icon: PhArticle,
    title: 'Recovery phrase',
    body: 'Your recovery phrase is the only way to restore your wallet. Write it down somewhere safe.',
  },
  remove: {
    icon: PhWarning,
    title: 'Are you sure?',
    body: 'You haven’t backed up this wallet yet. If you remove it, you could lose access for good. Back it up first.',
  },
}
const open = shallowRef(false)
const view = shallowRef<View>('options')
// Dialog's own close button, on the title's line.
const closeAt = { insetBlockStart: '28px', insetInlineEnd: '24px' }
function start() {
  view.value = 'options'
  open.value = true
}
// A tap carries no momentum: the sheet rises on a critically damped spring.
const motion: DialogMotion = {
  swap: 'sync',
  initial: { panel: { y: { value: '110%', spring: 'smooth' } } },
  exit: { panel: { y: { value: '110%', spring: 'smooth' } } },
}
// Views swap with a quiet scale-fade, the same both ways.
const swap = {
  initial: { opacity: 0, scale: '0.96' },
  exit: { opacity: 0, scale: '0.96' },
  duration: 270,
  easing: 'cubic-bezier(0.26, 0.08, 0.25, 1)',
}
</script>

<style scoped>
.demo {
  display: grid;
  place-items: center;
  min-block-size: 8rem;
}
:global(.wallet-panel) {
  inset-inline: 0;
  margin: 0 auto 16px;
  inline-size: min(361px, calc(100% - 32px));
  border-radius: 36px;
}
:global(.wallet-body) {
  position: relative;
  padding: 0;
}
:global(.wallet-close) {
  z-index: 1;
  display: grid;
  place-items: center;
  inline-size: 32px;
  block-size: 32px;
  border: 0;
  border-radius: 50%;
  background: var(--ui-muted);
  color: var(--ui-text-muted);
}
.view {
  padding: 28px 24px 24px;
}
.title {
  margin: 0;
  font-size: 1.1875rem;
  font-weight: 600;
}
.bar {
  display: flex;
  align-items: center;
  block-size: 32px;
  padding-block-end: 16px;
  margin-block-end: 16px;
  border-block-end: 1px solid var(--ui-border);
}
.rows {
  display: grid;
  gap: 12px;
}
.row,
.pill {
  display: flex;
  align-items: center;
  gap: 16px;
  block-size: 48px;
  padding-inline: 16px;
  border: 0;
  border-radius: 16px;
  background: var(--ui-muted);
  color: var(--ui-text);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: scale 160ms var(--ui-ease-out);
}
.row:active,
.pill:active {
  scale: 0.97;
}
.row svg,
.mark {
  color: var(--ui-text-muted);
}
.row[data-danger],
.row[data-danger] svg,
.mark[data-danger] {
  color: var(--ui-danger);
}
.row[data-danger] {
  background: color-mix(in srgb, var(--ui-danger) 10%, transparent);
}
.mark {
  display: block;
  margin-block-end: 12px;
}
.text {
  margin: 8px 0 0;
  color: var(--ui-text-muted);
  line-height: 1.5;
}
.points {
  display: grid;
  gap: 16px;
  margin: 20px 0 0;
  padding: 20px 0 0;
  border-block-start: 1px solid var(--ui-border);
  list-style: none;
  color: var(--ui-text-muted);
  font-weight: 500;
}
.points li {
  display: flex;
  align-items: center;
  gap: 12px;
}
.actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-block-start: 24px;
}
.pill {
  justify-content: center;
  gap: 12px;
  border-radius: 999px;
  font-weight: 600;
}
.pill[data-tone='accent'] {
  background: var(--ui-primary);
  color: var(--ui-primary-contrast);
}
.pill[data-tone='danger'] {
  background: var(--ui-danger-solid);
  color: var(--ui-danger-contrast);
}
</style>
