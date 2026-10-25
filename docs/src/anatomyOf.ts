// A component's anatomy for the playgrounds: its parts (and those of the pieces you put inside it,
// such as AccordionItem's), its slots, and its specimen in docs/src/anatomy, which renders it with
// every part present.
import { defineAsyncComponent } from 'vue'
import type { Component } from 'vue'
import anatomy from './generated/anatomy.json'
import componentMeta from './generated/component-meta.json'

export interface Part {
  /** The component whose `ui` prop styles it. */
  owner: string
  /** Its `ui` keys: more than one when they share a class (a stepper's two buttons). */
  names: string[]
  /** The classes it carries, to find it on the stage. */
  classes: string[]
  /** The slots whose content lands in it. */
  slots: string[]
}

// The pieces that go inside a component, shown with it.
const PIECES: Record<string, string[]> = {
  Accordion: ['AccordionItem'],
  AvatarGroup: ['Avatar'],
  Breadcrumb: ['BreadcrumbItem', 'BreadcrumbSeparator'],
  ButtonGroup: ['Button'],
  RadioGroup: ['Radio'],
}

const table = anatomy as Record<
  string,
  { parts: Record<string, string[]>; slots: Record<string, string[]> }
>
const meta = componentMeta as unknown as Record<
  string,
  { slots?: { name: string; description?: string }[] }
>

/** Its parts and its pieces' parts, in source order. */
export function partsOf(name: string): Part[] {
  const out: Part[] = []
  for (const owner of [name, ...(PIECES[name] ?? [])]) {
    const slots = table[owner]?.slots ?? {}
    const byClasses = new Map<string, Part>()
    for (const [part, classes] of Object.entries(table[owner]?.parts ?? {})) {
      const key = classes.join(' ')
      const found = byClasses.get(key)
      if (found) found.names.push(part)
      else byClasses.set(key, { owner, names: [part], classes, slots: [] })
    }
    for (const part of byClasses.values()) {
      part.slots = Object.keys(slots).filter((slot) =>
        slots[slot]!.some((cls) => part.classes.includes(cls)),
      )
      out.push(part)
    }
  }
  return out
}

export interface Slot {
  owner: string
  name: string
  description: string
  /** Where its content lands, read from the component's template. */
  classes: string[]
}

/** Its slots and its pieces', each with where its content lands. */
export function slotsOf(name: string): Slot[] {
  return [name, ...(PIECES[name] ?? [])].flatMap((owner) =>
    (meta[owner]?.slots ?? []).map((slot) => ({
      owner,
      name: slot.name,
      description: slot.description?.split(/(?<=\.)\s/)[0] ?? '',
      classes: table[owner]?.slots[slot.name] ?? [],
    })),
  )
}

const specimens = import.meta.glob<{ default: Component }>('./anatomy/*.vue')
const loaded = new Map<string, Component>()
/** Its specimen, if it has one. */
export function specimenOf(name: string): Component | undefined {
  const load = specimens[`./anatomy/${name}.vue`]
  if (!load) return undefined
  if (!loaded.has(name)) loaded.set(name, defineAsyncComponent(load))
  return loaded.get(name)
}
