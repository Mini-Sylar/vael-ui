<template>
  <nav class="support-menu" :aria-label="t('nav.support')">
    <a
      class="support-link"
      href="https://github.com/Mini-Sylar/vael-ui"
      target="_blank"
      rel="noreferrer"
      @click="popover.close()"
    >
      <PhGithubLogo :size="18" />
      {{ t('nav.github') }}
    </a>
    <a
      class="support-link"
      href="https://github.com/sponsors/Mini-Sylar"
      target="_blank"
      rel="noreferrer"
      @click="popover.close()"
    >
      <PhHeart :size="18" weight="fill" class="support-heart" />
      {{ t('nav.sponsor') }}
    </a>
  </nav>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { PhGithubLogo, PhHeart } from '@phosphor-icons/vue'
import { usePopoverRef } from 'vael-ui'

const { t } = useI18n()
const popover = usePopoverRef()
</script>

<style scoped>
.support-menu {
  display: flex;
  flex-direction: column;
  min-inline-size: 11rem;
}

.support-link {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  min-block-size: 2.75rem;
  padding-inline: 0.75rem;
  border-radius: calc(var(--ui-radius) - 2px);
  color: var(--ui-text);
  text-decoration: none;
  touch-action: manipulation;
}

.support-link:active {
  background: var(--ui-muted);
}

@media (hover: hover) and (pointer: fine) {
  .support-link:hover {
    background: var(--ui-muted);
  }
}

.support-link:focus-visible {
  outline: 2px solid var(--ui-ring, var(--ui-primary));
  outline-offset: -2px;
}

.support-heart {
  color: #db61a2;
}
</style>
