# Obsidian Comment Collector — Project Onboarding

## What this is

An Obsidian plugin that lets you annotate text inline with a custom `{={identifier}text=}` syntax, then view all annotations vault-wide from a sidebar, apply custom colors per identifier, and query annotations via Dataview.

## Annotation syntax

```
{={parent/child}annotated text=}
{={parent}annotated text=}
```

Examples:
```
The function {={note}converges in O(n log n)=} for all inputs.
This result {={math/hot}maximizes the posterior=} under our prior.
The estimator {={stats}is unbiased=} for the population mean.
```

**Do not** use `=}` inside annotation content — it closes the annotation.  
**Do not** annotate inside inline code or fenced code blocks — those are skipped.

## Source layout

| File | Purpose |
| --- | --- |
| `src/main.ts` | Plugin entry point — commands, toggles, settings, config file, sidebar, Dataview injection |
| `src/parser.ts` | Raw-markdown annotation parser (used for sidebar + Dataview) |
| `src/decoration.ts` | CM6 ViewPlugin — Live Preview and Source Mode decoration |
| `src/settings.ts` | Settings interface, defaults, config-file parse/render, settings tab UI |
| `src/sidebar.ts` | Right-panel annotations sidebar view |
| `styles.css` | Static CSS — cc-hide, cc-annotation, sidebar layout, suggest modal |

## Key design facts

- **Three display toggles** (all ON by default):
  - `syntaxHidingEnabled` — hides `{={id}` and `=}` in Live Preview / Reading View
  - `identifierFormattingEnabled` — colors the bracket+identifier portion in Source Mode
  - `textFormattingEnabled` — colors the annotation text content
- **CSS priority**: a dynamic `<style>` element is appended to `document.head` AFTER Obsidian's CSS loads, so our `!important` rules win equal-specificity conflicts by source order. Neutral baseline prevents CM6's purple link-color from bleeding through.
- **Code exclusion**: parser and decorator both detect fenced/inline code regions via regex and skip matches inside them.
- **Config file**: Markdown table in vault, hex colors WITHOUT `#` prefix. Auto-reloads on file save.

## Build

```bash
npm run build   # type-check + esbuild production bundle → main.js
npm run dev     # esbuild in watch mode (no type-check)
```

`@codemirror/*` packages are externalized (Obsidian bundles them). Do not bundle them.

## Commands

| Command | ID |
| --- | --- |
| Show annotations sidebar | `show-annotations-sidebar` |
| Apply identifier to selection | `apply-identifier` |
| Toggle bracket/identifier visibility | `toggle-syntax-hiding` |
| Toggle bracket/identifier formatting  | `toggle-identifier-formatting` |
| Toggle text formatting | `toggle-text-formatting` |

## Dataview

Each annotated note gets a `cc` field — array of `{ parent, child, text }`.

```dataviewjs
// All math/hot and stats annotations
const rows = [];
for (const page of dv.pages().where(p => p.cc)) {
  for (const ann of page.cc) {
    if ((ann.parent==='math' && ann.child==='hot') || (ann.parent==='stats' && !ann.child))
      rows.push([page.file.link, `${ann.parent}${ann.child?'/'+ann.child:''}`, ann.text]);
  }
}
dv.table(['Note','ID','Annotation'], rows);
```
