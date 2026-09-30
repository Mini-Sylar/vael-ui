import type { Directive } from 'vue'
import { classifyInline, highlightInline } from './highlightInline'

// Guide prose reaches the page as `v-html` locale strings, `<i18n-t>` slots
// and plain template `<code>`, so rather than routing every one through
// `RichText`, this highlights whatever inline `<code>` ends up inside the
// element. Code blocks (`<pre>`), already-rendered chips (`.inline-code`) and
// live demo output are left alone.
const SKIP = 'pre, .inline-code, .demo-preview, [data-no-highlight]'

const observers = new WeakMap<HTMLElement, MutationObserver>()

function highlightWithin(root: HTMLElement): void {
  for (const code of root.querySelectorAll<HTMLElement>('code')) {
    if (code.parentElement?.closest(SKIP) || code.matches('.inline-code')) continue
    const text = code.textContent ?? ''
    // Already done for this exact text; also stops our own writes re-triggering.
    if (!text || code.dataset.highlighted === text) continue
    code.dataset.highlighted = text
    const kind = classifyInline(text)
    code.classList.toggle('code-ref', kind === 'ref')
    // A single token (`--ui-primary-contrast`) reads wrong split across lines.
    code.classList.toggle('code-token', !/\s/.test(text))
    if (kind === 'ref' || kind === 'plain') continue
    const lang = kind === 'code' ? 'ts' : kind
    highlightInline(text, lang).then((html) => {
      // The text may have changed (locale switch) while Shiki was working.
      if (code.textContent !== text) return
      // A color value gets a small preview swatch; it adds no text, so the
      // `highlighted` check above still matches. An <i>, not a <span>, so the
      // Shiki rule that clears token backgrounds doesn't clear its fill.
      const swatch =
        kind === 'cssValue' && CSS.supports('color', text)
          ? `<i class="code-swatch" style="background:${text}"></i>`
          : ''
      code.innerHTML = swatch + html
      code.classList.add('shiki')
    })
  }
}

export const vHighlightCode: Directive<HTMLElement> = {
  mounted(el) {
    highlightWithin(el)
    const observer = new MutationObserver(() => highlightWithin(el))
    observer.observe(el, { childList: true, subtree: true, characterData: true })
    observers.set(el, observer)
  },
  unmounted(el) {
    observers.get(el)?.disconnect()
    observers.delete(el)
  },
}
