import { expect, test } from 'vitest'
import {
  excludeSubtree,
  isDescendantOf,
  moveTreeNode,
  resolveDropPosition,
  resolveGrabbedOffset,
  resolveInsertionIndex,
  resolveRowShifts,
} from '../src/composables/useSortable'
import type { FlatSortableRow, SortableTreeNode } from '../src/composables/useSortable'

interface Node extends SortableTreeNode {
  value: string
  children?: Node[]
}

// a
// b
//   b1
//   b2
// c
function tree(): Node[] {
  return [
    { value: 'a' },
    { value: 'b', children: [{ value: 'b1' }, { value: 'b2' }] },
    { value: 'c' },
  ]
}
function shape(nodes: Node[]): string {
  return nodes
    .map((n) => (n.children?.length ? `${n.value}(${shape(n.children)})` : n.value))
    .join(',')
}
function rows(...specs: [string, number, string | null][]): FlatSortableRow[] {
  return specs.map(([value, depth, parentValue]) => ({ value, depth, parentValue }))
}

// ---------------------------------------------------------------------------
// resolveInsertionIndex — pure geometry
// ---------------------------------------------------------------------------

const bands = [
  { start: 0, size: 20 },
  { start: 20, size: 20 },
  { start: 40, size: 20 },
]

test('a pointer in the top half of a row inserts before it', () => {
  expect(resolveInsertionIndex(bands, 5)).toBe(0)
  expect(resolveInsertionIndex(bands, 25)).toBe(1)
})

test('a pointer in the bottom half of a row inserts after it', () => {
  expect(resolveInsertionIndex(bands, 15)).toBe(1)
  expect(resolveInsertionIndex(bands, 35)).toBe(2)
})

test('past the last row inserts at the end; above the first inserts at 0', () => {
  expect(resolveInsertionIndex(bands, 999)).toBe(3)
  expect(resolveInsertionIndex(bands, -999)).toBe(0)
  expect(resolveInsertionIndex([], 10)).toBe(0)
})

// ---------------------------------------------------------------------------
// resolveDropPosition
// ---------------------------------------------------------------------------

const flatRows = rows(['a', 0, null], ['b', 0, null], ['c', 0, null])

test('flat mode pins depth to 0 and ignores horizontal drag entirely', () => {
  const at = resolveDropPosition({
    rows: flatRows,
    insertionIndex: 2,
    offsetX: 500,
    indentWidth: 16,
    sourceDepth: 0,
    nested: false,
  })
  expect(at).toEqual({ parentValue: null, index: 2, depth: 0 })
})

test('a purely vertical nested drag keeps the source depth', () => {
  const at = resolveDropPosition({
    rows: flatRows,
    insertionIndex: 1,
    offsetX: 0,
    indentWidth: 16,
    sourceDepth: 0,
    nested: true,
  })
  expect(at).toEqual({ parentValue: null, index: 1, depth: 0 })
})

test('dragging right nests under the row above', () => {
  const at = resolveDropPosition({
    rows: flatRows,
    insertionIndex: 1,
    offsetX: 16,
    indentWidth: 16,
    sourceDepth: 0,
    nested: true,
  })
  expect(at).toEqual({ parentValue: 'a', index: 0, depth: 1 })
})

test('depth cannot exceed one level below the row above', () => {
  const at = resolveDropPosition({
    rows: flatRows,
    insertionIndex: 1,
    offsetX: 16 * 9, // asking for depth 9
    indentWidth: 16,
    sourceDepth: 0,
    nested: true,
  })
  expect(at.depth).toBe(1)
  expect(at.parentValue).toBe('a')
})

test('depth cannot go shallower than the row below, which would orphan it', () => {
  // Dropping between b and its own child b1: the item must stay at b1's depth.
  const nested = rows(['b', 0, null], ['b1', 1, 'b'], ['b2', 1, 'b'])
  const at = resolveDropPosition({
    rows: nested,
    insertionIndex: 1,
    offsetX: -999,
    indentWidth: 16,
    sourceDepth: 1,
    nested: true,
  })
  expect(at.depth).toBe(1)
  expect(at.parentValue).toBe('b')
})

test('index counts only existing siblings of the resolved parent', () => {
  const nested = rows(['b', 0, null], ['b1', 1, 'b'], ['b2', 1, 'b'], ['c', 0, null])
  const at = resolveDropPosition({
    rows: nested,
    insertionIndex: 3, // after b2, still inside b
    offsetX: 0,
    indentWidth: 16,
    sourceDepth: 1,
    nested: true,
  })
  expect(at).toEqual({ parentValue: 'b', index: 2, depth: 1 })
})

