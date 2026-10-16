<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('animation.title') }}</h1>
    <p>{{ t('animation.intro') }}</p>

    <h2 id="which-hooks">{{ t('animation.kindsTitle') }}</h2>
    <table>
      <thead>
        <tr>
          <th>{{ t('animation.kindsKind') }}</th>
          <th>{{ t('animation.kindsComponents') }}</th>
          <th>{{ t('animation.kindsHooks') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="kind in kinds" :key="kind.id">
          <td>{{ t(`animation.${kind.id}Title`) }}</td>
          <td>{{ kind.components }}</td>
          <td class="hooks">
            <code v-for="hook in kind.hooks" :key="hook">{{ hook }}</code>
          </td>
        </tr>
      </tbody>
    </table>
    <p>{{ t('animation.kindsCheck') }}</p>

    <h2 id="exposed-elements">{{ t('animation.exposedTitle') }}</h2>
    <p v-html="t('animation.exposedIntro')" />
    <p>{{ t('animation.exposedExampleIntro') }}</p>
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ref, useTemplateRef, watch } from "vue"
import gsap from "gsap"
import { Checkbox } from "vael-ui"

const checked = ref(false)
const checkbox = useTemplateRef("checkbox")

watch(checked, (isChecked) => {
  if (!isChecked) return
  gsap.fromTo(
    checkbox.value?.checkEl,
    { scale: 0.6, opacity: 0 },
    {
      scale: 1,
      opacity: 1,
      transformOrigin: "50% 50%",
      duration: 0.25,
      clearProps: "all",
    },
  )
})
&lt;/script&gt;

<template>
  <Checkbox
    ref="checkbox"
    v-model="checked"
    :motion-css="false"
    label="Remember me"
  />
</template>'
    />

    <h2 id="motion-css">{{ t('animation.motionCssTitle') }}</h2>
    <p v-html="t('animation.motionCssIntro')" />

    <h2 id="force-mount">{{ t('animation.forceMountTitle') }}</h2>
    <p v-html="t('animation.forceMountIntro')" />

    <h2 id="before-close">{{ t('animation.beforeCloseTitle') }}</h2>
    <p v-html="t('animation.beforeCloseIntro')" />

    <h2 id="motion-v-example">{{ t('animation.motionVExampleTitle') }}</h2>
    <p v-html="t('animation.motionVExampleIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ref, useTemplateRef, watch } from "vue"
import { animate } from "motion-v"
import { Popover } from "vael-ui"

const open = ref(false)
const popover = useTemplateRef("popover")

// Runs before the panel shows, so it starts hidden instead of flashing.
watch(open, (isOpen) => {
  const panel = popover.value?.panelEl
  if (!isOpen || !panel) return
  panel.style.opacity = "0"
  animate(panel, { opacity: [0, 1], scale: [0.95, 1] }, { duration: 0.2 })
})

// Popover keeps the panel up until done() is called.
async function beforeClose(done: () => void) {
  const panel = popover.value?.panelEl
  if (panel) await animate(panel, { opacity: 0, scale: 0.95 }, { duration: 0.15 })
  done()
}
&lt;/script&gt;

<template>
  <Popover
    ref="popover"
    v-model:open="open"
    force-mount
    open-on-trigger-click
    :before-close="beforeClose"
  >
    <template #trigger>
      <button>Open</button>
    </template>
    <template #default>Popover content</template>
  </Popover>
</template>'
    />

    <h2 id="gsap-example">{{ t('animation.gsapExampleTitle') }}</h2>
    <p v-html="t('animation.gsapExampleIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ref } from "vue"
import gsap from "gsap"
import { Dialog } from "vael-ui"

const dialogRef = ref<InstanceType<typeof Dialog>>()
const open = ref(false)

function beforeClose(done: () => void) {
  gsap.to(dialogRef.value?.panelEl, {
    opacity: 0,
    y: 8,
    duration: 0.2,
    onComplete: done,
  })
}
&lt;/script&gt;

<template>
  <Dialog ref="dialogRef" v-model:open="open" :before-close="beforeClose">
    Dialog content
  </Dialog>
</template>'
    />
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import componentMeta from '../../generated/component-meta.json'
import CodeBlock from '../../components/CodeBlock.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import { useBreadcrumbSchema } from '../../composables/useBreadcrumbSchema'
import type { ComponentMetaEntry } from '../../types'

const { t } = useI18n()
useHead({ title: () => t('animation.title') })

useBreadcrumbSchema(() => [
  { name: 'Home', url: 'https://vael-ui.dev/' },
  { name: t('animation.title'), url: 'https://vael-ui.dev/docs/guides/animation-integration' },
])

// Built from the same metadata as the API tables, so a component that gains a hook shows up here.
const meta = componentMeta as Record<string, ComponentMetaEntry>
// Hosts and providers pass these through to their components rather than animating themselves.
const SKIP = new Set(['ConfigProvider', 'TooltipHost'])
const names = Object.keys(meta)
  .filter((name) => !SKIP.has(name))
  .sort()
const hasProp = (name: string, prop: string) => meta[name].props.some((p) => p.name === prop)
// The event prefix of a component's enter/leave pair: `item` for `item-enter`.
const enterPrefix = (name: string) =>
  meta[name].events.find((e) => e.name.endsWith('-enter'))?.name.slice(0, -'-enter'.length)

const listed = names.filter((name) => enterPrefix(name))
const byPrefix = new Map<string, string[]>()
for (const name of listed) {
  const prefix = enterPrefix(name)!
  byPrefix.set(prefix, [...(byPrefix.get(prefix) ?? []), name])
}

const kinds = [
  {
    id: 'kindsOverlay',
    components: names.filter((name) => hasProp(name, 'beforeClose')).join(', '),
    hooks: ['forceMount', 'beforeClose(done)', 'panelEl'],
  },
  {
    id: 'kindsInPlace',
    components: names
      .filter(
        (name) =>
          hasProp(name, 'motionCss') && !hasProp(name, 'beforeClose') && !listed.includes(name),
      )
      .join(', '),
    hooks: ['motionCss'],
  },
  {
    id: 'kindsList',
    components: [...byPrefix]
      .map(([prefix, group]) => `${group.join(', ')} (@${prefix}-*)`)
      .join('; '),
    hooks: ['motionCss', '@…-enter', '@…-leave'],
  },
]

const tocLinks = computed(() => [
  { id: 'which-hooks', label: t('animation.kindsTitle') },
  { id: 'exposed-elements', label: t('animation.exposedTitle') },
  { id: 'motion-css', label: t('animation.motionCssTitle') },
  { id: 'force-mount', label: t('animation.forceMountTitle') },
  { id: 'before-close', label: t('animation.beforeCloseTitle') },
  { id: 'motion-v-example', label: t('animation.motionVExampleTitle') },
  { id: 'gsap-example', label: t('animation.gsapExampleTitle') },
])
</script>

<style scoped>
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
  margin-block: 1rem;
}

th,
td {
  text-align: left;
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid var(--ui-border);
  vertical-align: top;
}

thead th {
  color: var(--ui-text-muted);
  font-weight: 600;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: var(--ui-muted);
}

.hooks code {
  display: inline-block;
  margin: 0 0.25rem 0.25rem 0;
}
</style>
