// Runs inside each docs page: records what moves, tells when it has settled, and finds what's
// hidden at rest. Plain script (addInitScript), so no imports.
;(() => {
  const ENGINE_PROPS = [
    'translate',
    'scale',
    'rotate',
    'transform',
    'opacity',
    'clip-path',
    'filter',
  ]
  const OVERLAY =
    '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [role="tooltip"], .ui-popover-panel'

  // A stable name for an element: its place under `root`, by tag, first class and index.
  function keyOf(el, root) {
    const parts = []
    for (let at = el; at && at !== root && at !== document.body; at = at.parentElement) {
      const cls = [...at.classList].find((c) => !c.startsWith('data-v-')) ?? ''
      // Under <body> (a teleported overlay), the index shifts as others come and go: by class only.
      const top = at.parentElement === document.body
      const same =
        !top && at.parentElement
          ? [...at.parentElement.children].filter((c) => c.tagName === at.tagName)
          : []
      parts.unshift(
        `${at.tagName.toLowerCase()}${cls ? '.' + cls : ''}${top ? '' : ':' + same.indexOf(at)}`,
      )
    }
    return parts.join('>')
  }
  const rootOf = (el) => el.closest('section.demo') ?? document.body
  // A demo, or an overlay teleported out of the app: never the docs' own chrome around them.
  // While a demo is being pressed, only it counts: another demo scrolling into view isn't its motion.
  let focus = null
  const inScope = (el) =>
    (focus ? focus.contains(el) : !!el.closest('section.demo')) || !el.closest('#app')
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
  const alpha = (color) => {
    const m = color.match(/rgba?\(([^)]+)\)/)
    if (!m) return color === 'transparent' ? 0 : 1
    const parts = m[1].split(/[ ,/]+/).filter(Boolean)
    return parts.length > 3 ? Number.parseFloat(parts[3]) : 1
  }
  const paints = (el) => {
    const s = getComputedStyle(el)
    return alpha(s.backgroundColor) > 0.05 || s.backgroundImage !== 'none' || ownText(el)
  }
  const describe = (el) =>
    `<${el.tagName.toLowerCase()}${
      el.className && typeof el.className === 'string'
        ? ` class="${el.className
            .split(' ')
            .filter((c) => !c.startsWith('data-v'))
            .slice(0, 3)
            .join(' ')}"`
        : ''
    }>${(el.textContent ?? '').trim().slice(0, 30)}`

  // ─── Recording ────────────────────────────────────────────────────────────
  let rec = null
  function begin(demoIndex) {
    focus =
      demoIndex === undefined
        ? null
        : (document.querySelectorAll('section.demo')[demoIndex] ?? null)
    const ranges = new Map()
    const touched = new Set()
    const observer = new MutationObserver((records) => {
      for (const r of records)
        if (r.target instanceof Element && inScope(r.target)) {
          rec.lastMutation = performance.now()
          touched.add(r.target)
        }
    })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: true,
      childList: true,
    })
    rec = { ranges, touched, observer, lastMutation: performance.now(), stop: false }
    const sample = () => {
      if (!rec || rec.stop) return
      const moving = new Set(touched)
      for (const a of document.getAnimations())
        if (
          a.playState === 'running' &&
          a.timeline === document.timeline &&
          a.effect?.target instanceof Element
        )
          moving.add(a.effect.target)
      for (const el of moving) {
        if (
          !el.isConnected ||
          el === document.body ||
          el === document.documentElement ||
          !inScope(el)
        )
          continue
        const v = el.getBoundingClientRect()
        if (!v.width && !v.height) continue
        // On the page, not the viewport: the page scrolling isn't the element moving.
        const r = { left: v.left + scrollX, top: v.top + scrollY, width: v.width, height: v.height }
        const key = `${rootOf(el) === document.body ? 'body' : 'demo'}|${keyOf(el, rootOf(el))}`
        const o = Number.parseFloat(getComputedStyle(el).opacity)
        const at = ranges.get(key) ?? {
          x: [r.left, r.left],
          y: [r.top, r.top],
          w: [r.width, r.width],
          h: [r.height, r.height],
          o: [o, o],
          label: describe(el),
          seen: new Set(),
        }
        // Each distinct place it showed: a jump shows two, motion shows many.
        at.seen.add(
          `${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.width)},${Math.round(r.height)},${o.toFixed(2)}`,
        )
        at.x = [Math.min(at.x[0], r.left), Math.max(at.x[1], r.left)]
        at.y = [Math.min(at.y[0], r.top), Math.max(at.y[1], r.top)]
        at.w = [Math.min(at.w[0], r.width), Math.max(at.w[1], r.width)]
        at.h = [Math.min(at.h[0], r.height), Math.max(at.h[1], r.height)]
        at.o = [Math.min(at.o[0], o), Math.max(at.o[1], o)]
        ranges.set(key, at)
      }
      touched.clear()
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
  }
  function end() {
    if (!rec) return {}
    rec.stop = true
    rec.observer.disconnect()
    const out = {}
    for (const [key, r] of rec.ranges) {
      const travel = Math.max(r.x[1] - r.x[0], r.y[1] - r.y[0], r.w[1] - r.w[0], r.h[1] - r.h[0])
      const fade = r.o[1] - r.o[0]
      if ((travel > 8 || fade > 0.3) && r.seen.size >= 3)
        out[key] = {
          travel: Math.round(travel),
          fade: +fade.toFixed(2),
          frames: r.seen.size,
          label: r.label,
        }
    }
    rec = null
    return out
  }

  // ─── Rest ─────────────────────────────────────────────────────────────────
  // Nothing finite running, no motion marker left, no style written for a while.
  function busy() {
    const running = document.getAnimations().filter(
      (a) =>
        a.playState === 'running' &&
        // Scroll-driven ones (an edge mask) follow the scroll, never time: they never end.
        a.timeline === document.timeline &&
        a.effect?.getComputedTiming().iterations !== Infinity &&
        a.effect?.target instanceof Element &&
        inScope(a.effect.target),
    )
    const marked = document.querySelectorAll('[data-ui-m]').length
    const quietFor = rec ? performance.now() - rec.lastMutation : Infinity
    return { running: running.length, marked, quiet: quietFor > 100 }
  }

  // ─── Visible at rest ──────────────────────────────────────────────────────
  // Outside the demos, or a dialog contained in one (a sheet in a box); a menu or list inline in
  // a demo is part of it, not an overlay.
  const overlays = () =>
    [...document.querySelectorAll(OVERLAY)].filter(
      (el) =>
        (!el.closest('section.demo') || el.matches('[role="dialog"], [role="alertdialog"]')) &&
        el.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    )
  function clippedAway(el, x, y) {
    for (let up = el.parentElement; up && up !== document.body; up = up.parentElement) {
      const s = getComputedStyle(up)
      if (s.overflowX === 'visible' && s.overflowY === 'visible' && s.clipPath === 'none') continue
      const r = up.getBoundingClientRect()
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return true
    }
    return false
  }
  function hidden(demoIndex) {
    const open = overlays()
    const scopes = open.length
      ? open
      : [document.querySelectorAll('section.demo')[demoIndex]].filter(Boolean)
    const out = []
    for (const scope of scopes)
      for (const el of scope.querySelectorAll('*')) {
        const interactive = el.matches(
          'button, a[href], input, select, textarea, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="option"], [role="menuitem"]',
        )
        if (!interactive && !ownText(el)) continue
        if (el.closest('[aria-hidden="true"], [inert]')) continue
        if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
        // Hit-testing sees through it (a floating label), so it can't tell.
        if (getComputedStyle(el).pointerEvents === 'none') continue
        const r = el.getBoundingClientRect()
        if (r.width < 4 || r.height < 4) continue
        const x = r.left + r.width / 2
        const y = r.top + r.height / 2
        if (x < 0 || y < 0 || x > innerWidth || y > innerHeight || clippedAway(el, x, y)) continue
        const top = document.elementFromPoint(x, y)
        if (!top || top === el || el.contains(top) || top.contains(el)) continue
        // Only what covers it from inside the same scope: the page's own chrome is the page's.
        if (!scope.contains(top) || !paints(top)) continue
        out.push(`${describe(el)} is under ${describe(top)}`)
      }
    return out
  }

  // One call per press: waits for rest inside the page, frame by frame, then checks it.
  function rest(demoIndex, cap) {
    return new Promise((resolve) => {
      const start = performance.now()
      let calm = 0
      const tick = () => {
        const s = busy()
        calm = !s.running && !s.marked && s.quiet ? calm + 1 : 0
        const waited = performance.now() - start
        if (calm >= 2 || waited > cap) {
          resolve({
            stuck: calm >= 2 ? null : s,
            hidden: hidden(demoIndex),
            overlay: overlays().length > 0,
          })
          return
        }
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
  }

  window.__stress = {
    begin,
    end,
    busy,
    hidden,
    rest,
    overlayOpen: () => overlays().length > 0,
    ENGINE_PROPS,
  }
})()
