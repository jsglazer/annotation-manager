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
- [Comments](https://github.com/jsglazer/annotation-manager/wiki/Comments) — syntax, tag inheritance, sidebar, commands
- [Configuration](https://github.com/jsglazer/annotation-manager/wiki/Configuration) — all settings, including the per-theme color grids
- [DataviewJS Examples](https://github.com/jsglazer/annotation-manager/wiki/DataviewJS-Examples) — querying annotations

A link to the wiki is also on the plugin's **Settings → Annotation Manager → General** tab.

---

## What it does

- **Inline annotations** — wrap any text in `{={parent/child}your note=}` to tag it with an identifier
- **Live Preview rendering** — delimiters and identifier are hidden; only the annotated text is shown, optionally styled
- **Annotations sidebar** — titled "Annotations" at the top; lists the annotations in the note you currently have open, grouped by identifier, with one-click navigation; switches automatically as you move between notes
- **Comments** — attach freeform notes with `{@your comment@}`, independent of annotations; the **Add comment** command prompts for a tag from the same list as **Apply identifier to selection** (pick "No tag" for an untagged comment), or tag one explicitly by typing `{@{parent/child}your comment@}`. Run it with the cursor immediately after an annotation (no space) and it skips the prompt entirely, inheriting that annotation's tag — toggle this with **Auto-inherit adjacent tag** (on by default) in the Comments settings tab.
- **Comment & annotate** — a single command that wraps the current selection as an annotation and inserts an empty adjacent comment sharing the same tag, in one step, relying on zero-space tag inheritance rather than repeating the identifier; shows an alert if no text is selected
- **Comments sidebar** — titled "Comments" at the top; lists the current note's comments grouped by tag, with an untagged "No Tag" section (expanded by default; other sections start collapsed) and a search box to filter comments by text, plus the same one-click navigation as the Annotations sidebar
- **Sidebar navigation** — entries show the first five words of each annotation/comment; clicking one jumps to it and places the cursor at the start of the marker (no selection)
- **Sidebar quick-toggle buttons** — an identical two-row button panel at the bottom of both sidebars: `SB` switches between the Annotations and Comments sidebars, and the rest fire the visibility/formatting commands directly (`A-F`/`B-V`/`B-F` for annotations, `C-V`/`C-F`/`B-V`/`B-F` for comments) — hover any button to see the full command name. Each toggle button reflects its current on/off state with configurable On/Off colors (separate for light/dark themes, under **Sidebar Format Options** at the bottom of the **General** settings tab) and no longer pops up a Notice when clicked (Command Palette/hotkey use still shows one). Clicking `SB` briefly flashes it with its own configurable color (light/dark) before switching sidebars. When the current note has no annotations and no comments, every button in the panel — including `SB` — turns grey (fixed dark-grey background, light-grey text) to signal there's nothing to toggle.
- **Custom styling** — the **Annotations & Associated Comments** grid on the Annotations settings tab defines colors per identifier or wildcard pattern: separate bracket and text colors (foreground and background, each with its own enable checkbox) for light and dark themes, plus a per-row font size, a live example, a **Use** checkbox to disable a row without deleting it, and a **Del** button that asks for confirmation before deleting the row. Each identifier's name is an editable field — rename it in place and the row's colors follow (blank, duplicate, or unsafe names are rejected). Tagged comments reuse the same identifier styles. Styles saved by older versions are migrated automatically.
- **Hex color entry** — every color cell in the settings grids (identifiers, unassociated comments, and the sidebar buttons) pairs the swatch with an editable `#rrggbb` hex field, so you can type or paste an exact color instead of relying on the OS color picker's mode; the swatch and hex field stay in sync and setting either one auto-enables that color
- **Annotations & Comments visibility controls** — dedicated Settings tabs (and matching commands) to show/hide annotation and comment brackets, formatting, and — for comments — the entire comment; the **Comments (unassociated)** grid on the Comments tab sets bracket and text colors, independent of tag color and separate for light/dark themes, for comments with no associated tag — so formatting toggles have a visible effect even on untagged comments
- **Dataview integration** — annotations are exposed as a `cc` field on each note's page object

---

## Quick start

```
The function {={note}converges in O(n log n)=} for all inputs.
This approach {={math/hot}maximizes the posterior=} under the prior.{@double-check this against the 2023 paper@}
```

1. Write an annotation using `{={identifier}text=}` syntax
2. Add a comment with the **Add comment** command (pick a tag, or "No tag", from the prompt), or type `{@your comment@}` directly
3. Open the sidebars via the ribbon icon or the **Show annotations sidebar** / **Show comments sidebar** commands
4. Add styling under **Settings → Annotation Manager → Annotations → Annotations & Associated Comments** (the **Add identifier** control sits below the grid), and adjust what's shown under the **Annotations** and **Comments** settings tabs

---

## Notes

- Tested with the built-in and Minimal themes only
- Annotations and comments work in both Live Preview and Source Mode
- Avoid `=}` inside annotation text, or `@}` inside comment text — the parser truncates at the first one it finds
- Do not place annotations or comments inside inline code or fenced code blocks

---

_Written by Claude!_
