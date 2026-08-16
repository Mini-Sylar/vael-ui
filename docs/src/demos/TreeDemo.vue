<template>
  <section class="demo">
    <h2>Tree</h2>
    <p class="note">
      The tree BODY extracted out of <code>TreeSelect</code>'s own popover panel (see its own SFC
      comment) so it can render on its own, with no trigger button, no positioner, no Teleport. Same
      expand/collapse, checkbox-indeterminate, filter, and roving-keyboard-nav behavior either way,
      just permanently in the page flow instead of behind a click. A VS Code-style file-explorer
      sidebar is the case that motivated pulling it out. Try it with a keyboard: Tab into either
      tree below, then ArrowDown/ArrowRight/ArrowLeft/Enter.
    </p>

    <div class="tree-demo-shell">
      <div class="tree-demo-column">
        <h3>Single-select, <code>selectionMode="single"</code></h3>
        <p class="note">Picking any node (folder or file) replaces the selection.</p>
        <div class="tree-demo-sidebar">
          <Tree v-model="singleValue" :items="fileTree" />
        </div>
        <output class="panel-text">
          {{ singleValue ? `Selected: ${singleValue}` : 'Nothing selected yet' }}
        </output>
      </div>

      <div class="tree-demo-column">
        <h3>Checkbox, <code>selectionMode="checkbox"</code>, indeterminate parents</h3>
        <p class="note">
          Checking a folder cascades to every enabled file beneath it.
          <code>node_modules</code> is disabled: its whole subtree is unreachable and never
          participates in a parent's indeterminate count.
        </p>
        <div class="tree-demo-sidebar">
          <Tree v-model="checkboxValues" :items="fileTree" selection-mode="checkbox" />
        </div>
        <output class="panel-text">
          {{
            checkboxValues.length
              ? `${checkboxValues.length} file(s) selected`
              : 'Nothing selected yet'
          }}
        </output>
      </div>
    </div>

    <h3>A small VS Code</h3>
    <p class="note">
      Everything here composes from existing pieces: the <code>#node</code> slot replaces the row's
      default content entirely (chevron, checkbox, label, checkmark), so git-status colors and a
      rename field are just markup, not new API. <code>expandOnRowClick</code> makes a folder click
      also expand it; <code>selectableFolders="false"</code> keeps a folder out of the selection
      entirely, so browsing through folders never knocks the currently-open file out of the editor
      pane. <code>stickyScroll</code> pins the expanded ancestor chain while scrolling, using native
      <code>position: sticky</code>. The toolbar and right-click menu drive the tree's data directly
      (<code>Tree</code> is uncontrolled state internally, so adding/removing/renaming nodes is just
      editing the <code>items</code> array) — creating a file or folder calls the exposed
      <code>expandNode()</code> on its parent so the new entry is immediately visible, and
      <code>expandAll()</code>/<code>collapseAll()</code> back the toolbar buttons, the same way
      <code>focusFirstRow</code> is exposed. Click a file to open it on the right, the way a real
      editor tab would.
    </p>
    <div class="vscode-shell">
      <Resizable v-model:size="sidebarSize" :min="200" :max="360" class="vscode-sidebar">
        <div class="vscode-toolbar">
          <span class="vscode-toolbar-title">Explorer</span>
          <Toolbar aria-label="Explorer actions" class="vscode-toolbar-actions">
            <template #end>
              <Button
                v-tooltip="searchOpen ? 'Close search' : 'Search files'"
                icon
                variant="ghost"
                size="sm"
                data-toolbar-overflow
                :aria-label="searchOpen ? 'Close search' : 'Search files'"
                @click="toggleSearch"
              >
                <PhMagnifyingGlass :size="14" />
              </Button>
              <Button
                v-tooltip="'New File'"
                icon
                variant="ghost"
                size="sm"
                data-toolbar-overflow
                aria-label="New File"
                @click="createFile(contextFolder)"
              >
                <PhFilePlus :size="14" />
              </Button>
              <Button
                v-tooltip="'New Folder'"
                icon
                variant="ghost"
                size="sm"
                data-toolbar-overflow
                aria-label="New Folder"
                @click="createFolder(contextFolder)"
              >
                <PhFolderPlus :size="14" />
              </Button>
              <Button
                v-tooltip="'Expand All'"
                icon
                variant="ghost"
                size="sm"
                data-toolbar-overflow
                aria-label="Expand All"
                @click="expandAll"
              >
                <PhArrowsOutLineVertical :size="14" />
              </Button>
              <Button
                v-tooltip="'Collapse All'"
                icon
                variant="ghost"
                size="sm"
                data-toolbar-overflow
                aria-label="Collapse All"
                @click="collapseAll"
              >
                <PhArrowsInLineVertical :size="14" />
              </Button>
            </template>
          </Toolbar>
        </div>
        <Input
          v-if="searchOpen"
          v-model="vscodeQuery"
          placeholder="Search files..."
          size="sm"
          class="vscode-search"
        />

        <div class="vscode-tree-scroll">
          <Tree
            ref="treeRef"
            v-model="vscodeValue"
            v-model:query="vscodeQuery"
            v-model:node="selectedFile"
            :items="gitFileTree"
            :filterable="false"
            expand-on-row-click
            :selectable-folders="false"
            sticky-scroll
          >
            <template #node="{ node, expanded, checked }">
              <span
                class="vscode-node-wrapper"
                @click="setContext(node)"
                @contextmenu.prevent="openContextMenu(node, $event)"
              >
                <span class="vscode-chevron" :data-open="node.children ? expanded : undefined">
                  <PhCaretRight v-if="node.children" :size="12" />
                </span>
                <component :is="node.children ? PhFolder : PhFile" :size="14" class="vscode-icon" />
                <Input
                  v-if="editingValue === node.value"
                  v-model="editingDraftName"
                  size="sm"
                  class="vscode-rename-input"
                  @click.stop
                  @keydown.enter="commitRename"
                  @keydown.esc="editingValue = null"
                  @blur="commitRename"
                />
                <span
                  v-else
                  class="vscode-label"
                  :data-status="node.gitStatus"
                  :data-selected="checked || isContextFolder(node) || undefined"
                >
                  {{ node.label }}
                </span>
                <span v-if="node.gitStatus" class="vscode-badge" :data-status="node.gitStatus">
                  {{ node.gitStatus }}
                </span>
              </span>
            </template>
          </Tree>
          <!-- One shared instance instead of one per row — each row just
               reports a right-click; nothing about the menu itself is
               per-node, so N rows shouldn't mean N popover instances. -->
          <ContextMenu ref="contextMenuRef" :items="contextMenuItems" :long-press="false" />
        </div>
      </Resizable>

      <div class="vscode-editor">
        <div v-if="selectedFile" class="vscode-editor-tab">
          <component :is="PhFile" :size="14" />
          {{ selectedFile.label }}
        </div>
        <pre
          v-if="selectedFile"
          class="vscode-editor-content"
        ><code v-html="syntaxHighlightedLanguage || '//'" /></pre>
        <div v-else class="vscode-editor-empty">Select a file to open it</div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, shallowRef, useTemplateRef, watch, watchEffect } from 'vue'
