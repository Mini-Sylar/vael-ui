<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style">
    <slot />
    <Avatar
      v-if="overflowCount > 0"
      :size="size"
      :class="overflowPart.class"
      :style="overflowPart.style"
    >
      <slot name="overflow" :count="overflowCount">+{{ overflowCount }}</slot>
    </Avatar>
  </div>
</template>

<script setup lang="ts">
import './AvatarGroup.css'
import '../shared/tokens.css'
import { computed, useTemplateRef } from 'vue'
import Avatar from '../Avatar/Avatar.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

const props = withDefaults(
  defineProps<{
    /** Sizes the generated overflow avatar; slotted `Avatar`s keep their own `size` prop. */
    size?: 'sm' | 'md' | 'lg'
    /** Count of items NOT rendered as slotted `Avatar`s — the caller decides truncation, this only displays the remainder as "+N". 0 (default) renders nothing. */
    overflowCount?: number
    /** Lifts an avatar on hover to reveal it above its neighbors. Off by default. */
    hoverLift?: boolean
    ui?: Partial<{ root: UiPartValue; overflow: UiPartValue }>
  }>(),
  { size: 'md', overflowCount: 0, hoverLift: false },
)

defineSlots<{
  default(): unknown
  /** Replaces the default "+N" content of the generated overflow avatar. */
  overflow(props: { count: number }): unknown
}>()

const root = useTemplateRef<HTMLElement>('root')
const cx = useClassMerge()
const themedUi = useThemedUi(
  (theme) => theme.avatarGroup,
  () => props.ui,
)
const rootPart = computed(() =>
  resolveUiPart(
    cx,
    themedUi()?.root,
    'ui-avatar-group',
    `ui-avatar-group--${props.size}`,
    props.hoverLift && 'ui-avatar-group--hover-lift',
  ),
)
const overflowPart = computed(() =>
  resolveUiPart(cx, themedUi()?.overflow, 'ui-avatar-group-overflow'),
)

defineExpose({ el: root })
</script>
