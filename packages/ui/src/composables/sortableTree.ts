import type { DropPosition, SortableTreeNode } from './useSortable'

// Tree moves for reorderable trees. Kept apart from the drag engine so a component can move nodes
// without loading it.

/**
 * How to read a node's identity and children. Defaults match the house item
 * vocabulary (`value` / `children`), so `MenuItemData`, `TreeNode` and friends
 * need no configuration — a flat list of arbitrary records just supplies its
 * own `getKey`, and then reorders through the exact same code path as a tree.
 */
export interface TreeAccessors<T> {
  getKey?: (node: T) => string | number
  getChildren?: (node: T) => T[] | undefined
  setChildren?: (node: T, children: T[]) => void
}

function keyOfNode<T>(node: T, accessors?: TreeAccessors<T>): string | number {
  return accessors?.getKey ? accessors.getKey(node) : (node as SortableTreeNode).value
}
function childrenOfNode<T>(node: T, accessors?: TreeAccessors<T>): T[] | undefined {
  if (accessors?.getChildren) return accessors.getChildren(node)
  return (node as SortableTreeNode).children as T[] | undefined
}
function assignChildren<T>(node: T, children: T[], accessors?: TreeAccessors<T>): void {
  if (accessors?.setChildren) accessors.setChildren(node, children)
  else (node as { children?: T[] }).children = children
}

function findNodeIn<T>(
  nodes: readonly T[],
  value: string | number,
  accessors?: TreeAccessors<T>,
): T | undefined {
  for (const node of nodes) {
    if (keyOfNode(node, accessors) === value) return node
    const children = childrenOfNode(node, accessors)
    if (children) {
      const hit = findNodeIn(children, value, accessors)
      if (hit) return hit
    }
  }
  return undefined
}

function containsValue<T>(
  nodes: readonly T[],
  value: string | number,
  accessors?: TreeAccessors<T>,
): boolean {
  return nodes.some((node) => {
    if (keyOfNode(node, accessors) === value) return true
    const children = childrenOfNode(node, accessors)
    return !!children && containsValue(children, value, accessors)
  })
}

/** Guard on every move: dropping a folder into its own descendant detaches that branch and loses it. */
export function isDescendantOf<T>(
  nodes: readonly T[],
  ancestorValue: string | number,
  candidateValue: string | number,
  accessors?: TreeAccessors<T>,
): boolean {
  const ancestor = findNodeIn(nodes, ancestorValue, accessors)
  const children = ancestor && childrenOfNode(ancestor, accessors)
  if (!children) return false
  return containsValue(children, candidateValue, accessors)
}

function detach<T>(
  nodes: T[],
  value: string | number,
  accessors?: TreeAccessors<T>,
): { node: T; from: T[]; index: number } | null {
  const index = nodes.findIndex((node) => keyOfNode(node, accessors) === value)
  if (index !== -1) return { node: nodes.splice(index, 1)[0]!, from: nodes, index }
  for (const node of nodes) {
    const children = childrenOfNode(node, accessors)
    if (!children) continue
    const hit = detach(children, value, accessors)
    if (hit) return hit
  }
  return null
}

/**
 * Moves a node to `to`, mutating `nodes` in place — same contract as
 * `removeTreeNode`, which a consumer editing `items` directly already relies
 * on. `to.index` is the node's final resting slot among its new siblings,
 * counted as if it were already removed. Returns false and changes nothing
 * when the move is impossible (unknown value, unknown parent, or a drop into
 * the node's own subtree).
 */
export function moveTreeNode<T>(
  nodes: T[],
  value: string | number,
  to: DropPosition,
  accessors?: TreeAccessors<T>,
): boolean {
  if (to.parentValue === value) return false
  if (to.parentValue != null && isDescendantOf(nodes, value, to.parentValue, accessors)) {
    return false
  }

  let target: T[]
  if (to.parentValue == null) {
    target = nodes
  } else {
    const parent = findNodeIn(nodes, to.parentValue, accessors)
    if (!parent) return false
    let children = childrenOfNode(parent, accessors)
    if (!children) {
      children = []
      assignChildren(parent, children, accessors)
    }
    target = children
  }

  const detached = detach(nodes, value, accessors)
  if (!detached) return false

  // `to.index` is the node's FINAL resting slot, counted with the node itself
  // already gone — which is exactly the basis `resolveDropPosition` works on
  // (it is handed rows with the dragged subtree removed). Detaching first
  // therefore lands on that basis directly; no off-by-one correction.
  target.splice(Math.min(target.length, Math.max(0, to.index)), 0, detached.node)
  return true
}