import { codeToHtml } from 'shiki'
import {
  Button,
  ContextMenu,
  findTreeNode,
  findTreeParent,
  Input,
  removeTreeNode,
  Resizable,
  Toolbar,
  Tree,
  vTooltip,
} from 'vael-ui'
import type { MenuEntry, TreeNode } from 'vael-ui'
import {
  PhArrowsInLineVertical,
  PhArrowsOutLineVertical,
  PhCaretRight,
  PhFile,
  PhFilePlus,
  PhFolder,
  PhFolderPlus,
  PhMagnifyingGlass,
  PhTrash,
} from '@phosphor-icons/vue'

// Same nested file/folder shape as TreeSelectDemo's own `fileTree`. The two
// components share one tree-body implementation (Tree.vue), so the same
// data plausibly exercises both the same way.
const fileTree: TreeNode[] = [
  {
    label: 'src',
    value: 'src',
    children: [
      {
        label: 'components',
        value: 'src/components',
        children: [
          { label: 'Button.vue', value: 'src/components/Button.vue' },
          { label: 'Input.vue', value: 'src/components/Input.vue' },
          {
            label: 'forms',
            value: 'src/components/forms',
            children: [
              {
                label: 'TextField.vue',
                value: 'src/components/forms/TextField.vue',
              },
              {
                label: 'Checkbox.vue',
                value: 'src/components/forms/Checkbox.vue',
              },
            ],
          },
        ],
      },
      {
        label: 'composables',
        value: 'src/composables',
        children: [
          { label: 'useAuth.ts', value: 'src/composables/useAuth.ts' },
          { label: 'useFetch.ts', value: 'src/composables/useFetch.ts' },
        ],
      },
      {
        label: 'pages',
        value: 'src/pages',
        children: [
          { label: 'Home.vue', value: 'src/pages/Home.vue' },
          { label: 'About.vue', value: 'src/pages/About.vue' },
          {
            label: 'admin',
            value: 'src/pages/admin',
            children: [
              {
                label: 'Dashboard.vue',
                value: 'src/pages/admin/Dashboard.vue',
              },
              { label: 'Settings.vue', value: 'src/pages/admin/Settings.vue' },
            ],
          },
        ],
      },
    ],
  },
  {
    label: 'docs',
    value: 'docs',
    children: [
      { label: 'README.md', value: 'docs/README.md' },
      { label: 'CONTRIBUTING.md', value: 'docs/CONTRIBUTING.md' },
    ],
  },
  {
    label: 'tests',
    value: 'tests',
    children: [
      {
        label: 'unit',
        value: 'tests/unit',
        children: [{ label: 'button.test.ts', value: 'tests/unit/button.test.ts' }],
      },
      {
        label: 'e2e',
        value: 'tests/e2e',
        children: [{ label: 'login.test.ts', value: 'tests/e2e/login.test.ts' }],
      },
    ],
  },
  {
    label: 'node_modules',
    value: 'node_modules',
    disabled: true,
    children: [
      { label: 'vue', value: 'node_modules/vue', disabled: true },
      { label: 'vite', value: 'node_modules/vite', disabled: true },
    ],
  },
  { label: 'package.json', value: 'package.json' },
  { label: 'index.html', value: 'index.html' },
]

