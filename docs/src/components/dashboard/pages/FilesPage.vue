<template>
  <div class="ide">
    <Resizable v-model:size="explorerSize" :min="150" :max="300" class="ide-explorer">
      <div class="ide-explorer-head">
        <span class="ide-caption">Explorer</span>
        <span class="ide-explorer-actions">
          <Button
            v-tooltip="'Expand all'"
            icon
            variant="ghost"
            size="sm"
            aria-label="Expand all"
            @click="tree?.expandAll()"
          >
            <PhArrowsOutLineVertical :size="14" />
          </Button>
          <Button
            v-tooltip="'Collapse all'"
            icon
            variant="ghost"
            size="sm"
            aria-label="Collapse all"
            @click="tree?.collapseAll()"
          >
            <PhArrowsInLineVertical :size="14" />
          </Button>
        </span>
      </div>
      <div class="ide-tree-scroll">
        <Tree
          ref="tree"
          v-model="selected"
          :items="fileTree"
          :filterable="false"
          expand-on-row-click
          :selectable-folders="false"
          sticky-scroll
          class="ide-tree"
        >
          <template #node="{ node, expanded }">
            <span class="ide-node" @contextmenu.prevent="openMenu(node as RepoFile, $event)">
              <span class="ide-chevron" :data-open="(isFolder(node) && expanded) || undefined">
                <PhCaretRight v-if="isFolder(node)" :size="11" weight="bold" />
              </span>
              <component
                :is="isFolder(node) ? (expanded ? PhFolderOpen : PhFolder) : PhFile"
                :size="15"
                class="ide-icon"
              />
              <span class="files-label" :data-status="(node as RepoFile).status">{{
                node.label
              }}</span>
              <span
                v-if="(node as RepoFile).status"
                class="ide-badge"
                :data-status="(node as RepoFile).status"
                >{{ (node as RepoFile).status }}</span
              >
            </span>
          </template>
        </Tree>
      </div>
      <!-- One shared menu; each row just reports a right-click. -->
      <ContextMenu
        ref="menu"
        :items="menuItems"
        :long-press="false"
        data-dash-overlay
        @select="onMenuSelect"
      />
    </Resizable>

    <div class="ide-editor">
      <div v-if="openFiles.length" class="ide-tabs" role="tablist" aria-label="Open files">
        <TransitionGroup name="ide-tab">
          <div
            v-for="path in openFiles"
            :key="path"
            class="ide-tab"
            :data-active="path === selected || undefined"
          >
            <button
              type="button"
              role="tab"
              class="ide-tab-open"
              :aria-selected="path === selected"
              @click="selected = path"
            >
              <PhFile :size="13" />{{ nameOf(path) }}
            </button>
            <button
              type="button"
              class="ide-tab-close"
              :aria-label="`Close ${nameOf(path)}`"
              @click="closeFile(path)"
            >
              <PhX :size="11" />
            </button>
          </div>
        </TransitionGroup>
      </div>

      <Transition name="ui-fade" mode="out-in">
        <div v-if="file" :key="selected ?? ''" class="ide-doc">
          <div class="ide-doc-bar">
            <Breadcrumb :items="crumbs" class="ide-crumbs" />
            <SelectButton v-model="view" :items="VIEWS" size="sm" :allow-empty="false" />
          </div>
          <div class="ide-code" :data-view="view">
            <div class="ide-gutter" aria-hidden="true">
              <span v-for="n in lineCount" :key="n">{{ view === 'blame' ? file.author : n }}</span>
            </div>
            <!-- eslint-disable-next-line vue/no-v-html -- Shiki output from our own static sources -->
            <div v-if="html" class="ide-shiki" v-html="html" />
            <pre v-else class="ide-plain">{{ file.code }}</pre>
          </div>
        </div>
        <div v-else key="empty" class="ide-empty">
          <PhFile :size="22" />
          <span>Open a file from the explorer.</span>
        </div>
      </Transition>

      <div class="ide-status">
        <span><PhGitBranch :size="12" />main</span>
        <span v-if="file">
          <Avatar :name="people[file.author]" size="sm" class="ide-status-avatar" />{{
            people[file.author].split(' ')[0]
          }}<template v-if="file.pr">, #{{ file.pr }}</template>
        </span>
        <span class="ide-push">{{ file ? `${file.lines} lines` : '' }}</span>
        <span>{{ file?.lang.toUpperCase() }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, shallowRef, useTemplateRef, watch } from 'vue'
