// A toast swiped away stays gone while it leaves: dropping its swipe-out animation used to show it
// again, fully opaque, where the finger let go, for the length of the exit.
import '../src/style.css'
import { expect, test } from 'vitest'

test('a swiped-out toast that is leaving is invisible', () => {
  const list = document.createElement('ol')
  list.className = 'ui-toaster'
  const toast = document.createElement('li')
  // The classes it has on the frame it starts to leave, from a recording of a real swipe.
  toast.className =
    'ui-toast ui-toast--default ui-toast-leave-from ui-toast-leave-active ui-toast-move'
  toast.dataset.swipeOut = 'true'
  toast.dataset.swipeDirection = 'right'
  toast.style.translate = '84px 0'
  toast.textContent = 'Saved'
  list.append(toast)
  document.body.append(list)
  const style = getComputedStyle(toast)
  expect(style.opacity).toBe('0')
  list.remove()
})
