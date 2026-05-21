# Annotation Manager

Annotate text inline using the syntax
```
{={identifier}text }
```
Then view and navigate all annotations from a unified sidebar. Annotations can be styled with custom colors and font sizes, and are exposed to Dataview as structured metadata.

---

## What it does

- **Inline annotations** — wrap any text in `{={parent/child}your note=}` to tag it with an identifier
- **Live Preview rendering** — delimiters and identifier are hidden; only the annotated text is shown (optionally styled)
- **Annotations sidebar** — collects all annotations vault-wide, grouped by identifier, with one-click navigation to each source location
- **Custom styling** — assign font color, background color, and font size to any identifier or wildcard pattern
- **Dataview integration** — annotations are exposed as a `cc` field on each note's page object
- **Config file support** — define identifier styles in a Markdown table in your vault instead of the settings UI

---

## Annotation syntax

```
{={identifier}annotated text=}
{={parent/child}annotated text=}
```

- `identifier` — a plain parent identifier, e.g. `{={note}this is important=}`
- `parent/child` — a two-level identifier, e.g. `{={math/hot}key formula=}`
- Wildcards in style config: `math/*` matches any `math/child` annotation

> [!info] Do not leave a space between the identifier and the text!

**Examples**

```
The function {={note}converges in O(n log n)=} for all inputs.
This approach {={math/hot}maximizes the posterior=} under the prior.
The sample statistic {={stats}is an unbiased estimator=} of the mean.
```

> **Note**: Do not place annotations inside inline code `` `...` `` or fenced code blocks — the plugin skips those regions.

---

## Configuration options

Open **Settings → Annotation Manager** to configure the plugin.

### Config source

| Option | Description |
| --- | --- |
| **Settings UI** | Define identifier styles directly in the settings panel |
| **Config file** | Read styles from a Markdown table in your vault |

When **Config file** is selected, specify a vault-relative path (default: `OccConfig.md`) and use the **Create / update config file** button to generate the file from your current settings. The plugin auto-reloads styles whenever the file is saved.

### Config file table format

```markdown
| Identifier | Font Color | Background Color | Font Size |
| ---------- | ---------- | ---------------- | --------- |
| math/hot   | ff6b6b    | fff0f0            | 1.1em     |
| math/*     | 4ecdc4    |                   |           |
| stats      | ffd93d    | fffbe6            |           |
```

- Column order must match: Identifier, Font Color, Background Color, Font Size
- Do not use the `#` prefix for hex colors (i.e. only `ff6b6b` is accepted)
- Leave a cell blank to inherit the default value
- Font size accepts any CSS value: `1.1em`, `14px`, `0.9rem`, etc.

---

## How to customize identifiers (Settings UI mode)

1. Open **Settings → Annotation Manager**
2. Under **Add Identifier**, enter the identifier name (e.g. `math/hot` or `stats`) and click **Add**
3. Set the desired **Font color**, **Background color**, and/or **Font size**
4. Changes apply immediately to all open editors and Reading View panes

**Wildcard styles** — enter `math/*` to style all `math/child` annotations that don't have their own specific style. Specific identifiers always take precedence over wildcards.

---

## Using the annotations sidebar

Open the sidebar via:
- The **message-square ribbon icon** on the left (or right) sidebar
- The command **Show annotations sidebar**

The sidebar lists every annotation in the vault, grouped by identifier. Each entry shows a preview of the annotation text and the file + line number where it appears. Click any entry to open that file and jump to the annotation.

Use **Expand All** / **Collapse All** to show or hide all groups at once. Individual groups can be toggled by clicking their header row. Collapse state is preserved across re-renders within a session.

---

## All commands

| Command                                             | Description                                                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Show annotations sidebar**                        | Toggle the CC annotations sidebar open/closed                                                                       |
| **Apply identifier to selection**                   | Open a picker to wrap selected text (or insert a blank annotation at cursor) with a chosen identifier               |
| **Toggle bracket/identifier visibility** | Show or hide the `{={id}` and `=}` delimiters in Live Preview and Reading View                                      |
| **Toggle bracket/identifier formatting** | Enable or disable custom colors on the bracket and identifier portion (visible in Source Mode)                      |
| **Toggle text formatting**                          | Enable or disable custom colors on the annotation text content                                                      |

---

## Dataview integration

When the Dataview plugin is enabled, each note gets a `cc` field containing an array of annotation objects — one per annotation found in that note.

Each object has three properties:
- `parent` — the parent part of the identifier (e.g. `math`)
- `child` — the child part (e.g. `hot`), or an empty string if none
- `text` — the annotation content

### Example — Dataview (DQL)

Show all `math/hot` and `stats` annotations across the vault as a table:
```
dataview
TABLE rows.c.parent AS Parent, rows.c.child AS Child, rows.c.text AS "Annotation"
FROM ""
FLATTEN cc AS c
WHERE (c.parent = "math" AND c.child = "hot") OR c.parent = "stats"
GROUP BY file.link AS File
```
### Example — DataviewJS

Show all `math/hot` and `stats` annotations across the vault as a table:

```javascript
dataviewjs
const targets = [
  { parent: 'math', child: 'hot' },
  { parent: 'stats', child: '' },
];

function matches(ann, t) {
  return ann.parent === t.parent && ann.child === t.child;
}

const rows = [];
for (const page of dv.pages().where(p => p.cc)) {
  for (const ann of page.cc) {
    if (targets.some(t => matches(ann, t))) {
      const id = ann.child ? `${ann.parent}/${ann.child}` : ann.parent;
      rows.push([page.file.link, id, ann.text]);
    }
  }
}

dv.table(['Note', 'Identifier', 'Annotation'], rows);
```

---

## Notes
- This plugin has been tested with the built-in and Minimal themes only.
- Annotations are parsed from raw Markdown, so they work in both Live Preview and Source Mode
- The `{= and =}` delimiters are hidden only in Live Preview and Reading View; they are always visible in Source Mode
- When **bracket visibility** is toggled off, annotations display as raw text in Reading View and are not styled
- Avoid =} in annotation content — the lazy match will truncate the annotation at the first `=}` it finds
- Custom colors are applied via inline styles, which override CM6 syntax highlighting
