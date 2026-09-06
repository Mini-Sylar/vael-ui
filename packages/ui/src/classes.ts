import { inject, normalizeClass } from 'vue'
import type { InjectionKey, StyleValue } from 'vue'

/**
 * Optional class post-processor, e.g. `twMerge` from `tailwind-merge`.
 *
 * tailwind-merge is never imported here — auto-detecting an optional
 * dependency at runtime breaks neutral-platform bundling and SSR, so the
 * merger is injected by the consumer via `ConfigProvider` instead.
 */
export type ClassMerger = (classes: string) => string

export const classMergerKey: InjectionKey<ClassMerger> = Symbol('ui-class-merger')

export type ClassValue = string | false | null | undefined

/** Same shape a plain Vue `:class` binding accepts — string, array, object, or any nesting of those. */
export type UiPartClass = string | Record<string, unknown> | ClassValue[] | UiPartClass[]

/** Same shape a plain Vue `:style` binding accepts (`StyleValue`) — string, object, or an array of those. */
export type UiPartStyle = StyleValue

/**
 * The shape every `ui.*` part override accepts: a plain class string (as
 * before), or an object carrying a class AND a real inline style — for
 * overrides that can't be expressed as a class alone (a live-changing
 * `transform`, a one-off custom property, ...). Both `class` and `style`
 * accept anything a plain Vue `:class`/`:style` binding would (arrays,
 * objects, nested combinations), normalized the same way Vue's own compiler
 * normalizes a template binding.
 */
export type UiPartValue = string | { class?: UiPartClass; style?: UiPartStyle }

/**
 * Join internal part classes with consumer `ui.*` overrides, routed through
 * the injected merger when one is provided.
 */
export function useClassMerge(): (...classes: ClassValue[]) => string {
  const merger = inject(classMergerKey, undefined)
  return (...classes: ClassValue[]) => {
    const joined = classes.filter(Boolean).join(' ')
    return merger ? merger(joined) : joined
  }
}

/**
 * Splits one `ui.*` part into its raw class + style, with no joining — the
 * building block `resolveUiPart()` is built from. Reach for this directly
 * (instead of `resolveUiPart`) only when a part's class needs to interleave
 * with something else at a specific position — e.g. Input's root, where the
 * plain `class` attr forwarded from the consumer must win over `ui.root`,
 * not the other way around.
 */
export function splitUiPart(value: UiPartValue | undefined): {
  class: ClassValue
  style: UiPartStyle | undefined
} {
  // normalizeClass handles anything a plain `:class` binding would (array, object, nesting) the
  // same way Vue's own compiler does — cx()'s own merge only ever sees a plain string from here.
  if (value != null && typeof value === 'object') {
    return {
      class: value.class !== undefined ? normalizeClass(value.class) : undefined,
      style: value.style,
    }
  }
  return { class: value, style: undefined }
}

/**
 * Resolves one `ui.*` part into its final class + style. `override` is taken
 * as the SECOND argument (not last) so call sites read `resolveUiPart(cx,
 * themedUi()?.part, ...internalClasses)` — but internally its class still
 * joins LAST, after every internal class, so a string override keeps
 * exactly the precedence it always had through `cx()` (last write wins when
 * a `ClassMerger` like tailwind-merge is configured).
 */
export function resolveUiPart(
  cx: (...classes: ClassValue[]) => string,
  override: UiPartValue | undefined,
  ...classes: ClassValue[]
): { class: string; style: UiPartStyle | undefined } {
  const { class: overrideClass, style } = splitUiPart(override)
  return { class: cx(...classes, overrideClass), style }
}
