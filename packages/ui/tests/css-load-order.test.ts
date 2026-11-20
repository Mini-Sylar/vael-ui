// A component's overrides on Dialog's or Popover's parts win whichever stylesheet loads last,
// as happens when code-split chunks arrive in another order.
import '../src/components/shared/tokens.css'
import '../src/components/BottomSheet/BottomSheet.css'
import '../src/components/TreeSelect/TreeSelect.css'
import '../src/components/SplitButton/SplitButton.css'
import '../src/components/Dialog/Dialog.css'
import '../src/components/Popover/Popover.css'
import '../src/components/Button/Button.css'
import { expect, test } from 'vitest'

function probe(classes: string): CSSStyleDeclaration {
  const el = document.createElement('div')
  el.className = classes
  document.body.append(el)
  return getComputedStyle(el)
}

test('a full-screen sheet panel keeps its size and its body its padding when Dialog.css loads last', () => {
  const panel = probe('ui-dialog-panel ui-bottom-sheet-panel ui-bottom-sheet-panel--full-screen')
  expect(panel.maxBlockSize).toBe(`${innerHeight}px`)
  expect(panel.inlineSize).toBe(`${document.body.clientWidth}px`)
  expect(probe('ui-dialog-body ui-bottom-sheet-body').paddingTop).toBe('0px')
})

test('a TreeSelect panel keeps its floor width when Popover.css loads last', () => {
  expect(probe('ui-popover-panel ui-tree-select-panel').minInlineSize).toBe('288px')
})

test('SplitButton keeps its joined corners when Button.css loads last', () => {
  const main = probe('ui-button ui-button--md ui-split-button-main')
  expect(main.borderStartEndRadius).toBe('0px')
  expect(main.borderInlineEndWidth).toBe('0px')
  expect(probe('ui-button ui-button--md ui-split-button-trigger').borderStartStartRadius).toBe(
    '0px',
  )
})