const singleValue = shallowRef<string | number | null>(null)
const checkboxValues = shallowRef<(string | number)[]>([])

// Git status and file content are just app-defined extra fields; Tree's
// generic node type (`T extends TreeNode`) passes them straight through to
// the #node slot untouched.
interface GitTreeNode extends TreeNode {
  children?: GitTreeNode[]
  gitStatus?: 'M' | 'U'
  content?: string
  language?: string
}

const gitFileTree = ref<GitTreeNode[]>([
  {
    label: 'src',
    value: 'src',
    children: [
      {
        label: 'components',
        value: 'src/components',
        children: [
          {
            label: 'Button.vue',
            value: 'src/components/Button.vue',
            gitStatus: 'M',
            content: `<template>
  <button class="btn" :class="variant" @click="$emit('click')">
    <slot />
  </button>
</template>

<script setup lang="ts">
defineProps<{ variant?: 'primary' | 'secondary' }>()
defineEmits<{ click: [] }>()
<${''}/script>`,
            language: 'vue',
          },
          {
            label: 'Input.vue',
            value: 'src/components/Input.vue',
            content: `<template>
  <input class="input" v-model="model" :placeholder="placeholder" />
</template>

<script setup lang="ts">
const model = defineModel<string>({ default: '' })
defineProps<{ placeholder?: string }>()
<${''}/script>`,
            language: 'vue',
          },
          {
            label: 'GitBadge.vue',
            value: 'src/components/GitBadge.vue',
            gitStatus: 'U',
            content: `<template>
  <span class="git-badge" :data-status="status">{{ status }}</span>
</template>

<script setup lang="ts">
defineProps<{ status: 'M' | 'U' | 'A' | 'D' }>()
<${''}/script>`,
            language: 'vue',
          },
          { label: 'Select.vue', value: 'src/components/Select.vue' },
          { label: 'Tooltip.vue', value: 'src/components/Tooltip.vue' },
        ],
      },
      {
        label: 'composables',
        value: 'src/composables',
        children: [
          {
            label: 'useAuth.ts',
            value: 'src/composables/useAuth.ts',
            content: `export function useAuth() {
  const user = ref<User | null>(null)

  async function login(email: string, password: string) {
    user.value = await api.post('/login', { email, password })
  }

  return { user, login }
}`,
            language: 'vue',
          },
          {
            label: 'useGitStatus.ts',
            value: 'src/composables/useGitStatus.ts',
            gitStatus: 'U',
            content: `export function useGitStatus(path: MaybeRefOrGetter<string>) {
  const status = ref<'M' | 'U' | 'A' | 'D' | null>(null)

  watchEffect(async () => {
    status.value = await git.statusFor(toValue(path))
  })

  return status
}`,
            language: 'vue',
          },
          {
            label: 'useFetch.ts',
            value: 'src/composables/useFetch.ts',
            language: 'typescript',
          },
        ],
      },
      {
        label: 'pages',
        value: 'src/pages',
        children: [
          { label: 'Home.vue', value: 'src/pages/Home.vue', language: 'vue' },
          {
            label: 'Settings.vue',
            value: 'src/pages/Settings.vue',
            gitStatus: 'M',
            language: 'vue',
          },
          { label: 'Login.vue', value: 'src/pages/Login.vue', language: 'vue' },
        ],
      },
      {
        label: 'utils',
        value: 'src/utils',
        children: [
          { label: 'format.ts', value: 'src/utils/format.ts' },
          {
            label: 'validate.ts',
            value: 'src/utils/validate.ts',
            gitStatus: 'U',
          },
        ],
      },
      {
        label: 'assets',
        value: 'src/assets',
        children: [
          { label: 'logo.svg', value: 'src/assets/logo.svg' },
          { label: 'styles.css', value: 'src/assets/styles.css' },
        ],
      },
    ],
  },
  {
    label: 'tests',
    value: 'tests',
    children: [
      { label: 'button.test.ts', value: 'tests/button.test.ts' },
      { label: 'tree.test.ts', value: 'tests/tree.test.ts', gitStatus: 'U' },
      { label: 'setup.ts', value: 'tests/setup.ts' },
    ],
  },
  {
    label: 'package.json',
    value: 'package.json',
    gitStatus: 'M',
    content: `{
  "name": "my-app",
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  }
}`,
  },
  { label: 'tsconfig.json', value: 'tsconfig.json', language: 'json' },
  {
    label: 'README.md',
    value: 'README.md',
    content: `# my-app

A small app built with vael-ui.

## Setup

\`\`\`sh
pnpm install
pnpm dev
\`\`\`
`,
  },
])

