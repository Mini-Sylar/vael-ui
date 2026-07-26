<template>
  <GuideLayout :links="tocLinks">
    <h1>{{ t('globalSetup.title') }}</h1>
    <p>{{ t('globalSetup.intro') }}</p>

    <h2 id="tooltip-host">{{ t('globalSetup.tooltipHostTitle') }}</h2>
    <p v-html="t('globalSetup.tooltipHostIntro')" />
    <CodeBlock
      code="<template>
  <TooltipHost />
  <YourApp />
</template>"
    />
    <p>{{ t('globalSetup.tooltipHostOptions') }}</p>
    <MetaTable :rows="tooltipHostProps" title="Props" show-default empty-text="No props." />

    <h2 id="dialog-host">{{ t('globalSetup.dialogHostTitle') }}</h2>
    <p v-html="t('globalSetup.dialogHostIntro')" />
    <CodeBlock
      code="<template>
  <DialogHost />
  <YourApp />
</template>"
    />

    <h2 id="toaster">{{ t('globalSetup.toasterTitle') }}</h2>
    <i18n-t keypath="globalSetup.toasterIntro" tag="p" scope="global">
      <template #code><code>toast()</code></template>
      <template #link>
        <RouterLink to="/components/Toaster">{{ t('globalSetup.toasterIntroLink') }}</RouterLink>
      </template>
    </i18n-t>
    <CodeBlock
      code="<template>
  <Toaster />
  <YourApp />
</template>"
    />

    <h2 id="all-together">{{ t('globalSetup.allTogetherTitle') }}</h2>
    <p>{{ t('globalSetup.allTogetherIntro') }}</p>
    <CodeBlock
      code="<script setup lang=&quot;ts&quot;>
import { DialogHost, Toaster, TooltipHost } from 'vael-ui'
</script>

<template>
  <TooltipHost />
  <DialogHost />
  <Toaster />
  <YourApp />
</template>"
    />
  </GuideLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CodeBlock from '../../components/CodeBlock.vue'
import MetaTable from '../../components/MetaTable.vue'
import GuideLayout from '../../components/GuideLayout.vue'
import componentMeta from '../../generated/component-meta.json'
import type { ComponentMetaEntry } from '../../types'

const { t } = useI18n()
useHead({ title: () => t('globalSetup.title') })

const tooltipHostProps = (componentMeta as Record<string, ComponentMetaEntry>).TooltipHost.props

const tocLinks = computed(() => [
  { id: 'tooltip-host', label: t('globalSetup.tooltipHostTitle') },
  { id: 'dialog-host', label: t('globalSetup.dialogHostTitle') },
  { id: 'toaster', label: t('globalSetup.toasterTitle') },
  { id: 'all-together', label: t('globalSetup.allTogetherTitle') },
])
</script>
