// What Chromium hands to screen readers: the accessibility tree, read over the DevTools protocol.
import '../src/style.css'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-vue'
import { cdp, page } from 'vitest/browser'
import Toaster from '../src/components/Toaster/Toaster.vue'
import { toast } from '../src/composables/useToast'

type FrameTree = { frame: { id: string }; childFrames?: FrameTree[] }
type AXNode = {
  nodeId: string
  parentId?: string
  role?: { value: string }
  name?: { value: string }
  properties?: { name: string; value: { value: unknown } }[]
}

// Every frame's nodes: the test page runs inside an iframe.
async function axTree(): Promise<AXNode[]> {
  // Playwright's session; Vitest's own type leaves `send` to the provider.
  const session = cdp() as unknown as {
    send: (method: string, params?: object) => Promise<unknown>
  }
  await session.send('Accessibility.enable')
  const { frameTree } = (await session.send('Page.getFrameTree')) as { frameTree: FrameTree }
  const frames: string[] = []
  const walk = (tree: FrameTree) => {
    frames.push(tree.frame.id)
    tree.childFrames?.forEach(walk)
  }
  walk(frameTree)
  const nodes: AXNode[] = []
  for (const frameId of frames) {
    const result = (await session
      .send('Accessibility.getFullAXTree', { frameId })
      .catch(() => ({ nodes: [] }))) as { nodes: AXNode[] }
    nodes.push(...result.nodes)
  }
  return nodes
}

// The politeness a screen reader uses for a text: its nearest live region's.
function livenessOf(nodes: AXNode[], text: string): unknown {
  const byId = new Map(nodes.map((node) => [node.nodeId, node]))
  const start = nodes.find((node) => node.name?.value?.includes(text))
  for (let at = start; at; at = at.parentId ? byId.get(at.parentId) : undefined) {
    const live = at.properties?.find((property) => property.name === 'live')?.value.value
    if (live) return live
  }
  return undefined
}

test('Toaster: Chromium exposes an error toast as assertive and the rest as polite', async () => {
  const screen = await render(Toaster)
  toast('Saved')
  toast('Upload failed', { variant: 'error' })
  await expect.element(page.getByText('Upload failed')).toBeVisible()
  const nodes = await axTree()
  expect(livenessOf(nodes, 'Upload failed')).toBe('assertive')
  expect(livenessOf(nodes, 'Saved')).toBe('polite')
  toast.dismiss()
  await screen.unmount()
})