import {
  Avatar,
  Breadcrumb,
  Button,
  ContextMenu,
  Resizable,
  SelectButton,
  Tree,
  toast,
  vTooltip,
} from 'vael-ui'
import type { BreadcrumbItemData, MenuEntry, MenuItemData, TreeNode } from 'vael-ui'
import {
  PhArrowsInLineVertical,
  PhArrowsOutLineVertical,
  PhCaretRight,
  PhClockCounterClockwise,
  PhCopy,
  PhFile,
  PhFolder,
  PhFolderOpen,
  PhGitBranch,
  PhTrash,
  PhX,
} from '@phosphor-icons/vue'
import { fileSources, fileTree, people } from '../repoData'
import type { RepoFile } from '../repoData'
import { highlightBlock } from '../../../composables/highlightInline'

const VIEWS = [
  { label: 'Code', value: 'code' },
  { label: 'Blame', value: 'blame' },
]

const tree = useTemplateRef<{ expandAll: () => void; collapseAll: () => void }>('tree')
const menu = useTemplateRef<{ openAt: (x: number, y: number) => void }>('menu')
const explorerSize = shallowRef(200)
const selected = shallowRef<string | null>(null)
const openFiles = shallowRef<string[]>([])
const view = shallowRef<'code' | 'blame'>('code')

const isFolder = (node: TreeNode) => !!node.children?.length
const nameOf = (path: string) => path.split('/').pop() ?? path
const file = computed(() => (selected.value ? fileSources[selected.value] : undefined))
const lineCount = computed(() => file.value?.code.split('\n').length ?? 0)
const crumbs = computed<BreadcrumbItemData[]>(() => {
  const parts = (selected.value ?? '').split('/')
  return parts.map((label, i) => ({ label, current: i === parts.length - 1 }))
})

// Opening a file adds a tab, the way an editor does.
watch(selected, (path) => {
  if (path && !openFiles.value.includes(path)) openFiles.value = [...openFiles.value, path]
})
function closeFile(path: string) {
  const next = openFiles.value.filter((p) => p !== path)
  openFiles.value = next
  if (selected.value === path) selected.value = next.at(-1) ?? null
}

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

const menuTarget = shallowRef<RepoFile | null>(null)
const menuItems = computed<MenuEntry[]>(() => [
  { label: 'Open', value: 'open', icon: PhFile, disabled: !!menuTarget.value?.children },
  { label: 'Copy path', value: 'copy', icon: PhCopy },
  { label: 'History', value: 'history', icon: PhClockCounterClockwise },
  { type: 'separator' },
  { label: 'Delete', value: 'delete', icon: PhTrash, danger: true },
])
function openMenu(node: RepoFile, event: MouseEvent) {
  menuTarget.value = node
  menu.value?.openAt(event.clientX, event.clientY)
}
function onMenuSelect(item: MenuItemData) {
  const node = menuTarget.value
  if (!node) return
  if (item.value === 'open' && !node.children) selected.value = String(node.value)
  else if (item.value === 'copy') toast(`Copied ${node.value}`)
  else if (item.value === 'history') toast(`${node.label}: 4 commits this week.`)
  else if (item.value === 'delete') toast.info("Nothing's deleted in this showcase.")
}

defineExpose({
  /** Back to a collapsed tree with no files open. */
  reset: () => {
    selected.value = null
    openFiles.value = []
    view.value = 'code'
    tree.value?.collapseAll()
  },
})
</script>

<style scoped>
/* Fills the dashboard's content area like an editor window. */
.ide {
  flex: 1 1 auto;
  display: flex;
  min-block-size: 22rem;
  block-size: 100%;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
  overflow: hidden;
  font-size: 0.8125rem;
  /* Selection reads in the info blue, like an editor, not near-black. */
  --ui-primary: var(--ui-info);
}
@container dash-main (max-width: 36rem) {
  .ide {
    flex-direction: column;
  }
  .ide-explorer {
    inline-size: auto !important;
    max-block-size: 45%;
    border-inline-end: 0 !important;
    border-block-end: 1px solid var(--ui-border);
  }
  .ide-explorer :deep(.ui-resizable-handle) {
    display: none;
  }
  /* The open tab already names the file; the toggle needs the room. */
  .ide-crumbs {
    display: none;
  }
  .ide-doc-bar {
    justify-content: flex-end;
  }
}

