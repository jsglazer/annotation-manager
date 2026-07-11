# Annotation Manager

[![GitHub release](https://img.shields.io/github/v/release/jsglazer/annotation-manager?logo=github)](https://github.com/jsglazer/annotation-manager/releases) [![License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/jsglazer/annotation-manager/blob/main/LICENSE) [![Made with Claude](https://img.shields.io/badge/Made_with-Claude-D97756?logo=anthropic)](https://claude.ai) [![Gemini Flash Antigravity](https://img.shields.io/badge/Gemini%20Flash-Antigravity-4f86f7?logo=google-gemini&logoColor=white)](https://github.com/google-gemini) [![CI](https://github.com/jsglazer/annotation-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/jsglazer/annotation-manager/actions/workflows/ci.yml) [![CodeQL](https://github.com/jsglazer/annotation-manager/actions/workflows/codeql.yml/badge.svg)](https://github.com/jsglazer/annotation-manager/actions/workflows/codeql.yml) [![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/jsglazer/annotation-manager/badge)](https://securityscorecards.dev/viewer/?uri=github.com/jsglazer/annotation-manager)

Annotate text inline in Obsidian, view all annotations for the current note in a sidebar, style them with custom colors, attach freeform tagged comments, and query annotations with Dataview.

### View all/some/none of the annotation markup

<img src="text_source.png" width="600"/>
<img src="text_preview.png" width="600"/>
<img src="dvjs.png" width="800"/>

## Documentation (Wiki)

Full documentation is in the [GitHub Wiki](https://github.com/jsglazer/annotation-manager/wiki):

- [Home](https://github.com/jsglazer/annotation-manager/wiki) — overview and quick start
- [Annotations](https://github.com/jsglazer/annotation-manager/wiki/Annotations) — syntax, styling, sidebar, commands
- [Configuration](https://github.com/jsglazer/annotation-manager/wiki/Configuration) — all settings, config file setup, and reading-mode color pickers
- [DataviewJS Examples](https://github.com/jsglazer/annotation-manager/wiki/DataviewJS-Examples) — querying annotations

---

## What it does

- **Inline annotations** — wrap any text in `{={parent/child}your note=}` to tag it with an identifier
- **Live Preview rendering** — delimiters and identifier are hidden; only the annotated text is shown, optionally styled
- **Annotations sidebar** — lists the annotations in the note you currently have open, grouped by identifier, with one-click navigation; switches automatically as you move between notes
- **Comments** — attach freeform notes with `{@your comment@}`, independent of annotations; the **Add comment** command prompts for a tag from the same list as **Apply identifier to selection** (pick "No tag" for an untagged comment), or tag one explicitly by typing `{@{parent/child}your comment@}`. Run it with the cursor immediately after an annotation (no space) and it skips the prompt entirely, inheriting that annotation's tag — toggle this with **Auto-inherit adjacent tag** (on by default) in the Comments settings tab.
- **Comment & annotate** — a single command that wraps the current selection as an annotation and inserts an empty adjacent comment sharing the same tag, in one step; shows an alert if no text is selected
- **Comments sidebar** — lists the current note's comments grouped by tag, with an untagged "No Tag" section (expanded by default; other sections start collapsed) and a search box to filter comments by text, plus the same one-click navigation as the Annotations sidebar
- **Sidebar navigation** — clicking an entry in either sidebar selects its full source line and places the cursor at the start of that annotation/comment marker
- **Sidebar quick-toggle buttons** — an identical two-row button panel at the bottom of both sidebars: `SB` switches between the Annotations and Comments sidebars, and the rest fire the visibility/formatting commands directly (`A-F`/`B-V`/`B-F` for annotations, `C-V`/`C-F`/`B-V`/`B-F` for comments) — hover any button to see the full command name. Each toggle button reflects its current on/off state with configurable enabled/disabled colors (separate for light/dark themes, under the new **Sidebar** settings tab) and no longer pops up a Notice when clicked (Command Palette/hotkey use still shows one).
- **Custom styling** — assign font color, background color, and font size to any identifier or wildcard pattern; comments reuse the same identifier styles when tagged
- **Annotations & Comments visibility controls** — dedicated Settings tabs (and matching commands) to show/hide annotation and comment brackets, formatting, and — for comments — the entire comment; the Comments tab also lets you set a fixed fore/background color, independent of tag color and separate for light/dark themes, for both the `{@`/`@}` delimiter itself and the comment text content — so formatting toggles have a visible effect even on untagged comments
- **Dataview integration** — annotations are exposed as a `cc` field on each note's page object
- **Config file support** — define identifier styles in a Markdown table in your vault; open the file in Reading Mode to get inline color pickers for instant color selection

---

## Quick start

```
The function {={note}converges in O(n log n)=} for all inputs.
This approach {={math/hot}maximizes the posterior=} under the prior.{@double-check this against the 2023 paper@}
```

1. Write an annotation using `{={identifier}text=}` syntax
2. Add a comment with the **Add comment** command (pick a tag, or "No tag", from the prompt), or type `{@your comment@}` directly
3. Open the sidebars via the ribbon icon or the **Show annotations sidebar** / **Show comments sidebar** commands
4. Add styling under **Settings → Annotation Manager → Add Identifier**, and adjust what's shown under the **Annotations** and **Comments** settings tabs

---

## Notes

- Tested with the built-in and Minimal themes only
- Annotations and comments work in both Live Preview and Source Mode
- Avoid `=}` inside annotation text, or `@}` inside comment text — the parser truncates at the first one it finds
- Do not place annotations or comments inside inline code or fenced code blocks

---

_Written by Claude!_
