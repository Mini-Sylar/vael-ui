<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('animation.title') }}</h1>
    <p v-html="t('animation.intro')" />

    <h2 id="built-in">{{ t('animation.builtInTitle') }}</h2>
    <p v-html="t('animation.builtInIntro')" />
    <CodeBlock
      code='<Dialog v-model:open="open" :motion="false">
  Opens and closes instantly.
</Dialog>'
    />
    <p v-html="t('animation.builtInProvider')" />

    <h2 id="which-motion">{{ t('animation.kindsTitle') }}</h2>
    <table>
      <thead>
        <tr>
          <th>{{ t('animation.kindsKind') }}</th>
          <th>{{ t('animation.kindsComponents') }}</th>
          <th>{{ t('animation.kindsSet') }}</th>
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
    <p v-html="t('animation.kindsCheck')" />

    <h2 id="values">{{ t('animation.valuesTitle') }}</h2>
    <p v-html="t('animation.valuesIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { Popover } from "vael-ui"
import type { PopoverMotion } from "vael-ui"

const panelMotion: PopoverMotion = {
  initial: { panel: { opacity: 0, y: 8 } },
  exit: { panel: { opacity: 0, y: 4 } },
  spring: { damping: 0.8, response: 0.3 },
}
&lt;/script&gt;

<template>
  <Popover open-on-trigger-click :motion="panelMotion">
    <template #trigger>
      <button>Open</button>
    </template>
    <template #default>Popover content</template>
  </Popover>
</template>'
    />
    <p v-html="t('animation.valuesTiming')" />

    <h2 id="hooks">{{ t('animation.hooksTitle') }}</h2>
    <p v-html="t('animation.hooksIntro')" />
    <p v-html="t('animation.hooksInterrupt')" />

    <h3 id="gsap-example">{{ t('animation.gsapExampleTitle') }}</h3>
    <p v-html="t('animation.gsapExampleIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ref } from "vue"
import gsap from "gsap"
import { Dialog } from "vael-ui"
import type { DialogMotion } from "vael-ui"

const open = ref(false)

const dialogMotion: DialogMotion = {
  enter: ({ overlay, panel }) =>
    gsap
      .timeline()
      .from(overlay, { opacity: 0, duration: 0.2 })
      .from(panel, { opacity: 0, y: 12, duration: 0.3, ease: "power3.out" }, 0),
  leave: ({ overlay, panel }) =>
    gsap
      .timeline()
      .to(panel, { opacity: 0, y: 8, duration: 0.15, ease: "power2.in" })
      .to(overlay, { opacity: 0, duration: 0.15 }, 0),
}
&lt;/script&gt;

<template>
  <Dialog v-model:open="open" :motion="dialogMotion">Dialog content</Dialog>
</template>'
    />

    <h3 id="motion-example">{{ t('animation.motionExampleTitle') }}</h3>
    <p v-html="t('animation.motionExampleIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { animate } from "motion-v"
import { Popover } from "vael-ui"
import type { PopoverMotion } from "vael-ui"

const panelMotion: PopoverMotion = {
  enter: ({ panel }) =>
    animate(
      panel,
      { opacity: [0, 1], scale: [0.95, 1] },
      { type: "spring", bounce: 0.2, visualDuration: 0.3 },
    ),
  leave: ({ panel }) => animate(panel, { opacity: 0, scale: 0.95 }, { duration: 0.15 }),
}
&lt;/script&gt;

<template>
  <Popover open-on-trigger-click :motion="panelMotion">
    <template #trigger>
      <button>Open</button>
    </template>
    <template #default>Popover content</template>
  </Popover>
</template>'
    />

    <h3 id="waapi-example">{{ t('animation.waapiExampleTitle') }}</h3>
    <p v-html="t('animation.waapiExampleIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ref } from "vue"
import { Message } from "vael-ui"
import type { MessageMotion } from "vael-ui"

const open = ref(true)

const messageMotion: MessageMotion = {
  enter: ({ root }) =>
    root.animate([{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "none" }], {
      duration: 200,
      easing: "ease-out",
    }),
  leave: ({ root }) =>
    root.animate([{ opacity: 1 }, { opacity: 0, transform: "translateX(24px)" }], {
      duration: 180,
      easing: "ease-in",
    }),
}
&lt;/script&gt;

<template>
  <Message v-model:open="open" closable :motion="messageMotion">Changes saved.</Message>
</template>'
    />

    <h2 id="lists">{{ t('animation.listsTitle') }}</h2>
    <p v-html="t('animation.listsIntro')" />
    <p v-html="t('animation.listsOptions')" />
    <CodeBlock
      code='<FileUpload
  v-model:files="files"
  multiple
  :motion="{ initial: { item: { opacity: 0, y: 6 } }, stagger: 0.04 }"
/>'
    />
    <p v-html="t('animation.listsHooksIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { gsap } from "gsap"
import { Timeline } from "vael-ui"
import type { TimelineMotion } from "vael-ui"

defineProps<{ events: { id: number; label: string }[] }>()

const steps: TimelineMotion = {
  // A leaving step keeps its space, so the line retracts before the gap closes.
  leaving: "hold",
  enter({ previousConnector: line, marker, content }) {
    gsap.set(marker, { scale: 0.4, opacity: 0 })
    gsap.set(content, { opacity: 0, x: 8 })
    const tl = gsap.timeline()
    if (line) tl.fromTo(line, { scaleY: 0, transformOrigin: "50% 0" }, { scaleY: 1, duration: 0.3 })
    tl.to(marker, { scale: 1, opacity: 1, duration: 0.4, ease: "back.out(2.2)" })
    tl.to(content, { opacity: 1, x: 0, duration: 0.35 }, "<0.05")
    return tl
  },
  leave({ item, marker, content }) {
    const tl = gsap.timeline()
    tl.to([content, marker], { opacity: 0, duration: 0.2 }, 0)
    tl.to(item, { height: 0, overflow: "hidden", duration: 0.3, ease: "power2.inOut" }, 0.2)
    return tl
  },
}
&lt;/script&gt;

