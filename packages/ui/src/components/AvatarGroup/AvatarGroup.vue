<template>
  <div ref="root" :class="rootPart.class" :style="rootPart.style" v-bind="attrs">
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
import { computed, useAttrs, useTemplateRef } from 'vue'
import Avatar from '../Avatar/Avatar.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const props = withDefaults(
  defineProps<{
    /** Sizes the generated overflow avatar; slotted `Avatar`s keep their own `size` prop. @default 'md' */
    size?: 'sm' | 'md' | 'lg'
    /**
     * Number of items you didn't render as slotted `Avatar`s, shown as "+N". You decide the truncation; `0` renders nothing.
     * @default 0
     */
    overflowCount?: number
    /** Lifts an avatar on hover to reveal it above its neighbors. @default false */
    hoverLift?: boolean
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; overflow: UiPartValue }>
  }>(),
  { size: 'md', overflowCount: 0, hoverLift: false },
)

defineSlots<{
  /** The `Avatar`s to stack. */
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

defineExpose({
  /** Root element. */
  el: root,
})
</script>