.ide-explorer {
  display: flex;
  flex-direction: column;
  flex: none;
  min-block-size: 0;
  border-inline-end: 1px solid var(--ui-border);
  background: color-mix(in oklch, var(--ui-muted) 35%, var(--ui-surface));
}
.ide-explorer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.25rem 0.375rem 0.25rem 0.75rem;
  border-block-end: 1px solid var(--ui-border);
}
.ide-caption {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}
.ide-explorer-actions {
  display: flex;
}
.ide-tree-scroll {
  flex: 1 1 auto;
  min-block-size: 0;
  overflow: auto;
  padding: 0.25rem;
}
.ide-node {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  min-inline-size: 0;
  inline-size: 100%;
}
.ide-chevron {
  display: inline-flex;
  flex: none;
  inline-size: 11px;
  color: var(--ui-text-muted);
  transition: rotate var(--ui-duration-press) var(--ui-ease-out);
}
.ide-chevron[data-open] {
  rotate: 90deg;
}
.ide-icon {
  flex: none;
  color: var(--ui-text-muted);
}
.files-label {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.files-label[data-status='M'],
.ide-badge[data-status='M'] {
  color: var(--ui-warning);
}
.files-label[data-status='U'],
.ide-badge[data-status='U'] {
  color: var(--ui-success);
}
.ide-badge {
  flex: none;
  font-size: 0.6875rem;
  font-weight: 600;
  padding-inline-end: 0.25rem;
}

.ide-editor {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  min-block-size: 0;
}
.ide-tabs {
  display: flex;
  flex: none;
  overflow-x: auto;
  scrollbar-width: none;
  border-block-end: 1px solid var(--ui-border);
  background: color-mix(in oklch, var(--ui-muted) 35%, var(--ui-surface));
}
.ide-tab {
  display: flex;
  align-items: center;
  flex: none;
  border-inline-end: 1px solid var(--ui-border);
  color: var(--ui-text-muted);
}
.ide-tab[data-active] {
  background: var(--ui-surface);
  color: var(--ui-text);
  box-shadow: inset 0 2px var(--ui-info);
}
.ide-tab-open,
.ide-tab-close {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}
.ide-tab-open {
  padding: 0.4375rem 0.25rem 0.4375rem 0.75rem;
  white-space: nowrap;
}
.ide-tab-close {
  justify-content: center;
  inline-size: 1.25rem;
  block-size: 1.25rem;
  margin-inline-end: 0.375rem;
  border-radius: 4px;
  opacity: 0.6;
}
@media (hover: hover) and (pointer: fine) {
  .ide-tab-close:hover {
    opacity: 1;
    background: var(--ui-muted);
  }
}
.ide-tab-open:focus-visible,
.ide-tab-close:focus-visible {
  outline: 2px solid var(--ui-primary);
  outline-offset: -2px;
}
.ide-tab-enter-active {
  transition: opacity var(--ui-duration-enter) var(--ui-ease-out);
}
.ide-tab-enter-from {
  opacity: 0;
}

.ide-doc {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-block-size: 0;
}
.ide-doc-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.375rem 0.75rem;
  min-inline-size: 0;
}
.ide-crumbs {
  flex: 1 1 auto;
  min-inline-size: 0;
}
.ide-crumbs :deep(.ui-breadcrumb-list) {
  font-size: 0.75rem;
  flex-wrap: nowrap;
  overflow: hidden;
}
.ide-code {
  flex: 1 1 auto;
  display: flex;
  min-block-size: 0;
  overflow: auto;
  font-size: 0.75rem;
  line-height: 1.7;
}
.ide-gutter {
  display: flex;
  flex-direction: column;
  flex: none;
  align-items: flex-end;
  min-inline-size: 2.25rem;
  padding: 0.5rem 0.625rem;
  font-family: 'Geist Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace;
  color: color-mix(in oklch, var(--ui-text-muted) 70%, transparent);
  user-select: none;
}
.ide-code[data-view='blame'] .ide-gutter {
  min-inline-size: 3rem;
  border-inline-end: 1px solid var(--ui-border);
  color: var(--ui-info);
}
.ide-shiki {
  min-inline-size: 0;
}
.ide-shiki :deep(pre),
.ide-plain {
  margin: 0;
  padding: 0.5rem 0.75rem 0.5rem 0;
  background: transparent !important;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.ide-empty {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  color: var(--ui-text-muted);
}

.ide-status {
  display: flex;
  align-items: center;
  gap: 0.875rem;
  flex: none;
  padding: 0.25rem 0.75rem;
  border-block-start: 1px solid var(--ui-border);
  font-size: 0.6875rem;
  color: var(--ui-text-muted);
  white-space: nowrap;
  overflow: hidden;
}
.ide-status > span {
  display: inline-flex;
  align-items: center;
  gap: 0.3125rem;
}
.ide-status-avatar.ui-avatar {
  inline-size: 1rem;
  block-size: 1rem;
  font-size: 0.4375rem;
}
.ide-push {
  margin-inline-start: auto;
}
</style>
