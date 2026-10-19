import type {
  SelectGroupData,
  SelectGroupSlotData,
  SelectItemData,
  SelectListSection,
} from '../components/internal/SelectListBody.vue'

/** An entry with an `items` array and no `value` is a group; anything else is an option. */
export function isGroup<T extends SelectItemData>(
  entry: T | SelectGroupData<T>,
): entry is SelectGroupData<T> {
  return Array.isArray((entry as SelectGroupData<T>).items) && !('value' in entry)
}

/** Every option, groups flattened, for selection and lookups. */
export function flattenOptions<T extends SelectItemData>(
  entries: ReadonlyArray<T | SelectGroupData<T>>,
): T[] {
  return entries.flatMap((entry) => (isGroup(entry) ? [...entry.items] : [entry]))
}

/** The options that match, in order, plus each group's run of them; a group with no match drops out. */
export function groupSections<T extends SelectItemData>(
  entries: ReadonlyArray<T | SelectGroupData<T>>,
  matches: (item: T) => boolean,
): { items: T[]; sections: SelectListSection<T>[] } {
  const items: T[] = []
  const sections: SelectListSection<T>[] = []
  for (const entry of entries) {
    const start = items.length
    if (isGroup(entry)) {
      items.push(...entry.items.filter(matches))
      if (items.length > start) {
        const group = entry as SelectGroupSlotData<T>
        sections.push({ label: entry.label, group, start, end: items.length })
      }
    } else if (matches(entry)) {
      items.push(entry)
      const last = sections.at(-1)
      if (last && last.label === undefined && last.end === start) last.end = items.length
      else sections.push({ start, end: items.length })
    }
  }
  return { items, sections }
}