<template>
  <Timeline :items="events" :item-key="(e) => e.id" :motion="steps">
    <template #item="{ item }">{{ item.label }}</template>
  </Timeline>
</template>'
    />
    <p v-html="t('animation.listsEvents')" />

    <h2 id="before-close">{{ t('animation.guardsTitle') }}</h2>
    <p v-html="t('animation.guardsIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ref } from "vue"
import { Dialog, confirmAction } from "vael-ui"

const open = ref(false)

const confirmDiscard = () =>
  confirmAction({ title: "Discard changes?", confirmLabel: "Discard" }).result
&lt;/script&gt;

<template>
  <Dialog v-model:open="open" :before-close="confirmDiscard">Edit form</Dialog>
</template>'
    />
    <p v-html="t('animation.guardsExit')" />

    <h2 id="force-mount">{{ t('animation.forceMountTitle') }}</h2>
    <p v-html="t('animation.forceMountIntro')" />

    <h2 id="app-wide">{{ t('animation.appWideTitle') }}</h2>
    <p v-html="t('animation.appWideIntro')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ConfigProvider } from "vael-ui"
import type { MotionStyle } from "vael-ui"

const style: MotionStyle = {
  version: 1,
  spring: { damping: 0.9, response: 0.35 },
  overlay: { initial: { opacity: 0, y: 6 } },
  list: { stagger: 0.04 },
  toaster: { leaving: "hold" },
}
&lt;/script&gt;

<template>
  <ConfigProvider :motion="style">
    <RouterView />
  </ConfigProvider>
</template>'
    />

    <h2 id="v-animate">{{ t('animation.vAnimateTitle') }}</h2>
    <p v-html="t('animation.vAnimateIntro')" />
    <p v-html="t('animation.vAnimateNamed')" />
    <CodeBlock
      code='&lt;script setup lang="ts"&gt;
import { ref } from "vue"
import { Dialog, vAnimate } from "vael-ui"

const open = ref(false)
const steps = ["Pick a plan", "Add your team", "Send invites"]
&lt;/script&gt;

<template>
  <p v-animate="{ initial: { opacity: 0, y: 8 } }">Welcome back</p>

  <Dialog v-model:open="open">
    <ol>
      <li
        v-for="step in steps"
        :key="step"
        v-animate:rows="{ initial: { opacity: 0, y: 6 }, stagger: 0.03 }"
      >
        {{ step }}
      </li>
    </ol>
  </Dialog>
</template>'
    />

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
    :motion="false"
    label="Remember me"
  />
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

// Built from the same metadata as the API tables, so a component that gains `motion` shows up here.
const meta = componentMeta as Record<string, ComponentMetaEntry>
// Hosts and providers pass these through to their components rather than animating themselves.
const SKIP = new Set(['ConfigProvider', 'TooltipHost'])
const names = Object.keys(meta)
  .filter((name) => !SKIP.has(name))
  .sort()
const hasProp = (name: string, prop: string) => meta[name].props.some((p) => p.name === prop)

// Lists, with the part each hook call gets per item.
const LISTS: [string, string][] = [
  ['Toaster', 'toast'],
  ['Timeline', 'item'],
  ['FileUpload', 'item'],
  ['SpeedDial', 'action'],
  ['DataTable', 'row'],
]
// Overlays that also hold a list, under their own key.
const NESTED_LISTS: [string[], string][] = [
  [['CommandPalette'], 'items → item'],
  [['Select', 'Combobox', 'CascadeSelect'], 'chips → chip'],
]
const isList = (name: string) => LISTS.some(([list]) => list === name)

const kinds = [
  {
    id: 'kindsOverlay',
    components: names.filter((name) => hasProp(name, 'beforeClose')).join(', '),
    hooks: ['motion', 'beforeClose', 'forceMount'],
  },
  {
    id: 'kindsInPlace',
    components: names
      .filter((name) => hasProp(name, 'motion') && !hasProp(name, 'beforeClose') && !isList(name))
      .join(', '),
    hooks: ['motion'],
  },
  {
    id: 'kindsList',
    components: [
      ...LISTS.filter(([name]) => names.includes(name)).map(([name, part]) => `${name} (${part})`),
      ...NESTED_LISTS.map(([group, part]) => `${group.join(', ')} (${part})`),
    ].join(', '),
    hooks: ['motion', 'stagger', 'leaving'],
  },
]

const tocLinks = computed(() => [
  { id: 'built-in', label: t('animation.builtInTitle') },
  { id: 'which-motion', label: t('animation.kindsTitle') },
  { id: 'values', label: t('animation.valuesTitle') },
  { id: 'hooks', label: t('animation.hooksTitle') },
  { id: 'lists', label: t('animation.listsTitle') },
  { id: 'before-close', label: t('animation.guardsTitle') },
  { id: 'force-mount', label: t('animation.forceMountTitle') },
  { id: 'app-wide', label: t('animation.appWideTitle') },
  { id: 'v-animate', label: t('animation.vAnimateTitle') },
  { id: 'exposed-elements', label: t('animation.exposedTitle') },
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
