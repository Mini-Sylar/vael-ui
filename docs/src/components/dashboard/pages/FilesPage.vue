<template>
  <div class="files">
    <Card class="files-tree-card">
      <Tree
        ref="tree"
        v-model="selected"
        :items="fileTree"
        :filterable="false"
        expand-on-row-click
        :selectable-folders="false"
        class="files-tree"
      >
        <template #node="{ node, expanded }">
          <span class="files-node">
            <span class="files-chevron" :data-open="(isFolder(node) && expanded) || undefined">
              <PhCaretRight v-if="isFolder(node)" :size="11" weight="bold" />
            </span>
            <component
              :is="isFolder(node) ? (expanded ? PhFolderOpen : PhFolder) : PhFile"
              :size="15"
              class="files-icon"
            />
            <span class="files-label">{{ node.label }}</span>
            <span v-if="(node as RepoFile).changed" class="files-changed" aria-label="changed" />
          </span>
        </template>
      </Tree>
    </Card>

    <Card class="files-preview">
      <Transition name="ui-fade" mode="out-in">
        <div v-if="file" :key="selected ?? ''" class="files-preview-body">
          <Breadcrumb :items="crumbs" class="files-crumbs" />
          <div class="files-meta">
            <Avatar :name="people[file.author]" size="sm" class="files-meta-avatar" />
            <span>
              {{ people[file.author].split(' ')[0] }}
              <span class="files-muted">{{
                file.pr ? 'changed this in' : 'last edited this'
              }}</span>
              <span v-if="file.pr" class="files-mono">#{{ file.pr }}</span>
            </span>
            <span class="files-mono files-muted files-push">{{ file.lines }} lines</span>
            <SelectButton v-model="view" :items="VIEWS" size="sm" :allow-empty="false" />
          </div>
          <div class="files-code" :data-view="view">
            <div v-if="view === 'blame'" class="files-blame" aria-hidden="true">
              <span v-for="n in lineCount" :key="n">{{ file.author }}</span>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -- Shiki output from our own static sources -->
            <div v-if="html" class="files-shiki" v-html="html" />
            <pre v-else class="files-plain">{{ file.code }}</pre>
          </div>
        </div>
        <div v-else key="empty" class="files-empty">
          <PhFile :size="20" />
          <span>Pick a file to preview it.</span>
        </div>
      </Transition>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import { Avatar, Breadcrumb, Card, SelectButton, Tree } from 'vael-ui'
import type { BreadcrumbItemData, TreeNode } from 'vael-ui'
import { PhCaretRight, PhFile, PhFolder, PhFolderOpen } from '@phosphor-icons/vue'
import { fileSources, fileTree, people } from '../repoData'
import type { RepoFile } from '../repoData'
import { highlightBlock } from '../../../composables/highlightInline'

const VIEWS = [
  { label: 'Code', value: 'code' },
  { label: 'Blame', value: 'blame' },
]

const tree = useTemplateRef<{ collapseAll: () => void }>('tree')
const selected = shallowRef<string | null>(null)
const view = shallowRef<'code' | 'blame'>('code')

const isFolder = (node: TreeNode) => !!node.children?.length
const file = computed(() => (selected.value ? fileSources[selected.value] : undefined))
const lineCount = computed(() => file.value?.code.split('\n').length ?? 0)

const crumbs = computed<BreadcrumbItemData[]>(() => {
  const parts = (selected.value ?? '').split('/')
  return parts.map((label, i) => ({ label, current: i === parts.length - 1 }))
})

const html = shallowRef('')
watch(
  file,
  async (next) => {
    html.value = ''
    if (!next) return
    const code = next.code
    const out = await highlightBlock(code, next.lang)
    if (file.value?.code === code) html.value = out
  },
  { immediate: true },
)

defineExpose({
  /** Back to a collapsed tree with nothing open. */
  reset: () => {
    selected.value = null
    view.value = 'code'
    tree.value?.collapseAll()
  },
})
</script>

<style scoped>
.files {
  display: grid;
  grid-template-columns: minmax(0, 14rem) minmax(0, 1fr);
  gap: 0.625rem;
  align-items: start;
  font-size: 0.8125rem;
}
@container dash-main (max-width: 40rem) {
  .files {
    grid-template-columns: minmax(0, 1fr);
  }
}
.files-tree-card :deep(.ui-card-body) {
  padding: 0.375rem;
}
.files-node {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-inline-size: 0;
  inline-size: 100%;
}
.files-chevron {
  display: inline-flex;
  inline-size: 11px;
  color: var(--ui-text-muted);
  transition: rotate var(--ui-duration-enter) var(--ui-ease-out);
}
.files-chevron[data-open] {
  rotate: 90deg;
}
.files-icon {
  flex: none;
  color: var(--ui-text-muted);
}
.files-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.files-changed {
  flex: none;
  margin-inline-start: auto;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 999px;
  background: var(--ui-info);
}

.files-preview {
  min-inline-size: 0;
}
.files-preview :deep(.ui-card-body) {
  padding: 0.75rem 0.875rem;
}
.files-preview-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-inline-size: 0;
}
.files-crumbs :deep(.ui-breadcrumb-list) {
  font-size: 0.75rem;
  flex-wrap: wrap;
}
.files-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  min-inline-size: 0;
  white-space: nowrap;
}
.files-meta-avatar.ui-avatar {
  inline-size: 1.25rem;
  block-size: 1.25rem;
  font-size: 0.5rem;
}
.files-push {
  margin-inline-start: auto;
}
.files-mono {
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
}
.files-muted {
  color: var(--ui-text-muted);
}
@container dash-main (max-width: 36rem) {
  .files-meta .files-push {
    display: none;
  }
}

.files-code {
  display: flex;
  border-radius: calc(var(--ui-radius) - 2px);
  background: color-mix(in oklch, var(--ui-muted) 55%, var(--ui-surface));
  box-shadow: inset 0 0 0 1px color-mix(in oklch, var(--ui-border) 60%, transparent);
  overflow: auto;
}
.files-blame {
  display: flex;
  flex-direction: column;
  flex: none;
  padding: 0.75rem 0 0.75rem 0.75rem;
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 0.6875rem;
  line-height: 1.7;
  color: var(--ui-text-muted);
  border-inline-end: 1px solid var(--ui-border);
  padding-inline-end: 0.625rem;
}
.files-shiki :deep(pre),
.files-plain {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  padding: 0.75rem;
  background: transparent !important;
  font-size: 0.75rem;
  line-height: 1.7;
}
.files-shiki {
  min-inline-size: 0;
}

.files-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 2.5rem 1rem;
  color: var(--ui-text-muted);
}

@container dash-main (max-width: 24rem) {
  .files {
    font-size: 0.75rem;
  }
  .files-shiki :deep(pre),
  .files-plain,
  .files-blame {
    font-size: 0.6875rem;
  }
}
</style>