const sidebarSize = shallowRef(256)

const vscodeValue = shallowRef<string | number | null>(null)
const vscodeQuery = shallowRef('')
const searchOpen = shallowRef(false)
function toggleSearch() {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) vscodeQuery.value = ''
}

// v-model:node keeps this in lockstep with vscodeValue as the full node
// object, so the editor pane doesn't need its own findTreeNode lookup.
const selectedFile = shallowRef<GitTreeNode | null>(null)
const syntaxHighlightedLanguage = ref<string | null>(null)

watch(
  selectedFile,
  async (file) => {
    if (!file || !file.content) {
      syntaxHighlightedLanguage.value = null
      return
    }
    const lang = file.language ?? 'typescript'
    syntaxHighlightedLanguage.value = await codeToHtml(file.content, {
      lang,
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    })
  },
  { immediate: true },
)

const treeRef = useTemplateRef('treeRef')
function collapseAll() {
  treeRef.value?.collapseAll()
}
function expandAll() {
  treeRef.value?.expandAll()
}

// Tracks the last-clicked node so the toolbar's New File/New Folder create
// inside whatever the user is currently browsing, instead of always at root.
const contextFolder = shallowRef<GitTreeNode | null>(null)
function setContext(node: GitTreeNode) {
  contextFolder.value = node.children ? node : findTreeParent(gitFileTree.value, node.value)
}
// selectableFolders="false" keeps a folder out of Tree's own selection, so
// its `checked` slot prop never reflects it — this is the only remaining
// signal for "New File/Folder will land here".
function isContextFolder(node: GitTreeNode): boolean {
  return !!node.children && contextFolder.value?.value === node.value
}

let untitledCounter = 1
const editingValue = shallowRef<string | number | null>(null)
const editingDraftName = shallowRef('')
function startEditing(node: GitTreeNode) {
  editingValue.value = node.value
  editingDraftName.value = node.label
  nextTick(() => {
    document.querySelector<HTMLInputElement>('.vscode-rename-input input')?.select()
  })
}
function commitRename() {
  if (editingValue.value == null) return
  const node = findTreeNode(gitFileTree.value, editingValue.value)
  if (node && editingDraftName.value.trim()) node.label = editingDraftName.value.trim()
  editingValue.value = null
}

function createFile(parent: GitTreeNode | null) {
  const node: GitTreeNode = {
    label: `untitled-${untitledCounter}.ts`,
    value: `untitled-${untitledCounter}-${Date.now()}`,
    content: '',
  }
  untitledCounter++
  if (parent) {
    parent.children ??= []
    parent.children.push(node)
    treeRef.value?.expandNode(parent.value)
  } else {
    gitFileTree.value.push(node)
  }
  startEditing(node)
}
function createFolder(parent: GitTreeNode | null) {
  const node: GitTreeNode = {
    label: `New Folder`,
    value: `new-folder-${untitledCounter}-${Date.now()}`,
    children: [],
  }
  untitledCounter++
  if (parent) {
    parent.children ??= []
    parent.children.push(node)
    treeRef.value?.expandNode(parent.value)
  } else {
    gitFileTree.value.push(node)
  }
  startEditing(node)
}

