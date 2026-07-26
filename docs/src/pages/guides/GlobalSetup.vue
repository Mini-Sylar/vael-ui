<template>
  <article class="prose">
    <h1>{{ t('globalSetup.title') }}</h1>
    <p>{{ t('globalSetup.intro') }}</p>

    <h2>{{ t('globalSetup.tooltipHostTitle') }}</h2>
    <p v-html="t('globalSetup.tooltipHostIntro')" />
    <CodeBlock
      code="<template>
  <TooltipHost />
  <YourApp />
</template>"
    />
    <p>{{ t('globalSetup.tooltipHostOptions') }}</p>
    <MetaTable :rows="tooltipHostProps" title="Props" show-default empty-text="No props." />

    <h2>{{ t('globalSetup.dialogHostTitle') }}</h2>
    <p v-html="t('globalSetup.dialogHostIntro')" />
    <CodeBlock
      code="<template>
  <DialogHost />
  <YourApp />
</template>"
    />

    <h2>{{ t('globalSetup.toasterTitle') }}</h2>
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

    <h2>{{ t('globalSetup.allTogetherTitle') }}</h2>
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
  </article>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import CodeBlock from '../../components/CodeBlock.vue'
import MetaTable from '../../components/MetaTable.vue'
import componentMeta from '../../generated/component-meta.json'
import type { ComponentMetaEntry } from '../../types'

const { t } = useI18n()

const tooltipHostProps = (componentMeta as Record<string, ComponentMetaEntry>).TooltipHost.props
</script>
