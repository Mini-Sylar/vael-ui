<template>
  <section class="demo">
    <h3>Extreme: new files stagger in (gsap)</h3>
    <p class="note">
      Drop several files at once and each row pops in a little after the one before, through a GSAP
      stagger on <code>@add</code>. It runs on top of FileUpload’s own fade, not instead of it. The
      demo reaches each row’s content through a function ref in <code>#item</code>, never an
      internal class.
    </p>
    <FileUpload v-model:files="staggerFiles" @add="onStaggerAdd">
      <template #item="{ file, remove }">
        <div :ref="(el) => setStaggerRef(file, el as HTMLElement | null)" class="stagger-item">
          <span class="upload-item-name">{{ file.name }}</span>
          <Button size="sm" variant="ghost" icon aria-label="Remove file" @click="remove">
            <PhX weight="bold" />
          </Button>
        </div>
      </template>
    </FileUpload>
  </section>
</template>

<script setup lang="ts">
import { nextTick, shallowRef } from 'vue'
import { gsap } from 'gsap'
import { Button, FileUpload } from 'vael-ui'
import { PhX } from '@phosphor-icons/vue'

const staggerFiles = shallowRef<File[]>([])
const staggerRefs = new Map<string, HTMLElement>()

function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}

function setStaggerRef(file: File, el: HTMLElement | null) {
  if (el) staggerRefs.set(fileKey(file), el)
  else staggerRefs.delete(fileKey(file))
}

const reduce = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function onStaggerAdd(files: File[]) {
  if (reduce()) return
  void nextTick(() => {
    const els = files.map((file) => staggerRefs.get(fileKey(file))).filter((el) => el != null)
    if (els.length === 0) return
    gsap.from(els, {
      y: 14,
      scale: 0.92,
      duration: 0.4,
      stagger: 0.06,
      ease: 'back.out(1.6)',
      clearProps: 'all',
    })
  })
}
</script>

<style scoped>
.stagger-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.8125rem;
}
.upload-item-name {
  flex: 1 1 auto;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
