// WCAG contrast between two computed CSS colors, in the browser: a 1px canvas
// normalises any color syntax (oklch, color-mix, relative colors) to sRGB.
function toRgba(color: string): [number, number, number, number] {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  return [r!, g!, b!, a! / 255]
}

function luminance([r, g, b]: number[]): number {
  const [lr, lg, lb] = [r!, g!, b!].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * lr! + 0.7152 * lg! + 0.0722 * lb!
}

/** `fg` over `bg`, both flattened onto `base` (for translucent colors) and scaled by `opacity`. */
export function contrast(fg: string, bg: string, base = '#ffffff', opacity = 1): number {
  const baseRgb = toRgba(base)
  const flatten = (c: string) => {
    const [r, g, b, a] = toRgba(c)
    const alpha = a * opacity
    return [r, g, b].map((v, i) => v * alpha + baseRgb[i]! * (1 - alpha))
  }
  const bgRgb = flatten(bg)
  const [fr, fgG, fb, fa] = toRgba(fg)
  const fgRgb = [fr, fgG, fb].map((v, i) => v * fa * opacity + bgRgb[i]! * (1 - fa * opacity))
  const [hi, lo] = [luminance(fgRgb), luminance(bgRgb)].sort((x, y) => y - x)
  return (hi! + 0.05) / (lo! + 0.05)
}