function contextItemsFor(node: GitTreeNode): MenuEntry[] {
  const items: MenuEntry[] = []
  if (node.children) {
    items.push(
      {
        label: 'New File',
        value: 'new-file',
        icon: PhFilePlus,
        onSelect: () => createFile(node),
      },
      {
        label: 'New Folder',
        value: 'new-folder',
        icon: PhFolderPlus,
        onSelect: () => createFolder(node),
      },
      { type: 'separator' },
    )
  }
  items.push(
    { label: 'Rename', value: 'rename', onSelect: () => startEditing(node) },
    {
      label: 'Delete',
      value: 'delete',
      icon: PhTrash,
      danger: true,
      onSelect: () => removeTreeNode(gitFileTree.value, node.value),
    },
  )
  return items
}

// Single ContextMenu instance shared by every row (see the template) —
// retargeted per right-click instead of rendering one per row.
const contextMenuRef = useTemplateRef('contextMenuRef')
const contextMenuTarget = shallowRef<GitTreeNode | null>(null)
const contextMenuItems = computed(() =>
  contextMenuTarget.value ? contextItemsFor(contextMenuTarget.value) : [],
)
function openContextMenu(node: GitTreeNode, event: MouseEvent) {
  contextMenuTarget.value = node
  contextMenuRef.value?.openAt(event.clientX, event.clientY)
}
</script>

<style scoped>
.tree-demo-shell {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: flex-start;
}
.tree-demo-column {
  flex: 1 1 20rem;
  min-inline-size: 18rem;
}
.tree-demo-sidebar {
  display: flex;
  flex-direction: column;
  block-size: 20rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
  overflow: hidden;
  margin-block: 0.5rem;
}

.vscode-shell {
  display: flex;
  block-size: 26rem;
  border: 1px solid var(--ui-border);
  border-radius: var(--ui-radius-surface);
  background: var(--ui-surface);
  overflow: hidden;
  margin-block: 0.5rem;
  /* Local override so "selected" is visibly distinct from plain text: the
     library's default theme sets --ui-primary to the same near-black as
     --ui-text, so an app that wants a branded selection color sets this,
     same as any other --ui-* token. --ui-info is already theme-aware. */
  --ui-primary: var(--ui-info);
}
.vscode-sidebar {
  display: flex;
  flex-direction: column;
  flex: none;
  border-inline-end: 1px solid var(--ui-border);
}
.vscode-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.375rem 0.625rem;
  border-block-end: 1px solid var(--ui-border);
}
.vscode-toolbar-title {
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ui-text-muted);
}
/* flex: 1 so useToolbar's ResizeObserver sees true available width, not just
   current content size — otherwise collapsed items never see room to restore. */
.vscode-toolbar-actions {
  flex: 1;
  min-inline-size: 0;
  justify-content: flex-end;
}
.vscode-search {
  flex: none;
  margin: 0.375rem 0.5rem;
}
.vscode-tree-scroll {
  flex: 1 1 auto;
  min-block-size: 0;
  display: flex;
}
.vscode-rename-input {
  flex: 1;
  min-inline-size: 0;
}

.vscode-editor {
  flex: 1 1 auto;
  min-inline-size: 0;
  display: flex;
  flex-direction: column;
}
.vscode-editor-tab {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.5rem 0.75rem;
  border-block-end: 1px solid var(--ui-border);
  font-size: 0.8125rem;
  color: var(--ui-text-muted);
}
.vscode-editor-content {
  flex: 1 1 auto;
  min-block-size: 0;
  overflow: auto;
  margin: 0;
  padding: 0.875rem 1rem;
  font-family: var(--ui-font-mono, ui-monospace, monospace);
  font-size: 0.8125rem;
  line-height: 1.5;
  white-space: pre-wrap;
}
.vscode-editor-empty {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--ui-text-muted);
  font-size: 0.8125rem;
}

.vscode-node-wrapper {
  display: contents;
}
.vscode-chevron {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  inline-size: 12px;
  block-size: 12px;
  color: var(--ui-text-muted);
  transition: transform var(--ui-duration-press) ease;
}
.vscode-chevron[data-open='true'] {
  transform: rotate(90deg);
}
.vscode-icon {
  flex: none;
  color: var(--ui-text-muted);
}
.vscode-label {
  flex: 1;
  min-inline-size: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vscode-label[data-status='M'] {
  color: var(--ui-warning);
}
.vscode-label[data-status='U'] {
  color: var(--ui-success);
}
.vscode-label[data-selected] {
  color: var(--ui-primary);
}
.vscode-badge {
  flex: none;
  font-size: 0.6875rem;
  font-weight: 600;
}
.vscode-badge[data-status='M'] {
  color: var(--ui-warning);
}
.vscode-badge[data-status='U'] {
  color: var(--ui-success);
}
</style>
