---
status: Done
---

- Can you add a styled example to the existing markdown table in AMConfig.md?  I want there to be an example of the colors/font size that automatically displays and updates.


# Claude output

## Changes made

### src/settings.ts
- Added `injectExamples(content, styles)` — scans an existing config file line by line, finds data rows in the Markdown table, and updates only the Example column cells (col 5) in-place based on current styles; all non-table content and the first four columns are left untouched

### src/main.ts
- Added `_writingConfigFile` boolean flag to prevent a reload loop
- Added `injectExamples` to imports
- Updated `reloadConfigFile()`: after parsing styles, calls `injectExamples()` and writes the result back to the vault file only if something changed; sets `_writingConfigFile = true` during the write
- Updated the vault `modify` event handler to skip config reload when `_writingConfigFile` is true

### AMConfig.md
- Updated all four data rows with correctly styled Example cells:
  - `math/cold` → `<span style="color: #2e8ca3; background-color: #fce3e8">Example</span>`
  - `math/hot` → `<span style="color: #c24040; font-size: 12px">Example</span>`
  - `stats` → `<span style="color: #f5b761">Example</span>`
  - `stats/ttest` → `<span style="color: #e31212; background-color: #fbfce3">Example</span>`

## How auto-update works
1. User edits AMConfig.md (changes a color, adds/removes a row), saves the file
2. Plugin detects the save, calls `reloadConfigFile()`
3. `reloadConfigFile()` parses columns 1–4 for styles, then calls `injectExamples()` to regenerate Example cells
4. If the Example cells changed, plugin writes the file back silently (`_writingConfigFile` flag prevents a second reload)
5. Obsidian refreshes the file view — the updated Example column is immediately visible

## Git commit
```
b9f5156 Auto-inject Example column into config file on every reload
```