test('an out-of-range insertion index is clamped, not trusted', () => {
  expect(
    resolveDropPosition({
      rows: flatRows,
      insertionIndex: 99,
      offsetX: 0,
      indentWidth: 16,
      sourceDepth: 0,
      nested: false,
    }).index,
  ).toBe(3)
})

// ---------------------------------------------------------------------------
// isDescendantOf — the anti-corruption guard
// ---------------------------------------------------------------------------

test('reports real descendants and rejects unrelated nodes', () => {
  expect(isDescendantOf(tree(), 'b', 'b1')).toBe(true)
  expect(isDescendantOf(tree(), 'b', 'a')).toBe(false)
  expect(isDescendantOf(tree(), 'a', 'b')).toBe(false)
})

test('a node is not its own descendant, and leaves have none', () => {
  expect(isDescendantOf(tree(), 'b', 'b')).toBe(false)
  expect(isDescendantOf(tree(), 'a', 'anything')).toBe(false)
})

test('finds descendants more than one level down', () => {
  const deep: Node[] = [
    { value: 'root', children: [{ value: 'mid', children: [{ value: 'leaf' }] }] },
  ]
  expect(isDescendantOf(deep, 'root', 'leaf')).toBe(true)
})

// ---------------------------------------------------------------------------
// moveTreeNode — index is the FINAL resting slot, counted post-removal
// ---------------------------------------------------------------------------

test('moving down within a parent lands on the requested final index', () => {
  const nodes: Node[] = [{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }]
  expect(moveTreeNode(nodes, 'a', { parentValue: null, index: 2, depth: 0 })).toBe(true)
  expect(shape(nodes)).toBe('b,c,a,d')
  expect(nodes.findIndex((n) => n.value === 'a')).toBe(2)
})

test('moving up within a parent lands on the requested final index', () => {
  const nodes: Node[] = [{ value: 'a' }, { value: 'b' }, { value: 'c' }, { value: 'd' }]
  expect(moveTreeNode(nodes, 'c', { parentValue: null, index: 0, depth: 0 })).toBe(true)
  expect(shape(nodes)).toBe('c,a,b,d')
})

test('moves a root node into another node as a child', () => {
  const nodes = tree()
  expect(moveTreeNode(nodes, 'a', { parentValue: 'b', index: 1, depth: 1 })).toBe(true)
  expect(shape(nodes)).toBe('b(b1,a,b2),c')
})

test('moves a nested node back out to the root', () => {
  const nodes = tree()
  expect(moveTreeNode(nodes, 'b1', { parentValue: null, index: 0, depth: 0 })).toBe(true)
  expect(shape(nodes)).toBe('b1,a,b(b2),c')
})

test('moves into a node that has no children array yet', () => {
  const nodes = tree()
  expect(moveTreeNode(nodes, 'a', { parentValue: 'c', index: 0, depth: 1 })).toBe(true)
  expect(shape(nodes)).toBe('b(b1,b2),c(a)')
})

test('refuses to drop a node into its own subtree, leaving the tree untouched', () => {
  const nodes = tree()
  const before = shape(nodes)
  expect(moveTreeNode(nodes, 'b', { parentValue: 'b1', index: 0, depth: 2 })).toBe(false)
  expect(shape(nodes)).toBe(before)
})

test('refuses to make a node its own parent', () => {
  const nodes = tree()
  const before = shape(nodes)
  expect(moveTreeNode(nodes, 'b', { parentValue: 'b', index: 0, depth: 1 })).toBe(false)
  expect(shape(nodes)).toBe(before)
})

test('returns false for an unknown node or unknown parent, changing nothing', () => {
  const nodes = tree()
  const before = shape(nodes)
  expect(moveTreeNode(nodes, 'nope', { parentValue: null, index: 0, depth: 0 })).toBe(false)
  expect(moveTreeNode(nodes, 'a', { parentValue: 'nope', index: 0, depth: 1 })).toBe(false)
  expect(shape(nodes)).toBe(before)
})

test('an over-large index clamps to the end of the target parent', () => {
  const nodes = tree()
  expect(moveTreeNode(nodes, 'a', { parentValue: 'b', index: 99, depth: 1 })).toBe(true)
  expect(shape(nodes)).toBe('b(b1,b2,a),c')
})

