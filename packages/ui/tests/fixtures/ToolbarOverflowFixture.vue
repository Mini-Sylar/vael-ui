<template>
  <div :style="{ inlineSize: width }">
    <Toolbar aria-label="Editor toolbar">
      <template #start>
        <Button data-testid="save" size="sm" variant="ghost">Save</Button>
      </template>
      <template #center>
        <Button data-testid="title" size="sm" variant="ghost">Untitled</Button>
      </template>
      <template #end>
        <Button
          data-testid="share"
          size="sm"
          variant="ghost"
          data-toolbar-overflow
          @click="onShare"
        >
          Share
        </Button>
        <Button
          data-testid="comment"
          size="sm"
          variant="ghost"
          data-toolbar-overflow
          @click="onComment"
        >
          Comment
        </Button>
        <Button data-testid="export" size="sm" variant="ghost" data-toolbar-overflow disabled>
          Export
        </Button>
      </template>
    </Toolbar>
  </div>
  <output data-testid="share-clicked">{{ shareClicked }}</output>
  <output data-testid="comment-clicked">{{ commentClicked }}</output>
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import Button from '../../src/components/Button/Button.vue'
import Toolbar from '../../src/components/Toolbar/Toolbar.vue'

withDefaults(defineProps<{ width?: string }>(), { width: '900px' })

const shareClicked = shallowRef(0)
const commentClicked = shallowRef(0)
function onShare() {
  shareClicked.value++
}
function onComment() {
  commentClicked.value++
}
</script>
