# Inspector Editor Conventions

Rules every block inspector in this directory must follow.

## Field primitives

Use **only** the components from `src/components/builder/fields/`. Do not create new field components inside this directory. Available primitives:

- `TextField` — single-line text
- `TextAreaField` — multi-line text
- `NumberField` — numeric input
- `SelectField` — dropdown select
- `SwitchField` — boolean toggle
- `EnumChips` — fixed-option chip group
- `MarkdownField` — markdown-aware text area
- `RepeaterField` — ordered list of sub-objects
- `KeyValueRows` — free-form key/value pairs

## Section headers (≥ 8 fields)

When a single inspector has more than 8 fields, group them with section headers
inside `<EditorShell>`:

```tsx
<h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-4 mb-2">
  Section Name
</h4>
```

## Numeric CSV parsing

For fields that accept comma-separated numbers (chart series, KPI sparklines,
etc.), use the shared helpers from `./parsing`:

```ts
import { parseNumberCsv, formatNumberCsv } from "./parsing";
```

Do **not** inline ad-hoc split/map/filter chains in individual editors.

## Schema placement

Define the Zod schema and `DEFAULTS` constant in `schemas.ts`. Derive the
`Values` type with `z.infer`:

```ts
export const MyBlockSchema = z.object({ ... });
export type MyBlockValues = z.infer<typeof MyBlockSchema>;
export const MY_BLOCK_DEFAULTS: MyBlockValues = { ... };
```

Import them in the `*-editor.tsx` file; do not inline schemas inside
component files.