test('resolveDropPosition and moveTreeNode agree end to end', () => {
  // Drag `a` down to sit between b2 and c, at root level. Rows exclude `a`.
  const nodes = tree()
  const visible = rows(['b', 0, null], ['b1', 1, 'b'], ['b2', 1, 'b'], ['c', 0, null])
  const at = resolveDropPosition({
    rows: visible,
    insertionIndex: 3,
    offsetX: -16, // pull back out to root level
    indentWidth: 16,
    sourceDepth: 1,
    nested: true,
  })
  expect(at).toEqual({ parentValue: null, index: 1, depth: 0 })
  expect(moveTreeNode(nodes, 'a', at)).toBe(true)
  expect(shape(nodes)).toBe('b(b1,b2),a,c')
})

// ---------------------------------------------------------------------------
// excludeSubtree / resolveRowShifts — what the drag visuals are built on
// ---------------------------------------------------------------------------

test('excluding a leaf removes exactly that row', () => {
  const all = rows(['a', 0, null], ['b', 0, null], ['c', 0, null])
  const out = excludeSubtree(all, 'b')
  expect(out.rows.map((r) => r.value)).toEqual(['a', 'c'])
  expect(out.removed.map((r) => r.value)).toEqual(['b'])
  expect(out.slot).toBe(1)
})

test('excluding a folder takes its whole subtree with it', () => {
  const all = rows(['a', 0, null], ['b', 0, null], ['b1', 1, 'b'], ['b2', 1, 'b'], ['c', 0, null])
  const out = excludeSubtree(all, 'b')
  expect(out.rows.map((r) => r.value)).toEqual(['a', 'c'])
  expect(out.removed.map((r) => r.value)).toEqual(['b', 'b1', 'b2'])
})

test('excluding a folder stops at the first row back at its own depth', () => {
  const all = rows(['b', 0, null], ['b1', 1, 'b'], ['deep', 2, 'b1'], ['c', 0, null])
  expect(excludeSubtree(all, 'b1').removed.map((r) => r.value)).toEqual(['b1', 'deep'])
})

test('excluding an unknown value is a no-op', () => {
  const all = rows(['a', 0, null])
  expect(excludeSubtree(all, 'nope').rows.map((r) => r.value)).toEqual(['a'])
})

test('dragging the first row to the end shifts everything up by one block', () => {
  // [A,B,C], drag A to the end -> B and C each rise one slot.
  const shifts = resolveRowShifts(
    [
      { value: 'b', wasBelowSource: true },
      { value: 'c', wasBelowSource: true },
    ],
    2,
    20,
  )
  expect(shifts.get('b')).toBe(-20)
  expect(shifts.get('c')).toBe(-20)
})

test('dropping back where it started shifts nothing', () => {
  const shifts = resolveRowShifts(
    [
      { value: 'b', wasBelowSource: true },
      { value: 'c', wasBelowSource: true },
    ],
    0,
    20,
  )
  expect(shifts.get('b')).toBe(0)
  expect(shifts.get('c')).toBe(0)
})

test('dragging the last row to the front pushes the others down', () => {
  // [A,B,C], drag C to the front -> A and B each drop one slot.
  const shifts = resolveRowShifts(
    [
      { value: 'a', wasBelowSource: false },
      { value: 'b', wasBelowSource: false },
    ],
    0,
    20,
  )
  expect(shifts.get('a')).toBe(20)
  expect(shifts.get('b')).toBe(20)
})

test('a middle row moving down shifts only the rows it passes', () => {
  // [A,B,C,D], drag B to sit after C -> only C moves (up); A and D hold.
  const shifts = resolveRowShifts(
    [
      { value: 'a', wasBelowSource: false },
      { value: 'c', wasBelowSource: true },
      { value: 'd', wasBelowSource: true },
    ],
    2,
    20,
  )
  expect(shifts.get('a')).toBe(0)
  expect(shifts.get('c')).toBe(-20)
  expect(shifts.get('d')).toBe(0)
})

test('the grabbed block travels the full pitch of every row it crosses', () => {
  const b = [{ size: 40 }, { size: 40 }, { size: 40 }]
  // Staying put moves nothing.
  expect(resolveGrabbedOffset(b, 0, 0, 4)).toBe(0)
  // Down past one row: its height plus the gap it also vacated.
  expect(resolveGrabbedOffset(b, 0, 1, 4)).toBe(44)
  expect(resolveGrabbedOffset(b, 0, 2, 4)).toBe(88)
  // Up is the same distance, negated.
  expect(resolveGrabbedOffset(b, 2, 0, 4)).toBe(-88)
})

test('grabbed offset handles rows of differing heights', () => {
  const b = [{ size: 20 }, { size: 60 }]
  expect(resolveGrabbedOffset(b, 0, 2, 0)).toBe(80)
})
