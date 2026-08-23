export interface PropSchemaObject {
  kind: string
  type: string
  schema?: (string | { kind: string; type: string } | null)[]
}

// A required prop with no `| undefined` comes back as a bare type name
// string (e.g. `"number"`) instead of the `{ kind: 'enum', schema: [...] }`
// wrapper optional props get. vue-component-meta only wraps a type when
// there's more than one member to enumerate.
export type PropSchema = string | PropSchemaObject

export interface MetaRow {
  name: string
  description: string
  type: string
  default?: string
  schema?: PropSchema
}

export interface ComponentMetaEntry {
  props: MetaRow[]
  events: MetaRow[]
  slots: MetaRow[]
  exposed: MetaRow[]
}

export interface DemoManifestExample {
  id: string
  title: string
  vaporEligible: boolean
}

export interface DemoManifestEntry {
  examples: DemoManifestExample[]
}
