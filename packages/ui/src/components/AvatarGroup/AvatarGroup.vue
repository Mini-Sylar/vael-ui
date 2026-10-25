<template>
  <component
    :is="avatarsTransition ? TransitionGroup : 'div'"
    :ref="registerRoot"
    :data-ui-group="groupKey"
    :class="rootPart.class"
    :style="rootPart.style"
    v-bind="{ ...attrs, ...avatarsTransition }"
  >
    <slot />
    <Avatar
      v-if="overflowCount > 0"
      :size="size"
      :class="overflowPart.class"
      :style="overflowPart.style"
    >
      <slot name="overflow" :count="overflowCount">+{{ overflowCount }}</slot>
    </Avatar>
  </component>
</template>

<script setup lang="ts">
import './AvatarGroup.css'
import '../shared/tokens.css'
import '../../motion/timing.css'
import { TransitionGroup, computed, ref, useAttrs, useId } from 'vue'
import Avatar from '../Avatar/Avatar.vue'
import { useClassMerge, resolveUiPart } from '../../classes'
import type { UiPartValue } from '../../classes'
import { useThemedUi } from '../../theme'
import { useStateMotion } from '../../motion/useStateMotion'
import { useComponentList } from '../../motion/useMotion'
import { useMotionStyle } from '../../motion/context'
import { transitionGroupRef } from '../../composables/dom'
import type { AvatarGroupMotion } from '../../motion/types'

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
    /** How it moves: its appearance, avatar by avatar (`{ initial: { avatar: { opacity: 0, x: -8 } }, stagger: 0.04 }`). Avatars you add or remove come and go the same way (key them). `false` turns its own animation off. */
    motion?: AvatarGroupMotion
    /** Class and style overrides for each part. */
    ui?: Partial<{ root: UiPartValue; overflow: UiPartValue }>
  }>(),
  {
    size: 'md',
    overflowCount: 0,
    hoverLift: false,
    // Absent must read as unset, not `false` (Vue's boolean casting would turn motion off).
    motion: undefined,
  },
)

defineSlots<{
  /** The `Avatar`s to stack. */
  default(): unknown
  /** Replaces the default "+N" content of the generated overflow avatar. */
  overflow(props: { count: number }): unknown
}>()

const root = ref<HTMLElement | null>(null)
const groupKey = useId()
const registerRoot = transitionGroupRef(root, groupKey)
// Yours (an object, or a shared style): avatars you add or remove come and go on the motion
// system. Key your avatars, as for any list that animates.
const style = useMotionStyle()
const avatarsMotion =
  typeof props.motion === 'object' || style?.value?.avatarGroup || style?.value?.list
    ? useComponentList(() => props.motion, {
        key: 'avatarGroup',
        part: 'avatar',
        name: 'AvatarGroup',
        look: { opacity: 0, scale: 0.8 },
      })
    : undefined
const avatarsTransition = computed(() =>
  avatarsMotion && props.motion !== false ? { tag: 'div', ...avatarsMotion.transition } : undefined,
)
const parts = useStateMotion({
  key: 'avatarGroup',
  mainPart: 'root',
  motion: () => props.motion,
  root: () => root.value,
  // Every avatar, the "+N" overflow one included.
  selectors: { root: '.ui-avatar-group', avatar: '.ui-avatar' },
  states: () => ({}),
})
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
  /** Its elements by part name, for your own animation; a repeated part is an array. */
  get parts() {
    return parts()
  },
})
</script>
