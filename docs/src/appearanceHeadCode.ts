export const appearanceHeadCode = `<!-- index.html: place in <head> before the app bundle -->
<script>
  (() => {
    try {
      const root = document.documentElement
      const theme = localStorage.getItem('theme')
      if (theme === 'light' || theme === 'dark') root.dataset.theme = theme

      const fontSize = localStorage.getItem('app-font-size')
      if (fontSize && CSS.supports('font-size', fontSize)) root.style.fontSize = fontSize
    } catch {}
  })()
</script>`
